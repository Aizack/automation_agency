import { ClientConfig } from '../core/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

import { VectorDatabase } from '../database/vectorDb';
import { agendarCitaTool } from '../tools/agendarCita';
import { crearPedidoTool } from '../tools/crearPedido';
import { registrarClienteTool } from '../tools/registrarCliente';
import { enviarAudioTool } from '../tools/enviarAudio';

// Inicializamos el SDK de Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "API_KEY_MISSING");

export class AIAgent {
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
  }

  async processMessage(
    userMessage: string, 
    senderPhone: string,
    sendVoiceFn?: (to: string, filePath: string) => Promise<any>
  ): Promise<string> {
    console.log(`[Agente AI] 🤖 Procesando Gemini para cliente: ${this.config.name} (ID: ${this.config.id})`);

    // 1. Retrieval-Augmented Generation (RAG)
    const contextFromDrive = await VectorDatabase.searchRelevantContext(this.config.id, userMessage);
    console.log(`[Agente AI] Contexto RAG recuperado: ${contextFromDrive.length > 0 ? 'Sí' : 'Vacío'}`);

    // Escanear audios locales cargados para este cliente
    const clientMediaDir = path.join(process.cwd(), 'media', 'clients', this.config.id);
    const availableAudios: string[] = [];
    if (fs.existsSync(clientMediaDir)) {
      const files = fs.readdirSync(clientMediaDir);
      for (const file of files) {
        const ext = path.extname(file);
        availableAudios.push(path.basename(file, ext));
      }
    }
    console.log(`[Agente AI] Audios locales disponibles para el cliente: ${availableAudios.join(', ') || 'Ninguno'}`);

    // 2. Preparar el Prompt del Sistema
    const fullSystemPrompt = `
      ${this.config.systemPrompt}

      INFORMACIÓN DE LA EMPRESA (RAG):
      Utiliza esta información para responder a las dudas del usuario si es relevante:
      ${contextFromDrive}

      INSTRUCCIONES IMPORTANTES:
      - Responde siempre de forma corta, directa y conversacional, ideal para WhatsApp. Escribe como si fueras un humano amable.
      - Si el usuario te proporciona datos para registrar su negocio, agendar una cita o hacer un pedido, llama a la herramienta correspondiente de inmediato.
      ${availableAudios.length > 0 ? `- Tienes la capacidad de reproducir notas de voz del dueño del negocio. Si el usuario te saluda, o te pide un audio explicativo o de bienvenida, o consideras oportuno enviar un audio de los disponibles, utiliza la herramienta 'reproducir_audio' con la etiqueta correspondiente.` : ''}
    `;

    // 3. Declaración de Herramientas (Function Declarations para Gemini)
    const declarations: any[] = [];

    // Herramienta de agendar cita
    if (this.config.activeTools.includes("agendarCita")) {
      declarations.push({
        name: "agendar_cita",
        description: "Utiliza esta herramienta cuando el usuario pida agendar o reservar una cita en una fecha y hora específicas.",
        parameters: {
          type: "OBJECT",
          properties: {
            fecha: { 
              type: "STRING", 
              description: "La fecha de la cita en formato YYYY-MM-DD (ej. 2026-07-15)" 
            },
            hora: { 
              type: "STRING", 
              description: "La hora de la cita en formato HH:MM (ej. 14:30)" 
            },
            nombre: { 
              type: "STRING", 
              description: "El nombre completo del cliente que está agendando la cita" 
            }
          },
          required: ["fecha", "hora", "nombre"]
        }
      });
    }

    // Herramienta de crear pedido
    if (this.config.activeTools.includes("crearPedido")) {
      declarations.push({
        name: "crear_pedido",
        description: "Utiliza esta herramienta cuando el usuario quiera confirmar un pedido de comida o compra de producto.",
        parameters: {
          type: "OBJECT",
          properties: {
            producto: { 
              type: "STRING", 
              description: "El nombre del producto solicitado" 
            },
            cantidad: { 
              type: "NUMBER", 
              description: "La cantidad solicitada" 
            }
          },
          required: ["producto", "cantidad"]
        }
      });
    }

    // Inyección de la herramienta reproducir_audio si el cliente tiene audios disponibles
    if (availableAudios.length > 0) {
      declarations.push({
        name: "reproducir_audio",
        description: "Envía una nota de voz pregrabada del dueño del negocio al usuario. Utilízalo para responder de forma más personal y humana.",
        parameters: {
          type: "OBJECT",
          properties: {
            etiqueta: { 
              type: "STRING", 
              description: "La etiqueta del audio a reproducir.",
              enum: availableAudios // Solo permite llamar audios existentes en disco
            }
          },
          required: ["etiqueta"]
        }
      });
    }

    // Inyección especial de onboarding automático para el admin de la agencia
    if (this.config.id === "admin") {
      declarations.push({
        name: "registrar_cliente",
        description: "Registra un nuevo negocio o cliente en el sistema multi-tenant, creando su base de conocimientos en Drive y sus credenciales de acceso.",
        parameters: {
          type: "OBJECT",
          properties: {
            nombreEmpresa: { 
              type: "STRING", 
              description: "El nombre oficial del negocio o empresa (ej. Dental Studio, Pizzería Bella)" 
            },
            telefonoCliente: { 
              type: "STRING", 
              description: "El número de WhatsApp completo del cliente/dueño del negocio, con código de país (ej. 573001112222)" 
            },
            nombreContacto: { 
              type: "STRING", 
              description: "El nombre de la persona representante del negocio" 
            },
            emailContacto: { 
              type: "STRING", 
              description: "El correo electrónico del contacto principal" 
            }
          },
          required: ["nombreEmpresa", "telefonoCliente", "nombreContacto"]
        }
      });
    }

    try {
      if (process.env.GEMINI_API_KEY) {
        // Inicializar Modelo Gemini con herramientas si están configuradas
        const modelConfig: any = {
          model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
          systemInstruction: fullSystemPrompt
        };

        if (declarations.length > 0) {
          modelConfig.tools = [{ functionDeclarations: declarations }];
        }

        const model = genAI.getGenerativeModel(modelConfig);

        let contents: any[] = [{ role: 'user', parts: [{ text: userMessage }] }];
        let responseText = "";

        // Loop de turnos para permitir la ejecución encadenada de herramientas
        for (let turn = 0; turn < 5; turn++) {
          const result = await model.generateContent({ contents });
          const response = result.response;
          const functionCalls = response.functionCalls();

          // Si no hay llamadas a funciones de Gemini, terminamos el flujo con el texto generado
          if (!functionCalls || functionCalls.length === 0) {
            responseText = response.text();
            break;
          }

          // Guardamos la decisión del modelo en el historial de la conversación
          contents.push({
            role: 'model',
            parts: response.candidates?.[0]?.content?.parts || []
          });

          const functionResponseParts: any[] = [];

          // Ejecutar las llamadas de herramientas solicitadas por el modelo
          for (const call of functionCalls) {
            console.log(`[Agente AI] 🛠️ Ejecutando herramienta local: '${call.name}'`);
            let toolResultStr = "";

            try {
              if (call.name === "agendar_cita") {
                toolResultStr = await agendarCitaTool.execute(call.args as any, this.config.id, senderPhone);
              } else if (call.name === "crear_pedido") {
                toolResultStr = await crearPedidoTool.execute(call.args as any);
              } else if (call.name === "registrar_cliente") {
                toolResultStr = await registrarClienteTool.execute(call.args as any);
              } else if (call.name === "reproducir_audio") {
                toolResultStr = await enviarAudioTool.execute(call.args as any, this.config.id, senderPhone, sendVoiceFn);
              } else {
                toolResultStr = `Error: Herramienta '${call.name}' no reconocida.`;
              }
            } catch (err: any) {
              console.error(`[Agente AI] Error ejecutando '${call.name}':`, err);
              toolResultStr = `Error en ejecución: ${err.message}`;
            }

            functionResponseParts.push({
              functionResponse: {
                name: call.name,
                response: { result: toolResultStr }
              }
            });
          }

          // Alimentar los resultados de vuelta a Gemini como rol 'user'
          contents.push({
            role: 'user',
            parts: functionResponseParts
          });
        }

        return responseText || "Disculpa, no logré procesar tu respuesta correctamente.";

      } else {
        // Fallback local sin API KEY para emulación
        console.warn("[Agente AI] GEMINI_API_KEY no encontrada. Usando modo simulación local.");
        let toolResponse = "";
        
        if (this.config.id === "admin" && userMessage.toLowerCase().includes("registrar")) {
          toolResponse = await registrarClienteTool.execute({
            nombreEmpresa: "Clínica Dental Mock",
            telefonoCliente: "573046247664",
            nombreContacto: "Carlos Gómez"
          });
        } else if (this.config.activeTools.includes("agendarCita") && userMessage.toLowerCase().includes("cita")) {
          toolResponse = await agendarCitaTool.execute({ fecha: "2026-07-20", hora: "10:00 AM", nombre: "Juan" }, this.config.id, senderPhone);
        } else if (this.config.activeTools.includes("crearPedido") && userMessage.toLowerCase().includes("pedir")) {
          toolResponse = await crearPedidoTool.execute({ producto: "Pizza Grande", cantidad: 2 });
        } else if (availableAudios.length > 0 && userMessage.toLowerCase().includes("audio")) {
          toolResponse = await enviarAudioTool.execute({ etiqueta: availableAudios[0] }, this.config.id, senderPhone, sendVoiceFn);
        }

        const finalResponseText = `(SIMULACIÓN) RAG Context: "${contextFromDrive}". ${toolResponse ? ' Acción ejecutada: ' + toolResponse : ''}`;
        return `[AI Response para ${this.config.name}]: ${finalResponseText}`;
      }
    } catch (error) {
      console.error("[Agente AI] Error crítico llamando a Gemini:", error);
      return "Lo siento, en este momento estoy experimentando problemas técnicos. Intenta más tarde.";
    }
  }
}
