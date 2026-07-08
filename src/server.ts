import express, { Request, Response } from 'express';
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { google } from 'googleapis';
import { 
  createClient, 
  getClientById, 
  updateClient, 
  deleteClient, 
  listClients, 
  updateClientStatus 
} from './database/clientsCrud';
import { pool } from './database/postgres';
import { whatsappState, initializeWhatsAppClient, connectWhatsApp, logoutWhatsApp, client } from './services/whatsapp';
import { 
  fetchDocumentsFromDrive, 
  createClientFolder, 
  uploadFileToFolder, 
  listFilesFromFolder 
} from './services/drive';
import { saveLocalFile, listLocalFiles } from './services/localKnowledge';
import { activeWaSessions } from './services/whatsapp';
import { startEscalationService } from './services/escalation';

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.use(express.json());

// Servir la carpeta de media de forma estática
const mediaDir = path.join(process.cwd(), 'media', 'clients');
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}
app.use('/media', express.static(path.join(process.cwd(), 'media')));

// Servir los archivos estáticos de la aplicación React (Dashboard)
app.use(express.static(path.join(process.cwd(), 'dashboard/dist')));

// Puerto de ejecución del servidor (default: 3000)
const PORT = process.env.PORT || 3000;

// --- ENDPOINT DE VINCULACIÓN WHATSAPP ---
app.get('/api/whatsapp/status', (req: Request, res: Response) => {
  res.json({ success: true, data: whatsappState });
});

