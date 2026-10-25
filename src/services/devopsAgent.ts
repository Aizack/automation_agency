import { GoogleGenAI } from '@google/genai';
import { pool } from '../database/postgres';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Ejecuta un comando en la shell del servidor con timeout de seguridad.
 */
function runShell(command: string, timeoutMs: number = 30000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    // Directorio base del proyecto en VPS o local
    const projectDir = fs.existsSync('/app/agency-bot') ? '/app/agency-bot' : process.cwd();
    exec(command, { cwd: projectDir, timeout: timeoutMs }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout ? stdout.toString() : '',
        stderr: stderr ? stderr.toString() : (error ? error.message : ''),
        exitCode: error && error.code ? error.code : 0
      });
    });
  });
}

/**
 * Resuelve la ruta absoluta de un archivo dentro del proyecto.
 */
function resolveProjectPath(filePath: string): string {
  const baseDir = fs.existsSync('/app/agency-bot') ? '/app/agency-bot' : process.cwd();
  return path.isAbsolute(filePath) ? filePath : path.join(baseDir, filePath);
}

/**
 * Definición de Herramientas (Tools) de Ingeniería para Gemini
 */
const devopsFunctionDeclarations = [
  {
    name: "read_pm2_logs",
    description: "Lee los últimos logs de error y salida de PM2 de agency-bot para diagnosticar fallas en tiempo real.",
    parameters: {
      type: "OBJECT",
      properties: {
        lines: { type: "INTEGER", description: "Número de líneas a leer (por defecto 30)" },
        type: { type: "STRING", enum: ["error", "out", "all"], description: "Tipo de log a consultar" }
      }
    }
  },
  {
    name: "execute_sql_query",
    description: "Ejecuta una consulta SQL segura en la base de datos PostgreSQL de la plataforma y retorna los resultados.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "Instrucción SQL a ejecutar (SELECT, UPDATE, INSERT, etc.)" }
      },
      required: ["query"]
    }
  },
  {
    name: "read_code_file",
    description: "Lee el contenido de un archivo de código fuente del proyecto con opción de rango de líneas.",
    parameters: {
      type: "OBJECT",
      properties: {
        filePath: { type: "STRING", description: "Ruta relativa del archivo, ej: src/server.ts, src/services/emailService.ts" },
        startLine: { type: "INTEGER", description: "Línea inicial (opcional)" },
        endLine: { type: "INTEGER", description: "Línea final (opcional)" }
      },
      required: ["filePath"]
    }
  },
  {
    name: "edit_code_file",
    description: "Modifica un archivo de código fuente reemplazando un fragmento exacto por uno nuevo.",
    parameters: {
      type: "OBJECT",
      properties: {
        filePath: { type: "STRING", description: "Ruta del archivo a editar" },
        targetText: { type: "STRING", description: "Texto exacto existente que se va a reemplazar" },
        replacementText: { type: "STRING", description: "Nuevo texto que reemplazará al target" }
      },
      required: ["filePath", "targetText", "replacementText"]
    }
  },
  {
    name: "run_bash_command",
    description: "Ejecuta un comando seguro en el servidor (git status, pm2 status, git diff, npm test, etc.).",
    parameters: {
      type: "OBJECT",
      properties: {
        command: { type: "STRING", description: "Comando de consola a ejecutar en el directorio del proyecto" }
      },
      required: ["command"]
    }
  },
  {
    name: "deploy_and_reload",
    description: "Recompila el código TypeScript del backend y frontend y recarga el proceso en PM2 sin caída de servicio.",
    parameters: {
      type: "OBJECT",
      properties: {
        buildFrontend: { type: "BOOLEAN", description: "Indica si también debe compilar el frontend (dashboard)" }
      }
    }
  },
  {
    name: "git_commit_and_push",
    description: "Crea un commit con los cambios realizados y los envía a la rama Cambios-Jules en GitHub.",
    parameters: {
      type: "OBJECT",
      properties: {
        commitMessage: { type: "STRING", description: "Mensaje descriptivo del commit de la corrección realizada" }
      },
      required: ["commitMessage"]
    }
  }
];

/**
 * Ejecuta una llamada a herramienta de DevOps en el servidor.
 */
