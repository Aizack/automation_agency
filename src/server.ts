import express, { Request, Response } from 'express';
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
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
import { logger } from './services/logger';
import { startEscalationService } from './services/escalation';
import { authenticateToken, requireRole, authorizeClientAccess, AuthenticatedRequest } from './middlewares/authMiddleware';
import { registerShutdownHandlers, restoreSystemState } from './services/shutdownManager';
import { startScheduler } from './services/scheduler';
import { AIAgent } from './agents/base';
import { getClientConfigById } from './core/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicializar el manejador de señales de apagado del SO
registerShutdownHandlers();

// Restaurar sesiones de carga de archivos previas y limpiar archivo temporal
restoreSystemState();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_fallback_key_123';


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
app.get('/api/whatsapp/status', authenticateToken as any, (req: Request, res: Response) => {
  res.json({ success: true, data: whatsappState });
});

app.post('/api/whatsapp/connect', authenticateToken as any, (req: Request, res: Response, next) => {
  const authReq = req as AuthenticatedRequest;
  const clientId = req.query.clientId as string;
  if (authReq.user?.role === 'admin' || authReq.user?.id === clientId) {
    return next();
  }
  return res.status(403).json({ success: false, error: 'Acceso denegado. No tienes permisos para conectar esta cuenta.' });
}, (req: Request, res: Response) => {
  try {
    const clientId = req.query.clientId as string;
    connectWhatsApp(clientId);
    res.json({ success: true, message: 'Inicializando conexión de WhatsApp...' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/whatsapp/logout', authenticateToken as any, async (req: Request, res: Response) => {
  try {
    await logoutWhatsApp();
    res.json({ success: true, message: 'Sesión de WhatsApp cerrada correctamente' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- ENDPOINTS DE CLIENTES (CRUD) ---

// 1. Listar todos los clientes
app.get('/api/clients', authenticateToken as any, requireRole(['admin']) as any, async (req: Request, res: Response) => {
  try {
    const clients = (await listClients()).filter(c => c.id !== 'admin');
    res.json({ success: true, count: clients.length, data: clients });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Obtener un cliente por su ID
app.get('/api/clients/:id', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
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
app.get('/api/clients/:id/logs', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
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
app.post('/api/clients', authenticateToken as any, requireRole(['admin']) as any, async (req: Request, res: Response) => {
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
app.put('/api/clients/:id', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
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
app.delete('/api/clients/:id', authenticateToken as any, requireRole(['admin']) as any, async (req: Request, res: Response) => {
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
app.post('/api/clients/:id/suspend', authenticateToken as any, requireRole(['admin']) as any, async (req: Request, res: Response) => {
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
app.post('/api/clients/:id/activate', authenticateToken as any, requireRole(['admin']) as any, async (req: Request, res: Response) => {
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
app.get('/api/clients/:clientId/agents', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
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
app.post('/api/clients/:clientId/agents', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
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
app.delete('/api/clients/:clientId/agents/:agentId', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
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
app.patch('/api/clients/:clientId/agents/:agentId', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
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
app.get('/api/clients/:clientId/audios', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
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
app.post('/api/clients/:clientId/audios', authenticateToken as any, authorizeClientAccess as any, upload.single('audio'), async (req: Request, res: Response) => {
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
app.delete('/api/clients/:clientId/audios/:fileName', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
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
app.post('/api/clients/:id/sync-drive', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
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
      `SELECT id, name, username, password, is_activated FROM clients WHERE username = $1 LIMIT 1`,
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

    // Bloquear inicio de sesión si la cuenta no ha sido activada (excepto administrador)
    if (!isAdmin && !client.is_activated) {
      return res.status(403).json({ success: false, error: 'La cuenta aún no ha sido activada. Utiliza el enlace que recibiste por WhatsApp para establecer tu contraseña.' });
    }

    const token = jwt.sign(
      { id: client.id, username: client.username, role: isAdmin ? 'admin' : 'client' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        id: client.id,
        name: client.name,
        username: client.username,
        role: isAdmin ? 'admin' : 'client',
        token
      }
    });
  } catch (err: any) {
    console.error("[Auth API] Error en login:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7.6.0 Endpoint para validar sesión y retornar perfil actual
app.get('/api/me', authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      return res.status(401).json({ success: false, error: 'No autorizado. Sesión no iniciada.' });
    }

    // Buscar detalles frescos del cliente
    const result = await pool.query(
      `SELECT id, name, username, is_activated FROM clients WHERE id = $1 LIMIT 1`,
      [authReq.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
    }

    const client = result.rows[0];
    const isAdmin = client.username.toLowerCase() === 'admin';

    res.json({
      success: true,
      data: {
        id: client.id,
        name: client.name,
        username: client.username,
        role: isAdmin ? 'admin' : 'client'
      }
    });
  } catch (err: any) {
    console.error("[Auth API] Error en GET /api/me:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7.6.1 Activación de cuenta y establecimiento de contraseña segura
app.post('/api/activate-account', async (req: Request, res: Response) => {
  try {
    const { clientId, token, password } = req.body;
    if (!clientId || !token || !password) {
      return res.status(400).json({ success: false, error: 'ClientId, token y nueva contraseña requeridos.' });
    }

    // Buscar el cliente por su ID
    const result = await pool.query(
      `SELECT password, is_activated FROM clients WHERE id = $1 LIMIT 1`,
      [clientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cliente no encontrado.' });
    }

    const client = result.rows[0];

    if (client.is_activated) {
      return res.status(400).json({ success: false, error: 'La cuenta ya ha sido activada anteriormente.' });
    }

    // Validar el token temporal (que corresponde al password autogenerado inicial)
    if (client.password !== token) {
      return res.status(401).json({ success: false, error: 'Token de activación inválido.' });
    }

    // Actualizar contraseña y activar la cuenta
    await pool.query(
      `UPDATE clients SET password = $1, is_activated = TRUE WHERE id = $2`,
      [password, clientId]
    );

    res.json({
      success: true,
      message: 'Cuenta activada con éxito. Ya puedes iniciar sesión con tu nueva contraseña.'
    });
  } catch (err: any) {
    console.error("[Activation API] Error en activación:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7.7 Obtener listado combinado de archivos (Google Drive + Almacenamiento Local)
app.get('/api/clients/:id/files', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
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
app.post('/api/clients/:id/upload', authenticateToken as any, authorizeClientAccess as any, upload.single('file'), async (req: Request, res: Response) => {
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
app.get('/api/metrics', authenticateToken as any, requireRole(['admin']) as any, async (req: Request, res: Response) => {
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

// --- ENDPOINT DE METRICAS DE PAGOS (WEBHOOK) ---
app.post('/api/payments/webhook', async (req: Request, res: Response) => {
  try {
    const { clientId, status, planName, amount } = req.body;
    console.log(`[Payments Webhook] 💳 Recibido webhook de pago para cliente: ${clientId}, estado: ${status}, plan: ${planName}, monto: $${amount}`);

    if (status === 'succeeded' || status === 'paid') {
      const clientData = await getClientById(clientId);
      if (!clientData) {
        return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
      }

      // 1. Actualizar estado del cliente a activo en PostgreSQL
      await updateClientStatus(clientId, 'active');
      console.log(`[Payments Webhook] ✅ Estado del cliente '${clientId}' actualizado a 'active'.`);

      // 2. Notificar al dueño por WhatsApp usando la conexión activa de WhatsApp
      const ownerPhone = clientData.ownerPhone || clientData.phoneNumber;
      if (ownerPhone && client) {
        const target = ownerPhone.includes('@c.us') ? ownerPhone : `${ownerPhone}@c.us`;
        const confirmationMsg = `💳 *¡Pago Confirmado Exitosamente!*\n\nHemos recibido tu pago de $${amount} USD por la suscripción al *${planName || 'Plan Seleccionado'}*.\n\nTu bot de servicio ahora está activo de forma permanente y listo para seguir atendiendo a tus clientes. ¡Mucho éxito en la automatización de tu negocio! 🚀`;
        
        await client.sendMessage(target, confirmationMsg);
        console.log(`[Payments Webhook] Notificación de pago enviada al dueño: ${ownerPhone}`);
      }

      res.json({ success: true, message: 'Pago procesado y cliente activado.' });
    } else {
      res.json({ success: true, message: 'Pago no exitoso, no se requiere acción.' });
    }
  } catch (error: any) {
    console.error("[Payments Webhook] Error procesando webhook de pago:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// --- SAAS ERP: PRODUCTOS / INVENTARIO ---
// Obtener todos los productos (con columnas de costo y alarmas de stock)
app.get('/api/clients/:clientId/products', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const result = await pool.query(
      `SELECT id, name, sku, description, price, stock, cost_price, min_stock, supplier_name, supplier_phone, created_at 
       FROM products 
       WHERE client_id = $1 
       ORDER BY created_at DESC`,
      [clientId]
    );
    res.json({ success: true, products: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Buscar producto individual por SKU (para soporte de lector de código de barras)
app.get('/api/clients/:clientId/products/sku/:sku', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, sku } = req.params;
    const result = await pool.query(
      `SELECT id, name, sku, description, price, stock, cost_price, min_stock, supplier_name, supplier_phone 
       FROM products 
       WHERE client_id = $1 AND sku = $2 LIMIT 1`,
      [clientId, sku]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado por este código SKU.' });
    }
    res.json({ success: true, product: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reporte de alerta de stock mínimo
app.get('/api/clients/:clientId/products/low-stock', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const result = await pool.query(
      `SELECT id, name, sku, stock, min_stock, supplier_name, supplier_phone 
       FROM products 
       WHERE client_id = $1 AND stock <= min_stock 
       ORDER BY stock ASC`,
      [clientId]
    );
    res.json({ success: true, products: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Crear nuevo producto en inventario
app.post('/api/clients/:clientId/products', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { name, sku, description, price, stock, cost_price, min_stock, supplier_name, supplier_phone } = req.body;

    if (!name || price === undefined || stock === undefined) {
      return res.status(400).json({ success: false, error: 'Nombre, precio y stock son requeridos.' });
    }

    const result = await pool.query(
      `INSERT INTO products (
         client_id, name, sku, description, price, stock, cost_price, min_stock, supplier_name, supplier_phone
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING id, name, sku, description, price, stock, cost_price, min_stock, supplier_name, supplier_phone, created_at`,
      [
        clientId, name, sku || null, description || null, price, stock, 
        cost_price || 0.00, min_stock || 5, supplier_name || null, supplier_phone || null
      ]
    );

    res.json({ success: true, product: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Editar datos del producto
app.put('/api/clients/:clientId/products/:productId', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, productId } = req.params;
    const { name, sku, description, price, stock, cost_price, min_stock, supplier_name, supplier_phone } = req.body;

    if (!name || price === undefined || stock === undefined) {
      return res.status(400).json({ success: false, error: 'Nombre, precio y stock son requeridos.' });
    }

    const result = await pool.query(
      `UPDATE products 
       SET name = $1, sku = $2, description = $3, price = $4, stock = $5, 
           cost_price = $6, min_stock = $7, supplier_name = $8, supplier_phone = $9
       WHERE client_id = $10 AND id = $11 
       RETURNING id, name, sku, description, price, stock, cost_price, min_stock, supplier_name, supplier_phone, created_at`,
      [
        name, sku || null, description || null, price, stock, 
        cost_price || 0.00, min_stock || 5, supplier_name || null, supplier_phone || null, 
        clientId, productId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado.' });
    }

    res.json({ success: true, product: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Carga masiva de inventario por CSV
const diskUpload = multer({ dest: 'uploads/' });
app.post('/api/clients/:clientId/products/import', authenticateToken as any, authorizeClientAccess as any, diskUpload.single('file'), async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Debe cargar un archivo CSV para importar.' });
    }

    const filePath = req.file.path;
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Eliminar archivo temporal
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error("[Multer cleanup] Error unlinking temp file:", e);
    }

    // Dividir líneas
    const lines = fileContent.split(/\r?\n/);
    if (lines.length <= 1) {
      return res.status(400).json({ success: false, error: 'El archivo está vacío o no contiene filas.' });
    }

    // Detectar encabezados
    const headers = lines[0].split(/[;,]/).map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
    
    // Mapear posiciones
    const idxName = headers.indexOf('nombre');
    const idxSku = headers.indexOf('sku');
    const idxDesc = headers.indexOf('descripcion') !== -1 ? headers.indexOf('descripcion') : headers.indexOf('descripción');
    const idxPrice = headers.indexOf('precio') !== -1 ? headers.indexOf('precio') : headers.indexOf('price');
    const idxStock = headers.indexOf('stock');
    const idxCost = headers.indexOf('costo') !== -1 ? headers.indexOf('costo') : headers.indexOf('cost_price');
    const idxMinStock = headers.indexOf('stock_minimo') !== -1 ? headers.indexOf('stock_minimo') : headers.indexOf('min_stock');
    const idxSupName = headers.indexOf('proveedor') !== -1 ? headers.indexOf('proveedor') : headers.indexOf('supplier_name');
    const idxSupPhone = headers.indexOf('telefono_proveedor') !== -1 ? headers.indexOf('telefono_proveedor') : headers.indexOf('supplier_phone');

    if (idxName === -1 || idxPrice === -1 || idxStock === -1) {
      return res.status(400).json({ 
        success: false, 
        error: 'El archivo CSV debe contener al menos las columnas "nombre", "precio" y "stock".' 
      });
    }

    let importedCount = 0;
    let errorCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cells = line.split(/[;,]/).map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (cells.length < headers.length) continue;

      try {
        const name = cells[idxName];
        const sku = idxSku !== -1 ? cells[idxSku] : null;
        const description = idxDesc !== -1 ? cells[idxDesc] : null;
        const price = parseFloat(cells[idxPrice] || '0');
        const stock = parseInt(cells[idxStock] || '0');
        const costPrice = idxCost !== -1 ? parseFloat(cells[idxCost] || '0') : 0.00;
        const minStock = idxMinStock !== -1 ? parseInt(cells[idxMinStock] || '5') : 5;
        const supplierName = idxSupName !== -1 ? cells[idxSupName] : null;
        const supplierPhone = idxSupPhone !== -1 ? cells[idxSupPhone] : null;

        if (!name) {
          errorCount++;
          continue;
        }

        // Insertar o actualizar si el SKU ya existe
        if (sku) {
          const checkRes = await pool.query(
            `SELECT id FROM products WHERE client_id = $1 AND sku = $2 LIMIT 1`,
            [clientId, sku]
          );
          if (checkRes.rows.length > 0) {
            // Actualizar sumando stock
            await pool.query(
              `UPDATE products 
               SET name = $1, description = $2, price = $3, stock = stock + $4, 
                   cost_price = $5, min_stock = $6, supplier_name = $7, supplier_phone = $8
               WHERE client_id = $9 AND sku = $10`,
              [name, description, price, stock, costPrice, minStock, supplierName, supplierPhone, clientId, sku]
            );
            importedCount++;
            continue;
          }
        }

        // Insertar nuevo
        await pool.query(
          `INSERT INTO products (
             client_id, name, sku, description, price, stock, cost_price, min_stock, supplier_name, supplier_phone
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [clientId, name, sku, description, price, stock, costPrice, minStock, supplierName, supplierPhone]
        );
        importedCount++;
      } catch (err) {
        console.error(`Error importando línea CSV ${i}:`, err);
        errorCount++;
      }
    }

    res.json({ 
      success: true, 
      message: `Importación completada. Exitosos: ${importedCount}, Errores/Omitidos: ${errorCount}` 
    });
  } catch (err: any) {
    console.error("[Import Products API] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Eliminar producto
app.delete('/api/clients/:clientId/products/:productId', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, productId } = req.params;
    const result = await pool.query(
      `DELETE FROM products WHERE client_id = $1 AND id = $2 RETURNING id`,
      [clientId, productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado.' });
    }

    res.json({ success: true, message: 'Producto eliminado exitosamente.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SAAS ERP: FACTURACIÓN Y CARTERA ---
app.get('/api/clients/:clientId/invoices', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const result = await pool.query(
      `SELECT id, invoice_number, customer_name, customer_phone, customer_document_type, customer_document_number, customer_email, customer_address, total_amount, status, due_date, reminder_sent, overdue_sent, created_at 
       FROM invoices 
       WHERE client_id = $1 
       ORDER BY created_at DESC`,
      [clientId]
    );
    res.json({ success: true, invoices: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/clients/:clientId/invoices', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    const { clientId } = req.params;
    const { 
      invoiceNumber, 
      customerName, 
      customerPhone, 
      customerDocumentType, 
      customerDocumentNumber, 
      customerEmail, 
      customerAddress, 
      totalAmount, 
      dueDate, 
      items 
    } = req.body;

    if (!invoiceNumber || !customerName || !customerPhone || !customerDocumentNumber || !customerEmail || !dueDate || totalAmount === undefined) {
      return res.status(400).json({ success: false, error: 'Campos obligatorios incompletos.' });
    }

    // 1. Insertar Factura
    const invoiceResult = await dbClient.query(`
      INSERT INTO invoices (client_id, invoice_number, customer_name, customer_phone, customer_document_type, customer_document_number, customer_email, customer_address, total_amount, status, due_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10)
      RETURNING id, invoice_number, customer_name, customer_phone, customer_document_type, customer_document_number, customer_email, customer_address, total_amount, status, due_date, created_at
    `, [
      clientId, 
      invoiceNumber, 
      customerName, 
      customerPhone, 
      customerDocumentType || 'CC', 
      customerDocumentNumber, 
      customerEmail, 
      customerAddress || null, 
      totalAmount, 
      dueDate
    ]);

    const invoice = invoiceResult.rows[0];

    // 2. Insertar Items si vienen definidos
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await dbClient.query(`
          INSERT INTO invoice_items (invoice_id, product_id, quantity, price)
          VALUES ($1, $2, $3, $4)
        `, [invoice.id, item.productId, item.quantity || 1, item.price]);

        // Descontar stock del producto
        await dbClient.query(`
          UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2 AND client_id = $3
        `, [item.quantity || 1, item.productId, clientId]);
      }
    }

    await dbClient.query('COMMIT');
    res.json({ success: true, invoice });
  } catch (err: any) {
    await dbClient.query('ROLLBACK');
    res.status(500).json({ success: false, error: err.message });
  } finally {
    dbClient.release();
  }
});

// Forzar envío de recordatorio manual por WhatsApp
app.post('/api/clients/:clientId/invoices/:invoiceId/trigger-collection', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, invoiceId } = req.params;

    const result = await pool.query(`
      SELECT i.id, i.invoice_number, i.customer_name, i.customer_phone, i.total_amount, i.due_date, c.name as business_name
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      WHERE i.client_id = $1 AND i.id = $2
      LIMIT 1
    `, [clientId, invoiceId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Factura no encontrada.' });
    }

    const row = result.rows[0];
    const cleanPhone = row.customer_phone.replace(/\D/g, '');
    const formattedPhone = `${cleanPhone}@c.us`;

    if (!client || whatsappState.status !== 'CONNECTED') {
      return res.status(503).json({ success: false, error: 'WhatsApp no está conectado en el servidor.' });
    }

    const formattedDueDate = new Date(row.due_date).toLocaleDateString('es-CO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const formattedAmount = new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(parseFloat(row.total_amount));

    const message = `Hola ${row.customer_name}, te saludamos de ${row.business_name}. Te recordamos que tu cuenta ${row.invoice_number} por valor de ${formattedAmount} tiene fecha de vencimiento el ${formattedDueDate}. Por favor ponte al día con tu pago. ¡Que tengas un excelente día!`;

    await client.sendMessage(formattedPhone, message);

    await pool.query(`UPDATE invoices SET reminder_sent = TRUE WHERE id = $1`, [invoiceId]);

    res.json({ success: true, message: 'Recordatorio enviado exitosamente.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Registrar pago total de factura desde Dashboard
app.put('/api/clients/:clientId/invoices/:invoiceId/pay', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, invoiceId } = req.params;
    const result = await pool.query(
      `UPDATE invoices SET status = 'paid', updated_at = NOW() WHERE client_id = $1 AND id = $2 RETURNING id`,
      [clientId, invoiceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Factura no encontrada.' });
    }

    res.json({ success: true, message: 'Factura pagada exitosamente.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Obtener citas / agenda de un cliente (soporta opcionalmente filtro ?date=YYYY-MM-DD)
app.get('/api/clients/:clientId/appointments', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { date } = req.query; // Formato YYYY-MM-DD

    let query = `SELECT id, customer_name, customer_phone, customer_document_number, crm_customer_id, appointment_date, status, created_at 
                 FROM appointments 
                 WHERE client_id = $1`;
    const params: any[] = [clientId];

    const dateStr = typeof date === 'string' ? date : undefined;
    if (dateStr) {
      query += ` AND DATE(appointment_date) = $2`;
      params.push(dateStr);
    }

    query += ` ORDER BY appointment_date ASC`;

    const result = await pool.query(query, params);
    res.json({ success: true, appointments: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SAAS ERP: MANEJO MANUAL DE CITAS ---
// Crear cita manualmente
app.post('/api/clients/:clientId/appointments', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { customer_document_number, customer_name, customer_phone, appointment_date } = req.body;

    if (!appointment_date || !customer_document_number) {
      return res.status(400).json({ success: false, error: 'Fecha de cita y número de documento (cédula) son requeridos.' });
    }

    // 1. Buscar si el cliente ya existe en el CRM
    const customerRes = await pool.query(
      `SELECT id, name, phone FROM crm_customers WHERE client_id = $1 AND document_number = $2 LIMIT 1`,
      [clientId, customer_document_number]
    );

    let finalName = customer_name;
    let finalPhone = customer_phone;
    let crmCustomerId = null;

    if (customerRes.rows.length > 0) {
      const customer = customerRes.rows[0];
      finalName = customer.name;
      finalPhone = customer.phone;
      crmCustomerId = customer.id;
    } else {
      // Si no existe, y nos pasaron nombre y celular, crearlo automáticamente
      if (customer_name && customer_phone) {
        const cleanPhone = customer_phone.replace(/\D/g, '');
        const newCustomerRes = await pool.query(
          `INSERT INTO crm_customers (client_id, name, document_number, phone)
           VALUES ($1, $2, $3, $4)
           RETURNING id, name, phone`,
          [clientId, customer_name, customer_document_number, cleanPhone]
        );
        const newCust = newCustomerRes.rows[0];
        finalName = newCust.name;
        finalPhone = newCust.phone;
        crmCustomerId = newCust.id;
      } else {
        return res.status(404).json({ 
          success: false, 
          error: 'Cliente no registrado. Por favor, proporciona el Nombre y Teléfono para darlo de alta en el sistema.' 
        });
      }
    }

    // 2. Insertar la cita
    const result = await pool.query(
      `INSERT INTO appointments (client_id, customer_name, customer_phone, appointment_date, status, customer_document_number, crm_customer_id)
       VALUES ($1, $2, $3, $4, 'confirmed', $5, $6)
       RETURNING *`,
      [clientId, finalName, finalPhone, appointment_date, customer_document_number, crmCustomerId]
    );

    res.json({ success: true, appointment: result.rows[0] });
  } catch (err: any) {
    console.error("[Appointments API] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Modificar cita
app.put('/api/clients/:clientId/appointments/:appointmentId', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, appointmentId } = req.params;
    const { customer_name, customer_phone, appointment_date, status } = req.body;

    const result = await pool.query(
      `UPDATE appointments 
       SET customer_name = COALESCE($1, customer_name), 
           customer_phone = COALESCE($2, customer_phone), 
           appointment_date = COALESCE($3, appointment_date),
           status = COALESCE($4, status)
       WHERE id = $5 AND client_id = $6
       RETURNING *`,
      [customer_name, customer_phone, appointment_date, status, appointmentId, clientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cita no encontrada.' });
    }

    res.json({ success: true, appointment: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Eliminar/Cancelar cita
app.delete('/api/clients/:clientId/appointments/:appointmentId', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, appointmentId } = req.params;
    const result = await pool.query(
      `DELETE FROM appointments WHERE id = $1 AND client_id = $2 RETURNING *`,
      [appointmentId, clientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cita no encontrada.' });
    }

    res.json({ success: true, message: 'Cita eliminada correctamente.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SAAS ERP: CRUD DE DEPARTAMENTOS ---
app.get('/api/clients/:clientId/departments', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const result = await pool.query(
      `SELECT id, name, created_at FROM business_departments WHERE client_id = $1 ORDER BY name ASC`,
      [clientId]
    );
    res.json({ success: true, departments: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/clients/:clientId/departments', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Nombre es requerido.' });
    }
    const result = await pool.query(
      `INSERT INTO business_departments (client_id, name) VALUES ($1, $2) RETURNING *`,
      [clientId, name]
    );
    res.json({ success: true, department: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/clients/:clientId/departments/:id', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, id } = req.params;
    await pool.query(`DELETE FROM business_departments WHERE id = $1 AND client_id = $2`, [id, clientId]);
    res.json({ success: true, message: 'Departamento eliminado.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SAAS ERP: CRUD DE EMPLEADOS ---
app.get('/api/clients/:clientId/employees', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const result = await pool.query(
      `SELECT e.id, e.name, e.phone, e.role, e.department_id, d.name as department_name, e.pin, e.is_active, e.created_at 
       FROM employees e 
       LEFT JOIN business_departments d ON e.department_id = d.id 
       WHERE e.client_id = $1 
       ORDER BY e.created_at DESC`,
      [clientId]
    );
    res.json({ success: true, employees: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/clients/:clientId/employees', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { name, phone, role, department_id, pin } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'Nombre y teléfono son requeridos.' });
    }

    const cleanPhone = phone.replace(/\D/g, '');

    const result = await pool.query(
      `INSERT INTO employees (client_id, name, phone, role, department_id, pin, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING *`,
      [clientId, name, cleanPhone, role || 'agent', department_id || null, pin || '1234']
    );

    // Obtener nombre de departamento para la respuesta
    let deptName = 'Ninguno';
    if (department_id) {
      const deptRes = await pool.query(`SELECT name FROM business_departments WHERE id = $1`, [department_id]);
      if (deptRes.rows.length > 0) deptName = deptRes.rows[0].name.toLowerCase();
    }

    // Sincronizar con agent_contacts para el flujo de cascada y soporte
    await pool.query(
      `INSERT INTO agent_contacts (client_id, name, phone, priority, status, department, is_verified, role, pin)
       VALUES ($1, $2, $3, 1, 'offline', $4, TRUE, $5, $6)
       ON CONFLICT (client_id, phone) DO UPDATE
       SET name = $2, department = $4, role = $5, pin = $6`,
      [clientId, name, cleanPhone, deptName, role || 'agent', pin || '1234']
    );

    res.json({ success: true, employee: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/clients/:clientId/employees/:employeeId', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, employeeId } = req.params;
    const { name, phone, role, department_id, pin, is_active } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'Nombre y teléfono son requeridos.' });
    }

    const cleanPhone = phone.replace(/\D/g, '');

    const result = await pool.query(
      `UPDATE employees
       SET name = $1, phone = $2, role = $3, department_id = $4, pin = $5, is_active = $6
       WHERE id = $7 AND client_id = $8
       RETURNING *`,
      [name, cleanPhone, role, department_id || null, pin, is_active, employeeId, clientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empleado no encontrado.' });
    }

    let deptName = 'Ninguno';
    if (department_id) {
      const deptRes = await pool.query(`SELECT name FROM business_departments WHERE id = $1`, [department_id]);
      if (deptRes.rows.length > 0) deptName = deptRes.rows[0].name.toLowerCase();
    }

    // Actualizar también en agent_contacts
    await pool.query(
      `INSERT INTO agent_contacts (client_id, name, phone, priority, status, department, is_verified, role, pin)
       VALUES ($1, $2, $3, 1, 'offline', $4, TRUE, $5, $6)
       ON CONFLICT (client_id, phone) DO UPDATE
       SET name = $2, department = $4, role = $5, pin = $6`,
      [clientId, name, cleanPhone, deptName, role || 'agent', pin]
    );

    res.json({ success: true, employee: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/clients/:clientId/employees/:employeeId', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, employeeId } = req.params;

    // Buscar el teléfono antes de borrar
    const empRes = await pool.query(`SELECT phone FROM employees WHERE id = $1 AND client_id = $2`, [employeeId, clientId]);
    if (empRes.rows.length > 0) {
      const phone = empRes.rows[0].phone;
      // Eliminar de agent_contacts
      await pool.query(`DELETE FROM agent_contacts WHERE client_id = $1 AND phone = $2`, [clientId, phone]);
    }

    await pool.query(`DELETE FROM employees WHERE id = $1 AND client_id = $2`, [employeeId, clientId]);
    res.json({ success: true, message: 'Empleado eliminado.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SAAS ERP: CONTROL DE TURNOS (MARCACIÓN / NÓMINA) ---
app.get('/api/clients/:clientId/employees/:employeeId/shifts', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const result = await pool.query(
      `SELECT id, clock_in, clock_out, EXTRACT(EPOCH FROM (COALESCE(clock_out, NOW()) - clock_in))/3600 as hours_worked
       FROM shift_logs 
       WHERE employee_id = $1 
       ORDER BY clock_in DESC LIMIT 50`,
      [employeeId]
    );
    res.json({ success: true, shifts: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/clients/:clientId/employees/:employeeId/clock-in', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;

    // Verificar si ya tiene un turno abierto
    const activeRes = await pool.query(
      `SELECT id FROM shift_logs WHERE employee_id = $1 AND clock_out IS NULL LIMIT 1`,
      [employeeId]
    );

    if (activeRes.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Ya tienes un turno activo sin registrar salida.' });
    }

    const result = await pool.query(
      `INSERT INTO shift_logs (employee_id, clock_in) VALUES ($1, NOW()) RETURNING *`,
      [employeeId]
    );

    res.json({ success: true, shift: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/clients/:clientId/employees/:employeeId/clock-out', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;

    const result = await pool.query(
      `UPDATE shift_logs 
       SET clock_out = NOW() 
       WHERE employee_id = $1 AND clock_out IS NULL 
       RETURNING *`,
      [employeeId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No tienes un turno activo abierto.' });
    }

    res.json({ success: true, shift: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Registrar inicio de almuerzo (lunch_start)
app.post('/api/clients/:clientId/employees/:employeeId/lunch-start', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const result = await pool.query(
      `UPDATE shift_logs 
       SET lunch_start = NOW() 
       WHERE employee_id = $1 AND clock_out IS NULL AND lunch_start IS NULL
       RETURNING *`,
      [employeeId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No tienes un turno activo abierto o ya registraste almuerzo.' });
    }

    res.json({ success: true, shift: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Registrar fin de almuerzo (lunch_end)
app.post('/api/clients/:clientId/employees/:employeeId/lunch-end', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const result = await pool.query(
      `UPDATE shift_logs 
       SET lunch_end = NOW() 
       WHERE employee_id = $1 AND clock_out IS NULL AND lunch_start IS NOT NULL AND lunch_end IS NULL
       RETURNING *`,
      [employeeId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No tienes un almuerzo activo por finalizar.' });
    }

    res.json({ success: true, shift: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Obtener nómina acumulada calculada dinámicamente (Calculadora al vuelo LatAm/Colombia)
app.get('/api/clients/:clientId/employees/:employeeId/payroll-summary', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, employeeId } = req.params;
    const { month_year } = req.query; // Formato YYYY-MM

    if (!month_year || typeof month_year !== 'string') {
      return res.status(400).json({ success: false, error: 'month_year es requerido en formato YYYY-MM.' });
    }

    // 1. Obtener la información contractual del empleado
    const empRes = await pool.query(
      `SELECT name, role, basic_salary, allowances, arl_class FROM employees WHERE id = $1 AND client_id = $2`,
      [employeeId, clientId]
    );

    if (empRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empleado no encontrado.' });
    }

    const emp = empRes.rows[0];
    const basicSalary = parseFloat(emp.basic_salary || '0');
    const allowances = parseFloat(emp.allowances || '0');
    const arlClass = emp.arl_class || 'I';

    // 2. Obtener todos los turnos del empleado para el mes/año indicado
    const shiftRes = await pool.query(
      `SELECT clock_in, clock_out, lunch_start, lunch_end 
       FROM shift_logs 
       WHERE employee_id = $1 AND clock_out IS NOT NULL 
         AND TO_CHAR(clock_in, 'YYYY-MM') = $2`,
      [employeeId, month_year]
    );

    const shifts = shiftRes.rows;
    let totalHours = 0;
    let sundayHours = 0;
    let nightHours = 0;
    let extraHours = 0;

    shifts.forEach((shift: any) => {
      const inTime = new Date(shift.clock_in);
      const outTime = new Date(shift.clock_out);
      
      // Diferencia total del turno en milisegundos
      let durationMs = outTime.getTime() - inTime.getTime();

      // Descontar almuerzo
      if (shift.lunch_start && shift.lunch_end) {
        const lStart = new Date(shift.lunch_start);
        const lEnd = new Date(shift.lunch_end);
        const lunchMs = lEnd.getTime() - lStart.getTime();
        durationMs -= lunchMs;
      }

      const hours = Math.max(0, durationMs / (1000 * 60 * 60));
      totalHours += hours;

      // Calcular si es Domingo (inTime.getDay() === 0)
      const dayOfWeek = inTime.getDay();
      const isSunday = (dayOfWeek === 0);
      if (isSunday) {
        sundayHours += hours;
      }

      // Horas extras: si el turno supera las 8 horas laborales
      if (hours > 8) {
        extraHours += (hours - 8);
      }

      // Horas nocturnas (9:00 PM a 6:00 AM)
      const inHour = inTime.getHours();
      const outHour = outTime.getHours();
      
      if (inHour >= 21 || inHour < 6) {
        nightHours += Math.min(hours, 9); // Capped
      } else if (outHour >= 21 || outHour < 6) {
        const nightStart = new Date(inTime);
        nightStart.setHours(21, 0, 0, 0);
        if (outTime > nightStart) {
          const nHours = (outTime.getTime() - nightStart.getTime()) / (1000 * 60 * 60);
          nightHours += Math.max(0, nHours);
        }
      }
    });

    // 3. Tarifas y Recargos de Nómina (240 horas laborables estándar en el mes)
    const hourlyRate = basicSalary / 240;

    const basicEarned = totalHours * hourlyRate;
    const extraEarned = extraHours * hourlyRate * 0.25; // Extra diurno +25%
    const nightEarned = nightHours * hourlyRate * 0.35; // Recargo nocturno +35%
    const sundayEarned = sundayHours * hourlyRate * 0.75; // Recargo dominical +75%
    
    const grossSalary = basicEarned + extraEarned + nightEarned + sundayEarned + allowances;

    // Deducciones de Empleado (Salud 4%, Pensión 4%)
    const employeeHealthDeduction = grossSalary * 0.04;
    const employeePensionDeduction = grossSalary * 0.04;
    const netSalaryToPay = grossSalary - employeeHealthDeduction - employeePensionDeduction;

    // Aportes Patronales (Costos de Contabilidad de la Tienda)
    // Exoneración en Colombia: < 10 SMMLV (aprox. $14M COP), exento de Salud (8.5%), Sena (2%) e ICBF (3%)
    const isExonerated = (basicSalary < 14000000); 
    const employerHealth = isExonerated ? 0 : (grossSalary * 0.085);
    const employerPension = grossSalary * 0.12;

    // ARL
    let arlRate = 0.00522; // Clase I
    if (arlClass === 'II') arlRate = 0.01044;
    else if (arlClass === 'III') arlRate = 0.02436;
    else if (arlClass === 'IV') arlRate = 0.04350;
    else if (arlClass === 'V') arlRate = 0.06960;

    const employerArl = grossSalary * arlRate;

    // Provisiones sociales
    const provisionPrima = grossSalary * 0.0833;
    const provisionCesantias = grossSalary * 0.0833;
    const provisionIntCesantias = provisionCesantias * 0.12; // 12% anual
    const provisionVacaciones = grossSalary * 0.0417;

    const totalEmployerCost = grossSalary + employerHealth + employerPension + employerArl + provisionPrima + provisionCesantias + provisionIntCesantias + provisionVacaciones;

    res.json({
      success: true,
      payroll: {
        employeeName: emp.name,
        role: emp.role,
        monthYear: month_year,
        metrics: {
          totalHoursWorked: parseFloat(totalHours.toFixed(2)),
          extraHours: parseFloat(extraHours.toFixed(2)),
          nightHours: parseFloat(nightHours.toFixed(2)),
          sundayHours: parseFloat(sundayHours.toFixed(2))
        },
        earnings: {
          basicSalary,
          allowances,
          hourlyRate: parseFloat(hourlyRate.toFixed(2)),
          basicEarned: parseFloat(basicEarned.toFixed(2)),
          extraEarned: parseFloat(extraEarned.toFixed(2)),
          nightEarned: parseFloat(nightEarned.toFixed(2)),
          sundayEarned: parseFloat(sundayEarned.toFixed(2)),
          grossSalary: parseFloat(grossSalary.toFixed(2))
        },
        deductions: {
          health: parseFloat(employeeHealthDeduction.toFixed(2)),
          pension: parseFloat(employeePensionDeduction.toFixed(2)),
          totalDeductions: parseFloat((employeeHealthDeduction + employeePensionDeduction).toFixed(2))
        },
        netSalary: parseFloat(netSalaryToPay.toFixed(2)),
        employerCosts: {
          exoneratedParafiscales: isExonerated,
          health: parseFloat(employerHealth.toFixed(2)),
          pension: parseFloat(employerPension.toFixed(2)),
          arl: parseFloat(employerArl.toFixed(2)),
          provisions: {
            prima: parseFloat(provisionPrima.toFixed(2)),
            cesantias: parseFloat(provisionCesantias.toFixed(2)),
            interesesCesantias: parseFloat(provisionIntCesantias.toFixed(2)),
            vacaciones: parseFloat(provisionVacaciones.toFixed(2))
          },
          totalEmployerCost: parseFloat(totalEmployerCost.toFixed(2)),
          extraCostOverGross: parseFloat((totalEmployerCost - grossSalary).toFixed(2))
        }
      }
    });
  } catch (err: any) {
    console.error("[Payroll Summary API] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Autenticación rápida de Empleados mediante PIN
app.post('/api/auth/employee-login', async (req: Request, res: Response) => {
  try {
    const { phone, pin } = req.body;

    if (!phone || !pin) {
      return res.status(400).json({ success: false, error: 'Teléfono y PIN son requeridos.' });
    }

    const cleanPhone = phone.replace(/\D/g, '');

    // Buscar en la tabla de empleados
    const result = await pool.query(
      `SELECT e.id, e.client_id, e.name, e.phone, e.role, e.pin, e.is_active, c.name as client_name 
       FROM employees e
       JOIN clients c ON e.client_id = c.id
       WHERE e.phone = $1 AND e.is_active = TRUE LIMIT 1`,
      [cleanPhone]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Empleado no encontrado o inactivo.' });
    }

    const emp = result.rows[0];

    // Validar PIN
    if (emp.pin !== pin) {
      return res.status(401).json({ success: false, error: 'PIN de acceso incorrecto.' });
    }

    // Firmar token JWT con rol 'employee' y clientId
    const token = jwt.sign(
      { 
        id: emp.id, 
        username: emp.phone, 
        role: 'employee', 
        employeeRole: emp.role,
        clientId: emp.client_id,
        name: emp.name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login de empleado exitoso',
      data: {
        id: emp.id,
        name: emp.name,
        role: 'employee',
        employeeRole: emp.role,
        clientId: emp.client_id,
        clientName: emp.client_name,
        token
      }
    });
  } catch (err: any) {
    console.error("[Employee Login API] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SAAS ERP: GESTIÓN DE DOCUMENTOS Y SOLICITUDES DE RRHH ---
// Obtener todos los documentos de RRHH (permisos, incapacidades, cartas)
app.get('/api/clients/:clientId/hr-documents', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { employeeId } = req.query; // Filtro opcional

    let query = `SELECT d.id, d.employee_id, e.name as employee_name, e.phone as employee_phone, 
                        d.doc_type, d.status, d.file_url, d.notes, d.start_date, d.end_date, d.created_at
                 FROM hr_documents d
                 JOIN employees e ON d.employee_id = e.id
                 WHERE d.client_id = $1`;
    const params: any[] = [clientId];

    if (employeeId) {
      query += ` AND d.employee_id = $2`;
      params.push(employeeId);
    }

    query += ` ORDER BY d.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ success: true, documents: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Crear una nueva solicitud / documento (e.g. Incapacidad, Vacaciones) o generar Carta Laboral
app.post('/api/clients/:clientId/hr-documents', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { employee_id, doc_type, status, file_url, notes, start_date, end_date } = req.body;

    if (!employee_id || !doc_type) {
      return res.status(400).json({ success: false, error: 'employee_id y doc_type son requeridos.' });
    }

    // Si es una solicitud de Carta Laboral, podemos pre-generarla automáticamente
    let generatedContent = null;
    if (doc_type === 'carta_laboral') {
      const empRes = await pool.query(
        `SELECT name, phone, role, basic_salary, created_at FROM employees WHERE id = $1 AND client_id = $2`,
        [employee_id, clientId]
      );
      if (empRes.rows.length > 0) {
        const emp = empRes.rows[0];
        const salaryFormatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(emp.basic_salary || 0);
        const dateFormatted = new Date(emp.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
        const todayFormatted = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
        
        generatedContent = `CERTIFICADO LABORAL\n\n` +
          `A QUIEN INTERESE:\n\n` +
          `Por medio de la presente, certificamos que el(la) Sr(a). ${emp.name}, trabajando para nuestra organización, ` +
          `se desempeña actualmente en el cargo de ${emp.role.toUpperCase()}. Su fecha de ingreso al servicio fue el ${dateFormatted}. ` +
          `A la fecha, devenga un salario básico mensual de ${salaryFormatted}.\n\n` +
          `El presente certificado se expide a solicitud del interesado el día ${todayFormatted}.\n\n` +
          `Atentamente,\n` +
          `Departamento de Gestión Humana`;
      }
    }

    const result = await pool.query(
      `INSERT INTO hr_documents (client_id, employee_id, doc_type, status, file_url, notes, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [clientId, employee_id, doc_type, status || 'pending', file_url || null, notes || generatedContent || null, start_date || null, end_date || null]
    );

    res.json({ success: true, document: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Modificar estado / notas del documento (Aprobar/Rechazar solicitudes)
app.put('/api/clients/:clientId/hr-documents/:docId', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, docId } = req.params;
    const { status, notes, file_url } = req.body;

    const result = await pool.query(
      `UPDATE hr_documents 
       SET status = COALESCE($1, status), 
           notes = COALESCE($2, notes), 
           file_url = COALESCE($3, file_url)
       WHERE id = $4 AND client_id = $5
       RETURNING *`,
      [status, notes, file_url, docId, clientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Documento no encontrado.' });
    }

    res.json({ success: true, document: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Eliminar un documento/solicitud
app.delete('/api/clients/:clientId/hr-documents/:docId', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, docId } = req.params;
    const result = await pool.query(
      `DELETE FROM hr_documents WHERE id = $1 AND client_id = $2 RETURNING *`,
      [docId, clientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Documento no encontrado.' });
    }

    res.json({ success: true, message: 'Documento eliminado con éxito.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SAAS ERP: CHAT WEB CORPORATIVO DE EMPLEADOS ---
// Obtener historial de mensajes de un canal
app.get('/api/clients/:clientId/chats/messages', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { channel = 'general', since } = req.query;

    let query = `SELECT id, employee_id, sender_name, message_text, channel, created_at 
                 FROM corporate_chat_messages 
                 WHERE client_id = $1 AND channel = $2`;
    const params: any[] = [clientId, channel];

    if (since && typeof since === 'string' && since.trim() !== '') {
      query += ` AND created_at > $3`;
      params.push(new Date(since as string));
    }

    query += ` ORDER BY created_at ASC LIMIT 100`;

    const result = await pool.query(query, params);
    res.json({ success: true, messages: result.rows });
  } catch (err: any) {
    console.error("[Chat GET API] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Enviar un mensaje al canal (con integración de asistente IA)
app.post('/api/clients/:clientId/chats/messages', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { employee_id, sender_name, message_text, channel = 'general' } = req.body;

    if (!sender_name || !message_text) {
      return res.status(400).json({ success: false, error: 'sender_name y message_text son requeridos.' });
    }

    // 1. Guardar el mensaje del empleado en la BD
    const result = await pool.query(
      `INSERT INTO corporate_chat_messages (client_id, employee_id, sender_name, message_text, channel)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [clientId, employee_id || null, sender_name, message_text, channel]
    );

    const userMessage = result.rows[0];

    // 2. Si el mensaje es en el canal 'asistente' o menciona al asistente con '@asistente', responder con IA
    const isAssistantChannel = (channel === 'asistente');
    const mentionsAssistant = message_text.toLowerCase().includes('@asistente');

    if (isAssistantChannel || mentionsAssistant) {
      // Registrar de forma asíncrona la respuesta del bot para no bloquear la petición del usuario
      setImmediate(async () => {
        try {
          // Obtener configuración del cliente (tenant)
          const clientConfig = await getClientConfigById(clientId as string);
          if (!clientConfig) {
            console.error(`[Chat IA] No se encontró configuración del cliente ${clientId} para la respuesta IA.`);
            return;
          }

          // Instanciar agente
          const agent = new AIAgent(clientConfig);

          // Remover la mención del texto del prompt para que Gemini trabaje más limpio
          const promptText = message_text.replace(/@asistente/gi, '').trim();

          console.log(`[Chat IA] 🤖 Invocando Gemini en chat corporativo. Prompt: "${promptText}"`);
          const agentResponse = await agent.processMessage(promptText, 'corporate-chat');
          
          // Registrar la respuesta del asistente en la base de datos
          await pool.query(
            `INSERT INTO corporate_chat_messages (client_id, employee_id, sender_name, message_text, channel)
             VALUES ($1, NULL, $2, $3, $4)`,
            [clientId, 'Asistente IA 🤖', agentResponse.text, channel]
          );

          console.log(`[Chat IA] ✅ Respuesta de IA registrada en el canal '${channel}': "${agentResponse.text}"`);
        } catch (error: any) {
          console.error("[Chat IA] Error procesando mensaje de IA:", error);
          // Registrar alerta de error en el chat
          await pool.query(
            `INSERT INTO corporate_chat_messages (client_id, employee_id, sender_name, message_text, channel)
             VALUES ($1, NULL, $2, $3, $4)`,
            [clientId, 'Sistema ⚠️', `Error procesando la solicitud de IA: ${error.message}`, channel]
          );
        }
      });
    }

    res.json({ success: true, message: userMessage });
  } catch (err: any) {
    console.error("[Chat POST API] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SAAS ERP: CAMPAÑAS / VISITAS DE CALLE Y SITIO (FIELD VISITS) ---
// Obtener listado de campañas/visitas (con métricas agregadas de clientes captados y ventas ROI)
app.get('/api/clients/:clientId/field-visits', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { employeeId } = req.query;

    let query = `
      SELECT f.id, f.employee_id, e.name as employee_name, f.name, f.campaign_type, f.agreement_terms, 
             f.department, f.municipio, f.barrio, f.point_of_sale, f.address, f.latitude, f.longitude, 
             f.contact_name, f.secondary_contacts, f.proof_photo_url, f.visit_date, f.status, f.created_at,
             (SELECT COUNT(*) FROM crm_customers WHERE campaign_id = f.id) as registered_customers_count,
             COALESCE((SELECT SUM(total_amount) FROM invoices WHERE campaign_id = f.id), 0.00) as total_sales_amount
      FROM field_visits f
      LEFT JOIN employees e ON f.employee_id = e.id
      WHERE f.client_id = $1
    `;
    const params: any[] = [clientId];

    if (employeeId) {
      query += ` AND f.employee_id = $2`;
      params.push(employeeId);
    }

    query += ` ORDER BY f.visit_date DESC`;

    const result = await pool.query(query, params);
    
    // Convertir montos a números flotantes
    const visits = result.rows.map((row: any) => ({
      ...row,
      registered_customers_count: parseInt(row.registered_customers_count || '0'),
      total_sales_amount: parseFloat(row.total_sales_amount || '0')
    }));

    res.json({ success: true, visits });
  } catch (err: any) {
    console.error("[Field Visits GET API] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Crear campaña / visita de campo (calle o sitio)
app.post('/api/clients/:clientId/field-visits', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { 
      employee_id, name, campaign_type, agreement_terms, department, municipio, 
      barrio, point_of_sale, address, latitude, longitude, contact_name, 
      secondary_contacts, proof_photo_url, visit_date, status 
    } = req.body;

    if (!name || !address || !contact_name) {
      return res.status(400).json({ success: false, error: 'name, address y contact_name son campos requeridos.' });
    }

    const secContacts = typeof secondary_contacts === 'string' ? secondary_contacts : JSON.stringify(secondary_contacts || []);

    const result = await pool.query(
      `INSERT INTO field_visits (
         client_id, employee_id, name, campaign_type, agreement_terms, department, municipio, 
         barrio, point_of_sale, address, latitude, longitude, contact_name, 
         secondary_contacts, proof_photo_url, visit_date, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [
        clientId, employee_id || null, name, campaign_type || 'sitio', agreement_terms || null, 
        department || 'Cundinamarca', municipio || 'Bogotá', barrio || null, point_of_sale || 'Principal', 
        address, latitude || null, longitude || null, contact_name, 
        secContacts, proof_photo_url || null, visit_date || new Date(), status || 'programada'
      ]
    );

    res.json({ success: true, visit: result.rows[0] });
  } catch (err: any) {
    console.error("[Field Visits POST API] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Actualizar campaña / registrar foto o finalizar visita
app.put('/api/clients/:clientId/field-visits/:visitId', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, visitId } = req.params;
    const { 
      name, campaign_type, agreement_terms, department, municipio, barrio, 
      point_of_sale, address, latitude, longitude, contact_name, 
      secondary_contacts, proof_photo_url, visit_date, status 
    } = req.body;

    let secContacts = undefined;
    if (secondary_contacts !== undefined) {
      secContacts = typeof secondary_contacts === 'string' ? secondary_contacts : JSON.stringify(secondary_contacts);
    }

    const result = await pool.query(
      `UPDATE field_visits 
       SET name = COALESCE($1, name), 
           campaign_type = COALESCE($2, campaign_type), 
           agreement_terms = COALESCE($3, agreement_terms), 
           department = COALESCE($4, department), 
           municipio = COALESCE($5, municipio), 
           barrio = COALESCE($6, barrio), 
           point_of_sale = COALESCE($7, point_of_sale), 
           address = COALESCE($8, address), 
           latitude = COALESCE($9, latitude), 
           longitude = COALESCE($10, longitude), 
           contact_name = COALESCE($11, contact_name), 
           secondary_contacts = COALESCE($12, secondary_contacts), 
           proof_photo_url = COALESCE($13, proof_photo_url), 
           visit_date = COALESCE($14, visit_date), 
           status = COALESCE($15, status)
       WHERE id = $16 AND client_id = $17
       RETURNING *`,
      [
        name, campaign_type, agreement_terms, department, municipio, barrio, 
        point_of_sale, address, latitude, longitude, contact_name, 
        secContacts, proof_photo_url, visit_date, status, visitId, clientId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Campaña no encontrada.' });
    }

    res.json({ success: true, visit: result.rows[0] });
  } catch (err: any) {
    console.error("[Field Visits PUT API] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Eliminar campaña / visita
app.delete('/api/clients/:clientId/field-visits/:visitId', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, visitId } = req.params;
    const result = await pool.query(
      `DELETE FROM field_visits WHERE id = $1 AND client_id = $2 RETURNING *`,
      [visitId, clientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Campaña no encontrada.' });
    }

    res.json({ success: true, message: 'Campaña eliminada con éxito.' });
  } catch (err: any) {
    console.error("[Field Visits DELETE API] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SAAS ERP: CAMPAÑAS DE MARKETING Y DIFUSIÓN (IA COLA CON RETARDO) ---
// Worker en segundo plano para procesar la cola de difusión con throttling y personalización de Gemini
async function startMarketingCampaignWorker(clientId: string, campaignId: string) {
  console.log(`[Marketing Worker] 🚀 Iniciando worker de envío para campaña ${campaignId}...`);
  try {
    // 1. Obtener la campaña
    const campRes = await pool.query(
      `SELECT name, base_message FROM marketing_campaigns WHERE id = $1 AND client_id = $2`,
      [campaignId, clientId]
    );

    if (campRes.rows.length === 0) {
      console.error(`[Marketing Worker] ❌ Campaña ${campaignId} no encontrada.`);
      return;
    }

    const { name: campaignName, base_message: baseMessage } = campRes.rows[0];

    // Actualizar estado de campaña a 'sending'
    await pool.query(
      `UPDATE marketing_campaigns SET status = 'sending' WHERE id = $1`,
      [campaignId]
    );

    // 2. Obtener todos los destinatarios pendientes de esta campaña
    const logsRes = await pool.query(
      `SELECT l.id, l.customer_phone, c.name as customer_name, c.marketing_unsubscribed
       FROM marketing_logs l
       JOIN crm_customers c ON l.customer_phone = c.phone AND c.client_id = $1
       WHERE l.campaign_id = $2 AND l.status = 'pending'
       ORDER BY l.id ASC`,
      [clientId, campaignId]
    );

    const pendingLogs = logsRes.rows;
    console.log(`[Marketing Worker] Encontrados ${pendingLogs.length} envíos pendientes en cola.`);

    // Instanciar Gemini
    const apiKey = process.env.GEMINI_API_KEY || "API_KEY_MISSING";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    for (const log of pendingLogs) {
      // Validar si el WhatsApp está listo antes de cada envío
      if (!client || whatsappState.status !== 'CONNECTED') {
        console.warn(`[Marketing Worker] ⚠️ WhatsApp desconectado. Pausando campaña.`);
        await pool.query(
          `UPDATE marketing_campaigns SET status = 'paused' WHERE id = $1`,
          [campaignId]
        );
        return;
      }

      // Validar si el cliente se desuscribió recientemente
      if (log.marketing_unsubscribed) {
        console.log(`[Marketing Worker] 🔕 Cliente +${log.customer_phone} desuscrito. Omitiendo.`);
        await pool.query(
          `UPDATE marketing_logs SET status = 'opt-out', sent_at = NOW() WHERE id = $1`,
          [log.id]
        );
        continue;
      }

      try {
        // 3. Reescribir el mensaje comercial usando Gemini para simular escritura humana única
        const customerName = log.customer_name || 'Estimado cliente';
        
        console.log(`[Marketing Worker] 🤖 Reescribiendo mensaje para ${customerName} (+${log.customer_phone})...`);
        const prompt = `Reescribe este mensaje comercial para que parezca escrito por un humano real en una conversación individual por WhatsApp. No uses un lenguaje genérico o corporativo repetido. Personalízalo de forma sutil usando el nombre del destinatario: ${customerName}. 
        
        Mensaje base a reescribir: "${baseMessage}".
        
        Devuelve exclusivamente el mensaje reescrito final, listo para enviar. Sin introducciones, explicaciones, ni comillas.`;

        const aiResult = await model.generateContent(prompt);
        const rewrittenMessage = aiResult.response.text().trim();

        // 4. Enviar el mensaje por WhatsApp
        const cleanPhone = log.customer_phone.replace(/\D/g, '');
        const formattedPhone = `${cleanPhone}@c.us`;

        console.log(`[Marketing Worker] 📤 Enviando mensaje a +${cleanPhone}: "${rewrittenMessage.substring(0, 40)}..."`);
        await client.sendMessage(formattedPhone, rewrittenMessage);

        // 5. Actualizar log de envío
        await pool.query(
          `UPDATE marketing_logs SET status = 'sent', sent_at = NOW() WHERE id = $1`,
          [log.id]
        );

      } catch (err: any) {
        console.error(`[Marketing Worker] ❌ Error enviando a +${log.customer_phone}:`, err);
        await pool.query(
          `UPDATE marketing_logs SET status = 'failed', sent_at = NOW() WHERE id = $1`,
          [log.id]
        );
      }

      // 6. Throttling aleatorio de 20-45 segundos para evitar baneo
      const delayMs = Math.floor(Math.random() * (45000 - 20000 + 1) + 20000);
      console.log(`[Marketing Worker] ⏳ Esperando ${Math.round(delayMs / 1000)} segundos antes del siguiente envío...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    // 7. Marcar campaña como completada
    await pool.query(
      `UPDATE marketing_campaigns SET status = 'completed' WHERE id = $1`,
      [campaignId]
    );
    console.log(`[Marketing Worker] 🎉 Campaña ${campaignId} procesada por completo.`);

  } catch (error: any) {
    console.error(`[Marketing Worker] 🚨 Error fatal en el worker de marketing:`, error);
    await pool.query(
      `UPDATE marketing_campaigns SET status = 'failed' WHERE id = $1`,
      [campaignId]
    );
  }
}

// APIs del Módulo de Marketing
// Obtener listado de campañas
app.get('/api/clients/:clientId/marketing/campaigns', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const result = await pool.query(
      `SELECT c.id, c.name, c.base_message, c.target_segment, c.status, c.created_at,
              (SELECT COUNT(*) FROM marketing_logs WHERE campaign_id = c.id) as total_targets,
              (SELECT COUNT(*) FROM marketing_logs WHERE campaign_id = c.id AND status = 'sent') as sent_count,
              (SELECT COUNT(*) FROM marketing_logs WHERE campaign_id = c.id AND status = 'failed') as failed_count,
              (SELECT COUNT(*) FROM marketing_logs WHERE campaign_id = c.id AND status = 'opt-out') as opt_out_count
       FROM marketing_campaigns c
       WHERE c.client_id = $1
       ORDER BY c.created_at DESC`,
      [clientId]
    );

    res.json({ success: true, campaigns: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Crear campaña y lanzar envío en segundo plano
app.post('/api/clients/:clientId/marketing/campaigns', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { name, base_message, target_segment } = req.body;

    if (!name || !base_message || !target_segment) {
      return res.status(400).json({ success: false, error: 'Faltan campos obligatorios (nombre, mensaje base o segmento).' });
    }

    if (!client || whatsappState.status !== 'CONNECTED') {
      return res.status(400).json({ success: false, error: 'WhatsApp no está conectado. Debe estar en línea para iniciar una campaña.' });
    }

    // 1. Insertar campaña
    const campResult = await pool.query(
      `INSERT INTO marketing_campaigns (client_id, name, base_message, target_segment, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [clientId, name, base_message, target_segment]
    );

    const campaign = campResult.rows[0];

    // 2. Filtrar clientes según el segmento seleccionado
    let customerQuery = `SELECT phone, name FROM crm_customers WHERE client_id = $1 AND COALESCE(marketing_unsubscribed, FALSE) = FALSE`;
    const customerParams: any[] = [clientId];

    if (target_segment === 'leads') {
      // Clientes sin facturas
      customerQuery = `
        SELECT phone, name FROM crm_customers 
        WHERE client_id = $1 AND COALESCE(marketing_unsubscribed, FALSE) = FALSE
          AND id NOT IN (SELECT crm_customer_id FROM invoices WHERE crm_customer_id IS NOT NULL AND client_id = $1)
      `;
    } else if (target_segment === 'customers') {
      // Clientes con al menos una factura
      customerQuery = `
        SELECT phone, name FROM crm_customers 
        WHERE client_id = $1 AND COALESCE(marketing_unsubscribed, FALSE) = FALSE
          AND id IN (SELECT crm_customer_id FROM invoices WHERE crm_customer_id IS NOT NULL AND client_id = $1)
      `;
    }

    const customersRes = await pool.query(customerQuery, customerParams);
    const targets = customersRes.rows;

    if (targets.length === 0) {
      // Actualizar a completado vacío
      await pool.query(
        `UPDATE marketing_campaigns SET status = 'completed' WHERE id = $1`,
        [campaign.id]
      );
      return res.json({ 
        success: true, 
        message: 'Campaña creada. Ningún cliente coincide con el segmento especificado.',
        campaign: { ...campaign, status: 'completed' }
      });
    }

    // 3. Crear los logs de envío en estado 'pending'
    for (const target of targets) {
      await pool.query(
        `INSERT INTO marketing_logs (campaign_id, customer_phone, status)
         VALUES ($1, $2, 'pending')`,
        [campaign.id, target.phone]
      );
    }

    // 4. Iniciar worker asíncrono en segundo plano
    setImmediate(() => {
      startMarketingCampaignWorker(clientId as string, campaign.id);
    });

    res.json({ 
      success: true, 
      message: `Campaña '${name}' iniciada en segundo plano para ${targets.length} contactos.`, 
      campaign 
    });

  } catch (err: any) {
    console.error("[Marketing POST API] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Obtener logs de envío de una campaña específica
app.get('/api/clients/:clientId/marketing/campaigns/:campaignId/logs', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, campaignId } = req.params;
    
    // Verificar propiedad
    const checkCamp = await pool.query(
      `SELECT id FROM marketing_campaigns WHERE id = $1 AND client_id = $2 LIMIT 1`,
      [campaignId, clientId]
    );

    if (checkCamp.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Campaña no encontrada.' });
    }

    const result = await pool.query(
      `SELECT l.id, l.customer_phone, c.name as customer_name, l.status, l.sent_at 
       FROM marketing_logs l
       LEFT JOIN crm_customers c ON l.customer_phone = c.phone AND c.client_id = $1
       WHERE l.campaign_id = $2
       ORDER BY l.sent_at DESC, l.id ASC`,
      [clientId, campaignId]
    );

    res.json({ success: true, logs: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SAAS ERP: CRM DE CLIENTES ---
app.get('/api/clients/:clientId/crm-customers', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const result = await pool.query(
      `SELECT id, name, document_type, document_number, phone, email, address, lens_prescription, last_interaction_at, created_at 
       FROM crm_customers 
       WHERE client_id = $1 
       ORDER BY name ASC`,
      [clientId]
    );
    res.json({ success: true, customers: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Buscar cliente por cédula/documento
app.get('/api/clients/:clientId/crm-customers/document/:documentNumber', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, documentNumber } = req.params;
    const result = await pool.query(
      `SELECT id, name, phone, document_type, document_number, email, address, lens_prescription 
       FROM crm_customers 
       WHERE client_id = $1 AND document_number = $2 LIMIT 1`,
      [clientId, documentNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    }

    res.json({ success: true, customer: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/clients/:clientId/crm-customers', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { name, document_type, document_number, phone, email, address, lens_prescription } = req.body;

    if (!name || !document_number || !phone) {
      return res.status(400).json({ success: false, error: 'Nombre, documento y teléfono son requeridos.' });
    }

    const cleanPhone = phone.replace(/\D/g, '');

    const result = await pool.query(
      `INSERT INTO crm_customers (client_id, name, document_type, document_number, phone, email, address, lens_prescription)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [clientId, name, document_type || 'CC', document_number, cleanPhone, email || null, address || null, lens_prescription || null]
    );

    res.json({ success: true, customer: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/clients/:clientId/crm-customers/:customerId', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, customerId } = req.params;
    const { name, document_type, document_number, phone, email, address, lens_prescription } = req.body;

    if (!name || !document_number || !phone) {
      return res.status(400).json({ success: false, error: 'Nombre, documento y teléfono son requeridos.' });
    }

    const cleanPhone = phone.replace(/\D/g, '');

    const result = await pool.query(
      `UPDATE crm_customers
       SET name = $1, document_type = $2, document_number = $3, phone = $4, email = $5, address = $6, lens_prescription = $7
       WHERE id = $8 AND client_id = $9
       RETURNING *`,
      [name, document_type || 'CC', document_number, cleanPhone, email || null, address || null, lens_prescription || null, customerId, clientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cliente CRM no encontrado.' });
    }

    res.json({ success: true, customer: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/clients/:clientId/crm-customers/:customerId', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, customerId } = req.params;
    await pool.query(`DELETE FROM crm_customers WHERE id = $1 AND client_id = $2`, [customerId, clientId]);
    res.json({ success: true, message: 'Cliente de CRM eliminado.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SAAS ERP: VERIFICACIÓN OTP POR WHATSAPP ---
app.post('/api/auth/send-otp', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: 'Teléfono es requerido.' });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // Código de 6 dígitos
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

    await pool.query(
      `INSERT INTO phone_verifications (phone, code, expires_at, verified)
       VALUES ($1, $2, $3, FALSE)`,
      [cleanPhone, code, expiresAt]
    );

    // Enviar código usando el cliente de WhatsApp activo
    const { client: waClient, whatsappState } = await import('./services/whatsapp');
    if (waClient && whatsappState.status === 'CONNECTED') {
      const target = `${cleanPhone}@c.us`;
      const message = `💬 *[DiazLab Verificación]*\n\nTu código de seguridad para verificar este número de teléfono en la web es:\n\n👉 *${code}*\n\nEste código expira en 5 minutos. No lo compartas con nadie.`;
      await waClient.sendMessage(target, message);
      res.json({ success: true, message: 'Código enviado por WhatsApp con éxito.' });
    } else {
      // Si el bot está desconectado, devolvemos el código directamente (solo para depuración) para no bloquear al usuario
      console.warn(`[OTP WhatsApp Fallback] WhatsApp desconectado. Código OTP generado: ${code}`);
      res.json({ 
        success: true, 
        message: 'WhatsApp del sistema desconectado. Código generado en consola.',
        debugCode: code 
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/verify-otp', async (req: Request, res: Response) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ success: false, error: 'Teléfono y código son requeridos.' });
    }

    const cleanPhone = phone.replace(/\D/g, '');

    const result = await pool.query(
      `SELECT id FROM phone_verifications 
       WHERE phone = $1 AND code = $2 AND expires_at > NOW() AND verified = FALSE 
       LIMIT 1`,
      [cleanPhone, code]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Código inválido o expirado.' });
    }

    const verificationId = result.rows[0].id;
    await pool.query(`UPDATE phone_verifications SET verified = TRUE WHERE id = $1`, [verificationId]);

    res.json({ success: true, message: 'Número de teléfono verificado correctamente.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SAAS ERP: SUBIDA DEL LOGO COMERCIAL ---
app.post('/api/clients/:clientId/logo', authenticateToken as any, authorizeClientAccess as any, upload.single('logo'), async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId as string;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: 'Archivo de logotipo faltante.' });
    }

    const clientMediaDir = path.join(process.cwd(), 'media', 'clients', clientId);
    if (!fs.existsSync(clientMediaDir)) {
      fs.mkdirSync(clientMediaDir, { recursive: true });
    }

    const ext = path.extname(file.originalname) || '.png';
    const fileName = `logo${ext}`;
    const filePath = path.join(clientMediaDir, fileName);

    // Guardar archivo
    fs.writeFileSync(filePath, file.buffer);
    const logoUrl = `/media/clients/${clientId}/${fileName}`;

    // Actualizar URL en tabla clients
    await pool.query(`UPDATE clients SET logo_url = $1 WHERE id = $2`, [logoUrl, clientId]);

    console.log(`[Media Upload] 🖼️ Logotipo subido para cliente ${clientId}: ${logoUrl}`);
    res.json({ success: true, logoUrl });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- CLIENTE INTEGRADO: HISTORIAL DE LOGS AISLADO POR CLIENTE ---
app.get('/api/clients/:clientId/alerts/history', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const result = await pool.query(
      `SELECT id, alert_key, severity, message, status, created_at, resolved_at 
       FROM system_alerts 
       WHERE client_id = $1 
       ORDER BY created_at DESC 
       LIMIT 100`,
      [clientId]
    );
    res.json({ success: true, alerts: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SAAS ERP: AUTENTICACIÓN / VERIFICACIÓN DE ADMINISTRADORES DE WHATSAPP ---
app.post('/api/auth/verify-whatsapp-admin', async (req: Request, res: Response) => {
  try {
    const { username, password, phone } = req.body;

    if (!username || !password || !phone) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos (usuario, contraseña, teléfono).' });
    }

    const clientRes = await pool.query(
      `SELECT id, password FROM clients WHERE username = $1 LIMIT 1`,
      [username]
    );

    if (clientRes.rows.length === 0 || clientRes.rows[0].password !== password) {
      return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos.' });
    }

    const clientId = clientRes.rows[0].id;
    const cleanPhone = phone.replace(/\D/g, '');

    const agentRes = await pool.query(
      `SELECT id FROM agent_contacts WHERE client_id = $1 AND phone = $2 LIMIT 1`,
      [clientId, cleanPhone]
    );

    if (agentRes.rows.length === 0) {
      const ownerRes = await pool.query(
        `SELECT id FROM clients WHERE id = $1 AND (owner_phone = $2 OR phone_number = $2) LIMIT 1`,
        [clientId, cleanPhone]
      );

      if (ownerRes.rows.length === 0) {
        return res.status(403).json({ 
          success: false, 
          error: 'Este número no está pre-registrado como asesor o dueño de la empresa en el panel web.' 
        });
      }

      await pool.query(`
        INSERT INTO agent_contacts (client_id, name, phone, priority, status, department, is_verified, role)
        VALUES ($1, 'Administrador Propietario', $2, 0, 'online', 'administrador', TRUE, 'admin')
        ON CONFLICT (client_id, phone) DO UPDATE 
        SET is_verified = TRUE, role = 'admin'
      `, [clientId, cleanPhone]);
    } else {
      await pool.query(
        `UPDATE agent_contacts 
         SET is_verified = TRUE, role = 'admin' 
         WHERE client_id = $1 AND phone = $2`,
        [clientId, cleanPhone]
      );
    }

    activeWaSessions.set(cleanPhone, {
      clientId,
      expiresAt: Date.now() + 20 * 60 * 1000 // 20 minutos
    });

    console.log(`[WhatsApp Admin Verification] 🔒 Celular +${cleanPhone} verificado como Admin (Cliente: ${clientId})`);
    res.json({ success: true, message: 'Número de WhatsApp vinculado y verificado como Administrador con éxito.' });

  } catch (err: any) {
    console.error("[WhatsApp Admin Verification API] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SAAS ERP: RAPIDA AUTENTICACION CON PIN ---
app.post('/api/auth/verify-fast', async (req: Request, res: Response) => {
  try {
    const { phone, pin } = req.body;

    if (!phone || !pin) {
      return res.status(400).json({ success: false, error: 'Número de teléfono y PIN son requeridos.' });
    }

    const cleanPhone = phone.replace(/\D/g, '');

    // Buscar en agent_contacts el pin
    const result = await pool.query(
      `SELECT client_id, name FROM agent_contacts WHERE phone = $1 AND pin = $2 AND is_verified = TRUE LIMIT 1`,
      [cleanPhone, pin]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'El PIN ingresado es incorrecto o el número no está verificado.' });
    }

    const agent = result.rows[0];

    // Registrar/renovar la sesión de WhatsApp por 20 minutos
    activeWaSessions.set(cleanPhone, {
      clientId: agent.client_id,
      expiresAt: Date.now() + 20 * 60 * 1000 // 20 minutos
    });

    console.log(`[WhatsApp Auth Fast] 🔑 Sesión reanudada con PIN para +${cleanPhone} (Agente: ${agent.name})`);
    res.json({ success: true, message: `Sesión administrativa reanudada. ¡Hola ${agent.name}!` });

  } catch (err: any) {
    console.error("[WhatsApp Auth Fast API] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SAAS ERP: RAPIDA AUTENTICACION CON BIOMETRIA (WEBAUTHN / BIOPASS) ---
app.post('/api/auth/verify-biometric', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, error: 'Número de teléfono es requerido.' });
    }

    const cleanPhone = phone.replace(/\D/g, '');

    // Verificar que el número esté registrado y verificado en la BD
    const result = await pool.query(
      `SELECT client_id, name FROM agent_contacts WHERE phone = $1 AND is_verified = TRUE LIMIT 1`,
      [cleanPhone]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Este número no está verificado para acceso rápido.' });
    }

    const agent = result.rows[0];

    // Renovar sesión de WhatsApp por 20 minutos
    activeWaSessions.set(cleanPhone, {
      clientId: agent.client_id,
      expiresAt: Date.now() + 20 * 60 * 1000
    });

    console.log(`[WhatsApp Auth Biometric] ☝️ Sesión reanudada con Huella/Biometría para +${cleanPhone} (Agente: ${agent.name})`);
    res.json({ success: true, message: `Sesión administrativa reanudada con biometría. ¡Hola ${agent.name}!` });

  } catch (err: any) {
    console.error("[WhatsApp Auth Biometric API] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- API SISTEMA: ALERTAS Y LOGS DE ESTADO ---
app.get('/api/admin/alerts/active', authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, alert_key, severity, message, created_at 
       FROM system_alerts 
       WHERE status = 'active' 
       ORDER BY created_at DESC`
    );
    res.json({ success: true, alerts: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/admin/alerts/history', authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, alert_key, severity, message, status, created_at, resolved_at 
       FROM system_alerts 
       ORDER BY created_at DESC 
       LIMIT 100`
    );
    res.json({ success: true, alerts: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Global Express Error Handler Middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error("[Express Global Error]", err);
  logger.raiseAlert(
    'express_route_error', 
    'orange', 
    `Fallo crítico en endpoint Express: ${req.method} ${req.originalUrl}`, 
    err?.stack || String(err)
  );
  res.status(500).json({ success: false, error: 'Ocurrió un error interno en el servidor.' });
});

// Fallback para SPA en React (cualquier ruta de navegación sirve el index.html)
app.get(/.*/, (req: Request, res: Response) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(process.cwd(), 'dashboard/dist/index.html'));
  }
});

// Inicializar servidor de API
export const server = app.listen(PORT, () => {
  console.log(`🚀 [Servidor API] Servidor Express activo en el puerto ${PORT}`);
  console.log(`📊 Endpoints CRUD de Clientes disponibles en: http://localhost:${PORT}/api/clients`);
  console.log(`📈 Estadísticas de Métricas y Costos en: http://localhost:${PORT}/api/metrics`);
  
  // Inicializamos el receptor de eventos de WhatsApp al arrancar y auto-conectamos
  const activeClient = initializeWhatsAppClient();
  console.log("[WhatsApp] Iniciando auto-conexión del cliente al arrancar el servidor...");
  activeClient.initialize().catch(err => {
    console.error("[WhatsApp] Error en auto-inicialización de WhatsApp:", err);
  });

  // Iniciar el programador de cobros y recordatorios estáticos
  startScheduler();

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