app.post('/api/whatsapp/connect', (req: Request, res: Response) => {
  try {
    connectWhatsApp();
    res.json({ success: true, message: 'Inicializando conexión de WhatsApp...' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/whatsapp/logout', async (req: Request, res: Response) => {
  try {
    await logoutWhatsApp();
    res.json({ success: true, message: 'Sesión de WhatsApp cerrada correctamente' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- ENDPOINTS DE CLIENTES (CRUD) ---

// 1. Listar todos los clientes
app.get('/api/clients', async (req: Request, res: Response) => {
  try {
    const clients = (await listClients()).filter(c => c.id !== 'admin');
    res.json({ success: true, count: clients.length, data: clients });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Obtener un cliente por su ID
app.get('/api/clients/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const client = await getClientById(id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }
    res.json({ success: true, data: client });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2.5. Obtener los logs de chat de un cliente desde PostgreSQL
app.get('/api/clients/:id/logs', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const logs = await pool.query(
      'SELECT sender_phone, message_text, response_text, api_cost, timestamp FROM interactions WHERE client_id = $1 ORDER BY timestamp DESC LIMIT 50',
      [id]
    );
    res.json({ success: true, count: logs.rowCount, data: logs.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Crear un cliente (ID automático, carpeta de Google Drive autogenerada y credenciales de acceso)
app.post('/api/clients', async (req: Request, res: Response) => {
  try {
    const { 
      id, 
      name, 
      phone_number, 
      system_prompt, 
      active_tools, 
      agent_phone, 
      drive_folder_id,
      username,
      password,
      email,
      contact_name 
    } = req.body;

    if (!name || !phone_number) {
      return res.status(400).json({ 
        success: false, 
        message: 'Faltan campos obligatorios: name, phone_number' 
      });
    }

    const clientId = id || 'client_' + Math.random().toString(36).substring(2, 10);
    const finalPrompt = system_prompt || `Eres un asistente de IA amable y servicial para la empresa ${name}.`;

    let finalDriveFolderId = drive_folder_id;
    // Si no nos pasan una carpeta de drive por parámetro, la creamos automáticamente en tu Drive de 5TB!
    if (!finalDriveFolderId) {
      try {
        finalDriveFolderId = await createClientFolder(name);
      } catch (driveErr: any) {
        console.error(`[API] ⚠️ No se pudo crear la carpeta de Google Drive automáticamente:`, driveErr.message);
        // Continuamos de todas formas
      }
    }

    await createClient({ 
      id: clientId, 
      name, 
      phone_number, 
      system_prompt: finalPrompt, 
      active_tools: active_tools || [], 
      agent_phone,
      drive_folder_id: finalDriveFolderId,
      username: username || null,
      password: password || null,
      email: email || null,
      contact_name: contact_name || null
    });

    res.status(201).json({ 
      success: true, 
      message: `Cliente '${name}' creado exitosamente`,
      data: { 
        id: clientId,
        driveFolderId: finalDriveFolderId
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Actualizar los campos de un cliente
app.put('/api/clients/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const updates = req.body;

    const existing = await getClientById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    await updateClient(id, updates);
    res.json({ success: true, message: `Cliente '${id}' actualizado con éxito` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Eliminar un cliente
app.delete('/api/clients/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    if (id === 'admin') {
      return res.status(403).json({ success: false, message: 'No se puede eliminar la cuenta del administrador.' });
    }

    const existing = await getClientById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    await deleteClient(id);
    res.json({ success: true, message: `Cliente '${id}' eliminado con éxito` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Suspender la cuenta de un cliente
app.post('/api/clients/:id/suspend', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await getClientById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    await updateClientStatus(id, 'suspended');
    res.json({ success: true, message: `Cliente '${id}' suspendido exitosamente` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Activar la cuenta de un cliente
app.post('/api/clients/:id/activate', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await getClientById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    await updateClientStatus(id, 'active');
    res.json({ success: true, message: `Cliente '${id}' activado exitosamente` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- ENDPOINTS DE GESTIÓN DE ASESORES HUMANOS (CASCADA) ---

// 7.1 Listar asesores de un cliente
app.get('/api/clients/:clientId/agents', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const result = await pool.query(
      `SELECT id, name, phone, priority, status FROM agent_contacts WHERE client_id = $1 ORDER BY priority ASC`,
      [clientId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7.2 Agregar o actualizar asesor de un cliente
app.post('/api/clients/:clientId/agents', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { name, phone, priority } = req.body;
    
    if (!name || !phone || priority === undefined) {
      return res.status(400).json({ success: false, error: 'Campos requeridos incompletos.' });
    }

    await pool.query(
      `INSERT INTO agent_contacts (client_id, name, phone, priority) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (client_id, phone) 
       DO UPDATE SET name = EXCLUDED.name, priority = EXCLUDED.priority`,
      [clientId, name, phone, priority]
    );
    res.json({ success: true, message: 'Asesor agregado o actualizado correctamente.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7.3 Eliminar asesor de un cliente
app.delete('/api/clients/:clientId/agents/:agentId', async (req: Request, res: Response) => {
  try {
    const { clientId, agentId } = req.params;
    await pool.query(
      `DELETE FROM agent_contacts WHERE id = $1 AND client_id = $2`,
      [agentId, clientId]
    );
    res.json({ success: true, message: 'Asesor eliminado correctamente.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7.4 Modificar estado del asesor (online/offline)
app.patch('/api/clients/:clientId/agents/:agentId', async (req: Request, res: Response) => {
  try {
    const { clientId, agentId } = req.params;
    const { status } = req.body; // 'online' o 'offline'
    
    if (!status || (status !== 'online' && status !== 'offline')) {
      return res.status(400).json({ success: false, error: 'Estado inválido.' });
    }

    await pool.query(
      `UPDATE agent_contacts SET status = $1 WHERE id = $2 AND client_id = $3`,
      [status, agentId, clientId]
    );
    res.json({ success: true, message: 'Estado del asesor actualizado con éxito.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- ENDPOINTS DE GESTIÓN DE AUDIOS PREGRABADOS ---

// 7.41 Listar audios de un cliente
app.get('/api/clients/:clientId/audios', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId as string;
    const clientMediaDir = path.join(process.cwd(), 'media', 'clients', clientId);
    
    if (!fs.existsSync(clientMediaDir)) {
      return res.json({ success: true, data: [] });
    }

    const files = fs.readdirSync(clientMediaDir);
    const audioData = files.map(file => {
      const stats = fs.statSync(path.join(clientMediaDir, file));
      const ext = path.extname(file);
      const tag = path.basename(file, ext);
      return {
        tag,
        fileName: file,
        size: stats.size,
        url: `/media/clients/${clientId}/${file}`
      };
    });

    res.json({ success: true, data: audioData });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7.42 Subir o actualizar audio de un cliente
app.post('/api/clients/:clientId/audios', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId as string;
    const etiqueta = (req.body.etiqueta || '') as string;
    const file = req.file;

    if (!etiqueta || !file) {
      return res.status(400).json({ success: false, error: 'Etiqueta o archivo faltante.' });
    }

    const cleanTag = etiqueta.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanTag) {
      return res.status(400).json({ success: false, error: 'Etiqueta no válida.' });
    }

    const clientMediaDir = path.join(process.cwd(), 'media', 'clients', clientId);
    if (!fs.existsSync(clientMediaDir)) {
      fs.mkdirSync(clientMediaDir, { recursive: true });
    }

    const ext = path.extname(file.originalname) || '.mp3';
    const fileName = `${cleanTag}${ext}`;
    const filePath = path.join(clientMediaDir, fileName);

    // Evitar duplicados eliminando archivos con la misma etiqueta pero diferente extensión
    const existingFiles = fs.readdirSync(clientMediaDir);
    for (const f of existingFiles) {
      if (f.startsWith(`${cleanTag}.`)) {
        fs.unlinkSync(path.join(clientMediaDir, f));
      }
    }

    fs.writeFileSync(filePath, file.buffer);
    console.log(`[Media Upload] 🎙️ Audio guardado para cliente ${clientId}: ${fileName}`);

    res.json({ success: true, message: 'Audio subido correctamente.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7.43 Eliminar audio de un cliente
app.delete('/api/clients/:clientId/audios/:fileName', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId as string;
    const fileName = req.params.fileName as string;
    const filePath = path.join(process.cwd(), 'media', 'clients', clientId, fileName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: 'Audio eliminado con éxito.' });
    } else {
      res.status(404).json({ success: false, error: 'Archivo no encontrado.' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// 7.5 Sincronizar carpeta de Google Drive e indexar vectores en pgvector
app.post('/api/clients/:id/sync-drive', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const client = await getClientById(id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    if (!client.driveFolderId) {
      return res.status(400).json({ 
        success: false, 
        message: 'El cliente no tiene una carpeta de Google Drive (driveFolderId) configurada.' 
      });
    }

    // Sincronizar archivos y convertirlos a vectores
    const chunks = await fetchDocumentsFromDrive(id, client.driveFolderId);
    res.json({
      success: true,
      message: `Sincronización completada con éxito. Se generaron y almacenaron ${chunks.length} vectores semánticos en PostgreSQL.`,
      data: { chunksCount: chunks.length }
    });
  } catch (error: any) {
    console.error(`[API] Error al sincronizar Drive del cliente ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7.6 Autenticación de Clientes (Login)
app.post('/api/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Usuario y contraseña requeridos.' });
    }

    // Consultar el cliente por usuario en PostgreSQL
    const result = await pool.query(
      `SELECT id, name, username, password FROM clients WHERE username = $1 LIMIT 1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos.' });
    }

    const client = result.rows[0];

    // Comparación simple de contraseña (texto plano para el prototipo/pruebas)
    if (client.password !== password) {
      return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos.' });
    }

    const isAdmin = client.username.toLowerCase() === 'admin';
    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        id: client.id,
        name: client.name,
        username: client.username,
        role: isAdmin ? 'admin' : 'client'
      }
    });
  } catch (err: any) {
    console.error("[Auth API] Error en login:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7.7 Obtener listado combinado de archivos (Google Drive + Almacenamiento Local)
app.get('/api/clients/:id/files', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const client = await getClientById(id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    const combinedFiles: Array<{ id: string, name: string, mimeType: string, source: 'cloud' | 'local' }> = [];

    // A. Consultar archivos de Google Drive (si está configurada)
    if (client.driveFolderId) {
      try {
        const driveFiles = await listFilesFromFolder(client.driveFolderId);
        combinedFiles.push(...driveFiles.map(f => ({ ...f, source: 'cloud' as const })));
      } catch (driveErr) {
        console.error(`[API] ⚠️ Error listando archivos de Drive para cliente ${id}:`, driveErr);
      }
    }

    // B. Consultar archivos locales del servidor
    try {
      const localFiles = await listLocalFiles(id);
      combinedFiles.push(...localFiles.map(f => ({ ...f, source: 'local' as const })));
    } catch (localErr) {
      console.error(`[API] ⚠️ Error listando archivos locales para cliente ${id}:`, localErr);
    }

    res.json({ success: true, count: combinedFiles.length, data: combinedFiles });
  } catch (err: any) {
    console.error(`[API] Error listando archivos combinados para cliente ${req.params.id}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7.8 Cargar archivo localmente e indexar en RAG (Combina con Drive si está configurado)
app.post('/api/clients/:id/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const client = await getClientById(id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se recibió ningún archivo en el formulario.' });
    }

    // Guardar el archivo localmente en el disco del servidor (evita límites de cuotas de Drive)
    await saveLocalFile(id, req.file.originalname, req.file.buffer);

    // Re-sincronizar el RAG automáticamente (cargará locales y Drive combinados)
    console.log(`[API] Autodisparando sincronización RAG híbrida para cliente: ${id}...`);
    const chunks = await fetchDocumentsFromDrive(id, client.driveFolderId || null);

    res.json({
      success: true,
      message: `Archivo '${req.file.originalname}' cargado en el servidor e indexado en pgvector con éxito.`,
      data: { 
        fileName: req.file.originalname,
        chunksCount: chunks.length 
      }
    });
  } catch (err: any) {
    console.error(`[API] Error cargando archivo local para cliente ${req.params.id}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7.9 Redirección para iniciar sesión de Administrador con Google (OAuth 2.0)
app.get('/api/auth/google/admin', (req: Request, res: Response) => {
  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
  
  if (!CLIENT_ID || !REDIRECT_URI) {
    return res.status(400).send("Falta GOOGLE_CLIENT_ID o GOOGLE_REDIRECT_URI en el archivo .env.");
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
    `client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('https://www.googleapis.com/auth/drive')}` +
    `&access_type=offline` +
    `&prompt=consent`;

  res.redirect(authUrl);
});

// 7.10 Callback de Google OAuth 2.0 para capturar e imprimir el refresh_token
app.get('/api/auth/google/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

  if (!code) {
    return res.status(400).send("No se recibió ningún código de autorización de Google.");
  }

  try {
    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    
    // Intercambiar el código por los tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log("\n=======================================================");
    console.log("🔑 [GOOGLE OAUTH] ¡AUTENTICACIÓN EXITOSA!");
    console.log("-------------------------------------------------------");
    console.log("Copia el siguiente REFRESH_TOKEN y pégalo en tu archivo .env:");
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log("=======================================================\n");

    res.send(`
      <div style="font-family: sans-serif; text-align: center; padding: 40px; background: #070b13; color: #fff; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <div style="background: #0e1726; border: 1px solid rgba(255,255,255,0.05); padding: 40px; border-radius: 20px; max-width: 600px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">
          <span style="font-size: 48px; margin-bottom: 20px; display: inline-block;">🎉</span>
          <h1 style="color: #00ff88; font-size: 26px; margin: 0 0 10px 0;">¡Conexión Exitosa con Google Drive!</h1>
          <p style="color: #a0aec0; font-size: 14px; margin-bottom: 25px;">El token de acceso se ha generado correctamente para tu cuenta.</p>
          <div style="background: #1b2535; border: 1px solid rgba(10,92,255,0.2); padding: 15px; border-radius: 12px; margin-bottom: 20px; font-family: monospace; font-size: 13px; color: #ffaa00; text-align: left; overflow-x: auto; white-space: nowrap;">
            <strong>GOOGLE_REFRESH_TOKEN=</strong>${tokens.refresh_token}
          </div>
          <p style="color: #718096; font-size: 12px; line-height: 1.5; margin: 0;">Copia la línea de arriba y agrégala a tu archivo <strong>.env</strong> en la raíz del proyecto. Después, reinicia el servidor para activar los permisos de escritura.</p>
        </div>
      </div>
    `);
  } catch (err: any) {
    console.error("[OAuth Callback] Error al intercambiar tokens:", err);
    res.status(500).send(`Error al autenticar con Google: ${err.message}`);
  }
});


// --- ENDPOINTS DE MÉTRICAS (MÓDULO ADMIN/DASHBOARD) ---

// 8. Obtener métricas globales e individuales de consumo
app.get('/api/metrics', async (req: Request, res: Response) => {
  try {
    // A. Métricas globales de uso de la plataforma
    const globalStats = await pool.query(`
      SELECT 
        COUNT(*)::INT AS "totalInteractions",
        COALESCE(SUM(api_cost), 0.000000)::FLOAT AS "totalApiCost",
        COALESCE(SUM(tokens_input + tokens_output), 0)::INT AS "totalTokensConsumed",
        COUNT(DISTINCT sender_phone)::INT AS "totalUniqueUsers"
      FROM interactions
    `);

    // B. Métricas agrupadas por cada inquilino/cliente
    const clientStats = await pool.query(`
      SELECT 
        c.id AS "clientId",
        c.name AS "clientName",
        c.status AS "clientStatus",
        COUNT(i.id)::INT AS "totalChats",
        COALESCE(SUM(i.api_cost), 0.000000)::FLOAT AS "apiCost",
        COUNT(DISTINCT i.sender_phone)::INT AS "uniqueUsers",
        -- ROI Estimado: 3 minutos ahorrados por interacción humana
        ROUND((COUNT(i.id) * 3.0 / 60.0), 2)::FLOAT AS "hoursSaved"
      FROM clients c
      LEFT JOIN interactions i ON c.id = i.client_id
      GROUP BY c.id, c.name, c.status
    `);

    res.json({
      success: true,
      data: {
        summary: globalStats.rows[0],
        clients: clientStats.rows
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7.11 Vista móvil de autenticación para carga de archivos en WhatsApp
app.get('/wa-auth', (req: Request, res: Response) => {
  res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Diaz Lab - Autenticación WhatsApp</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #070b13;
      color: #ffffff;
      font-family: 'Outfit', sans-serif;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      box-sizing: border-box;
      overflow-x: hidden;
      position: relative;
    }
    .neon-bg-1 {
      position: absolute;
      top: -10%;
      left: -10%;
      width: 60%;
      height: 60%;
      background: #0a5cff;
      opacity: 0.1;
      border-radius: 50%;
      filter: blur(120px);
      z-index: 1;
    }
    .neon-bg-2 {
      position: absolute;
      bottom: -10%;
      right: -10%;
      width: 60%;
      height: 60%;
      background: #00ff88;
      opacity: 0.05;
      border-radius: 50%;
      filter: blur(120px);
      z-index: 1;
    }
    .container {
      width: 100%;
      max-width: 400px;
      padding: 20px;
      position: relative;
      z-index: 2;
    }
    .glass-card {
      background: rgba(14, 23, 38, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(20px);
      padding: 30px 24px;
      border-radius: 24px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
      text-align: center;
    }
    .icon {
      width: 60px;
      height: 60px;
      background: rgba(10, 92, 255, 0.1);
      border: 1px solid rgba(10, 92, 255, 0.2);
      color: #0a5cff;
      border-radius: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 8px 0;
      background: linear-gradient(to right, #fff, #a0aec0);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      color: #a0aec0;
      font-size: 13px;
      line-height: 1.5;
      margin: 0 0 24px 0;
    }
    .input-group {
      text-align: left;
      margin-bottom: 16px;
    }
    label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #a0aec0;
      display: block;
      margin-bottom: 6px;
    }
    .input-wrapper {
      position: relative;
    }
    .input-wrapper span {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #718096;
      font-size: 18px;
    }
    input {
      width: 100%;
      background: rgba(27, 37, 53, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 12px 12px 12px 38px;
      box-sizing: border-box;
      color: #fff;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: all 0.2s;
    }
    input:focus {
      border-color: rgba(10, 92, 255, 0.5);
      box-shadow: 0 0 0 2px rgba(10, 92, 255, 0.15);
    }
    button {
      width: 100%;
      background: linear-gradient(90deg, #0a5cff, #00ff88);
      color: #070b13;
      border: none;
      border-radius: 12px;
      padding: 14px;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 10px;
    }
    button:hover {
      filter: brightness(1.1);
    }
    button:active {
      transform: scale(0.99);
    }
    .error-msg {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #f87171;
      padding: 10px;
      border-radius: 10px;
      font-size: 12px;
      margin-bottom: 16px;
      display: none;
      text-align: center;
    }
    .success-card {
      display: none;
    }
    .success-icon {
      font-size: 48px;
      color: #00ff88;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="neon-bg-1"></div>
  <div class="neon-bg-2"></div>
  <div class="container">
    <div class="glass-card" id="auth-card">
      <div class="icon">
        <span class="material-symbols-outlined" style="font-size: 32px;">vpn_key</span>
      </div>
      <h1>Acceso Seguro WhatsApp</h1>
      <p id="sub-title">Cargando número...</p>
      
      <div class="error-msg" id="error-box"></div>

      <form id="login-form">
        <div class="input-group">
          <label>Usuario</label>
          <div class="input-wrapper">
            <span class="material-symbols-outlined">person</span>
            <input type="text" id="username" placeholder="Ingresa tu usuario" required>
          </div>
        </div>
        <div class="input-group">
          <label>Contraseña</label>
          <div class="input-wrapper">
            <span class="material-symbols-outlined">lock</span>
            <input type="password" id="password" placeholder="••••••••" required>
          </div>
        </div>
        <button type="submit" id="submit-btn">Habilitar WhatsApp</button>
      </form>
    </div>

    <!-- Éxito -->
    <div class="glass-card success-card" id="success-card">
      <div class="success-icon">🎉</div>
      <h1 style="color: #00ff88;">¡Sesión Habilitada!</h1>
      <p style="margin-bottom: 0; color: #a0aec0; font-size: 14px; line-height: 1.6; text-align: center;">
        Tu número <strong id="success-phone" style="color: #fff;"></strong> ha sido verificado con éxito.<br><br>
        Ya puedes cerrar esta pestaña y <strong>enviar tus archivos directamente en el chat</strong> de WhatsApp.<br><br>
        <span style="color: #ffaa00; font-weight: 600;">🔒 Esta sesión expira automáticamente en 10 minutos por tu seguridad.</span>
      </p>
    </div>
  </div>

  <script>
    const params = new URLSearchParams(window.location.search);
    const phone = params.get('phone') || '';
    
    if (!phone) {
      document.getElementById('sub-title').innerHTML = "<span style='color:#ef4444;'>Error: Falta número de teléfono en el enlace.</span>";
      document.getElementById('login-form').style.display = 'none';
    } else {
      document.getElementById('sub-title').innerText = "Inicia sesión para autorizar la carga de archivos para el número: +" + phone;
    }

    const form = document.getElementById('login-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const errorBox = document.getElementById('error-box');
      const submitBtn = document.getElementById('submit-btn');

      try {
        submitBtn.disabled = true;
        submitBtn.innerText = "Verificando...";
        errorBox.style.display = 'none';

        const res = await fetch('/api/wa-auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, phone })
        });

        const json = await res.json();
        if (json.success) {
          document.getElementById('auth-card').style.display = 'none';
          document.getElementById('success-phone').innerText = "+" + phone;
          document.getElementById('success-card').style.display = 'block';
        } else {
          errorBox.innerText = json.error || "Credenciales incorrectas.";
          errorBox.style.display = 'block';
        }
      } catch (err) {
        errorBox.innerText = "Error de conexión con el servidor.";
        errorBox.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Habilitar WhatsApp";
      }
    });
  </script>
</body>
</html>
  `);
});

// 7.12 Endpoint para validar credenciales de WhatsApp y crear sesión temporal (10 minutos)
app.post('/api/wa-auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password, phone } = req.body;

    if (!username || !password || !phone) {
      return res.status(400).json({ success: false, error: 'Campos requeridos incompletos.' });
    }

    // Consultar el cliente por usuario en la base de datos
    const result = await pool.query(
      `SELECT id, password FROM clients WHERE username = $1 LIMIT 1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos.' });
    }

    const client = result.rows[0];

    // Verificar contraseña (texto plano temporal)
    if (client.password !== password) {
      return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos.' });
    }

    // Registrar la sesión de WhatsApp por 10 minutos (600,000 ms)
    activeWaSessions.set(phone, {
      clientId: client.id,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    console.log(`[WhatsApp Auth] 🔒 Sesión temporal autorizada para teléfono +${phone} (Cliente: ${client.id})`);

    res.json({ success: true, message: 'Autenticación exitosa. Sesión de WhatsApp abierta.' });
  } catch (err: any) {
    console.error("[WhatsApp Auth API] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// Fallback para SPA en React (cualquier ruta de navegación sirve el index.html)
app.get(/.*/, (req: Request, res: Response) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(process.cwd(), 'dashboard/dist/index.html'));
  }
});

// Inicializar servidor de API
app.listen(PORT, () => {
  console.log(`🚀 [Servidor API] Servidor Express activo en el puerto ${PORT}`);
  console.log(`📊 Endpoints CRUD de Clientes disponibles en: http://localhost:${PORT}/api/clients`);
  console.log(`📈 Estadísticas de Métricas y Costos en: http://localhost:${PORT}/api/metrics`);
  
  // Inicializamos el receptor de eventos de WhatsApp al arrancar
  initializeWhatsAppClient();

  // Iniciar servicio de escalamiento de agentes en cascada
  startEscalationService(async (to, text) => {
    if (client && whatsappState.status === 'CONNECTED') {
      const target = to.includes('@c.us') ? to : `${to}@c.us`;
      await client.sendMessage(target, text);
    } else {
      console.warn(`[Escalation SMS Fallback] No se pudo enviar mensaje a ${to} (WhatsApp no conectado).`);
    }
  });
});