async function executeDevopsTool(name: string, args: any): Promise<string> {
  console.log(`[DevOps Agent] 🛠️ Ejecutando herramienta: '${name}' con args:`, JSON.stringify(args));
  try {
    switch (name) {
      case "read_pm2_logs": {
        const count = args?.lines || 35;
        const res = await runShell(`pm2 logs agency-bot --lines ${count} --nostream`);
        return res.stdout || res.stderr || "No se encontraron logs recientes de PM2.";
      }

      case "execute_sql_query": {
        const query = args.query;
        if (!query || typeof query !== 'string') return "Error: query vacía.";
        const dbRes = await pool.query(query);
        const rowCount = dbRes.rowCount || 0;
        const previewRows = dbRes.rows ? dbRes.rows.slice(0, 15) : [];
        return JSON.stringify({
          success: true,
          rowCount,
          rows: previewRows,
          note: rowCount > 15 ? `Mostrando primeras 15 filas de ${rowCount}` : undefined
        });
      }

      case "read_code_file": {
        const fullPath = resolveProjectPath(args.filePath);
        if (!fs.existsSync(fullPath)) {
          return `Error: El archivo '${args.filePath}' no existe en el proyecto.`;
        }
        const fileContent = fs.readFileSync(fullPath, 'utf-8');
        const lines = fileContent.split('\n');
        const start = Math.max(1, args.startLine || 1);
        const end = Math.min(lines.length, args.endLine || lines.length);
        const selectedLines = lines.slice(start - 1, end).map((l, idx) => `${start + idx}: ${l}`).join('\n');
        return `Archivo: ${args.filePath} (Líneas ${start}-${end} de ${lines.length}):\n\n${selectedLines}`;
      }

      case "edit_code_file": {
        const fullPath = resolveProjectPath(args.filePath);
        if (!fs.existsSync(fullPath)) {
          return `Error: El archivo '${args.filePath}' no existe.`;
        }
        const fileContent = fs.readFileSync(fullPath, 'utf-8');
        if (!fileContent.includes(args.targetText)) {
          return `Error: El targetText no fue encontrado en '${args.filePath}'. Verifica los espacios y caracteres exactos.`;
        }
        const updated = fileContent.replace(args.targetText, args.replacementText);
        fs.writeFileSync(fullPath, updated, 'utf-8');
        return `✅ Archivo '${args.filePath}' modificado exitosamente.`;
      }

      case "run_bash_command": {
        const cmd = args.command;
        // Prevenir comandos destructivos accidentales
        if (cmd.includes('rm -rf /') || cmd.includes('mkfs') || cmd.includes('shutdown')) {
          return "Comando bloqueado por seguridad del sistema.";
        }
        const res = await runShell(cmd);
        return `ExitCode: ${res.exitCode}\nSTDOUT:\n${res.stdout}\nSTDERR:\n${res.stderr}`;
      }

      case "deploy_and_reload": {
        const buildCmd = args.buildFrontend 
          ? 'npm --prefix dashboard run build && pm2 reload agency-bot'
          : 'pm2 reload agency-bot';
        const res = await runShell(buildCmd, 60000);
        return `Despliegue y reload ejecutado.\n${res.stdout || res.stderr}`;
      }

      case "git_commit_and_push": {
        const msg = (args.commitMessage || 'fix: remote fix from whatsapp devops agent').replace(/"/g, '\\"');
        const res = await runShell(`git add . && git commit -m "${msg}" && git push origin Cambios-Jules`, 40000);
        return `Git sync:\n${res.stdout || res.stderr}`;
      }

      default:
        return `Herramienta desconocida: ${name}`;
    }
  } catch (err: any) {
    console.error(`[DevOps Agent] Error ejecutando ${name}:`, err);
    return `Excepción ejecutando herramienta ${name}: ${err.message}`;
  }
}

/**
 * Procesa una instrucción enviada por el Super Admin (celular 3046247664) desde WhatsApp.
 */
export async function processDevOpsInstruction(instruction: string, senderPhone: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'API_KEY_MISSING') {
    return "⚠️ Error de configuración: GEMINI_API_KEY no está configurada en el servidor.";
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const systemPrompt = `
Eres Antigravity DevOps, el Asistente Ingeniero de Software y Administrador de Sistemas Autónomo de Diaz Lab y Frant ERP.
Estás comunicándote directamente por WhatsApp con el Creador y Super Administrador de la plataforma (teléfono: ${senderPhone}).

Tu misión principal es recibir instrucciones técnicas y reportes de fallas, diagnosticar qué está pasando utilizando tus herramientas del servidor, reparar el problema si es necesario y reportar el resultado de forma clara, profesional y directa.

HERRAMIENTAS A TU DISPOSICIÓN:
- read_pm2_logs: Para ver la traza exacta de errores recientes.
- execute_sql_query: Para inspeccionar tablas, pedidos, clientes, facturas o verificar datos.
- read_code_file: Para examinar el código donde ocurre el error.
- edit_code_file: Para corregir código fuente en producción.
- run_bash_command: Para ver estado de servicios (pm2 status, git status, git diff, etc.).
- deploy_and_reload: Para aplicar los cambios de código y recargar el servidor sin tirar el sistema.
- git_commit_and_push: Para versionar y sincronizar los cambios en la rama Cambios-Jules.

REGLAS DE ACTUACIÓN:
1. En la base de datos PostgreSQL de Frant ERP:
   - Las tiendas/ópticas/sedes están en la tabla 'clients' (id, name, email, phone, status).
   - Los clientes finales están en 'crm_customers' (name, phone, email, document_number).
   - Las facturas de venta están en 'invoices' (invoice_number, customer_name, total_amount, status).
   - Los logs de envío de correos están en 'invoice_email_logs'.
2. Si te reportan una falla: primero inspecciona (logs o base de datos), localiza la causa raíz, aplica la solución y prueba/recarga el servicio.
3. Si te hacen una pregunta técnica o de estado: consulta la información real con tus herramientas y da un informe exacto.
4. Formatea tu respuesta para WhatsApp:
   - Usa negritas (*texto*), viñetas y emojis funcionales (🛠️, ✅, ⚠️, 🔍).
   - Sé conciso y directo: explica qué pasaba y cómo quedó solucionado.
   - Si modificaste código, menciona el archivo tocado y si hiciste commit.
5. Habla en español de Colombia de manera respetuosa, técnica, segura y proactiva.
`;

  const contents: any[] = [
    { role: 'user', parts: [{ text: instruction }] }
  ];

  let finalResponse = "";

  try {
    const maxTurns = 8;
    for (let turn = 0; turn < maxTurns; turn++) {
      const isLastTurn = turn === maxTurns - 1;
      const configObj: any = {
        systemInstruction: systemPrompt,
      };

      // En el último turno no pasamos herramientas para forzar a Gemini a generar la respuesta final en texto
      if (!isLastTurn) {
        configObj.tools = [{ functionDeclarations: devopsFunctionDeclarations }];
      }

      const result: any = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: configObj
      });

      const candidate = result.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      const functionCalls = parts.filter((p: any) => p.functionCall).map((p: any) => p.functionCall);

      if (!functionCalls || functionCalls.length === 0 || isLastTurn) {
        finalResponse = result.text || parts.map((p: any) => p.text).join('') || "";
        if (finalResponse.trim()) break;
      }

      // Agregar turno del modelo con sus llamados a función
      contents.push({ role: 'model', parts: parts });

      // Ejecutar cada función solicitada por Gemini
      const functionResponseParts: any[] = [];
      for (const call of functionCalls) {
        const toolOutput = await executeDevopsTool(call.name, call.args);
        functionResponseParts.push({
          functionResponse: {
            name: call.name,
            response: { output: toolOutput }
          }
        });
      }

      // Agregar las respuestas de las funciones para el siguiente turno de Gemini
      contents.push({ role: 'user', parts: functionResponseParts });
    }

    return finalResponse || "✅ He procesado tu solicitud en el servidor.";
  } catch (err: any) {
    console.error("[DevOps Agent] Error crítico en processDevOpsInstruction:", err);
    return `⚠️ *Error procesando instrucción DevOps*: ${err.message}\n\nPuedes intentar reformular o verificar que el comando sea seguro.`;
  }
}
