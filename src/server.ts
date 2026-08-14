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
      contact_name,
      category
    } = req.body;

    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Faltan campos obligatorios: name' 
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
      phone_number: phone_number || null, 
      system_prompt: finalPrompt, 
      active_tools: active_tools || [], 
      agent_phone: agent_phone || null,
      drive_folder_id: finalDriveFolderId,
      username: username || null,
      password: password || null,
      email: email || null,
      contact_name: contact_name || null,
      is_activated: true,
      category: category || 'optica'
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
    const parentDir = path.join(process.cwd(), 'media', 'clients', clientId);
    const clientMediaDir = path.join(parentDir, 'audios');
    
    // Crear directorio de audios si no existe
    if (!fs.existsSync(clientMediaDir)) {
      fs.mkdirSync(clientMediaDir, { recursive: true });
    }

    // Migración automática: Mover audios de la carpeta padre a la subcarpeta /audios/
    if (fs.existsSync(parentDir)) {
      const parentFiles = fs.readdirSync(parentDir);
      for (const file of parentFiles) {
        const fullPath = path.join(parentDir, file);
        const stats = fs.statSync(fullPath);
        if (stats.isFile()) {
          const ext = path.extname(file).toLowerCase();
          if (['.mp3', '.ogg', '.wav', '.m4a'].includes(ext) && !file.toLowerCase().startsWith('logo')) {
            fs.renameSync(fullPath, path.join(clientMediaDir, file));
            console.log(`[Media Migration] Migrado audio anterior ${file} a la subcarpeta /audios/`);
          }
        }
      }
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
        url: `/media/clients/${clientId}/audios/${file}`
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

    const clientMediaDir = path.join(process.cwd(), 'media', 'clients', clientId, 'audios');
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
    const filePath = path.join(process.cwd(), 'media', 'clients', clientId, 'audios', fileName);

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

// Registro público de inquilinos (tiendas)
app.post('/api/auth/register-client', async (req: Request, res: Response) => {
  try {
    const { contact_name, username, password, phone_number, email } = req.body;

    if (!contact_name || !username || !password || !phone_number) {
      return res.status(400).json({ success: false, error: 'Faltan campos obligatorios para el registro.' });
    }

    const cleanPhone = phone_number.replace(/\D/g, '');

    // Verificar si el usuario ya existe
    const userCheck = await pool.query("SELECT id FROM clients WHERE username = $1 LIMIT 1", [username]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'El nombre de usuario ya está registrado.' });
    }

    // Verificar si el teléfono ya existe
    const phoneCheck = await pool.query("SELECT id FROM clients WHERE phone_number = $1 LIMIT 1", [cleanPhone]);
    if (phoneCheck.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'El número de teléfono ya está registrado.' });
    }

    const clientId = 'client_' + Math.random().toString(36).substring(2, 10);
    
    // Crear el inquilino en estado 'pending' (onboarding incompleto)
    await pool.query(`
      INSERT INTO clients (
        id, name, phone_number, system_prompt, status, 
        username, password, email, contact_name, is_activated, category
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      clientId,
      'pending', // Se configurará en el onboarding
      cleanPhone,
      'Eres un asistente de IA.',
      'active',
      username,
      password,
      email || null,
      contact_name,
      true, // Auto-activado
      'optica' // Categoría por defecto
    ]);

    res.json({ success: true, message: 'Registro exitoso. Inicia sesión para registrar tu negocio.', data: { clientId } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Onboarding de negocio para inquilinos nuevos
app.post('/api/clients/:clientId/register-business', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { name, category } = req.body;

    if (!name || !category) {
      return res.status(400).json({ success: false, error: 'Falta nombre o categoría del negocio.' });
    }

    // Generar la carpeta de Google Drive automáticamente
    let driveFolderId = null;
    try {
      driveFolderId = await createClientFolder(name);
    } catch (driveErr: any) {
      console.error(`[Onboarding] ⚠️ No se pudo crear la carpeta de Google Drive:`, driveErr.message);
    }

    const systemPrompt = `Eres un asistente de IA amable y servicial para la empresa ${name}.`;

    await pool.query(`
      UPDATE clients 
      SET name = $1, category = $2, drive_folder_id = $3, system_prompt = $4
      WHERE id = $5
    `, [name, category, driveFolderId, systemPrompt, clientId]);

    res.json({ success: true, message: 'Negocio registrado e inicializado con éxito.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Actualizar perfil comercial y tributario de la tienda
app.put('/api/clients/:clientId/profile-settings', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { nit, address, phone_number, email, invoice_footer } = req.body;

    await pool.query(`
      UPDATE clients 
      SET nit = $1, address = $2, phone_number = $3, email = $4, invoice_footer = $5
      WHERE id = $6
    `, [nit || null, address || null, phone_number || null, email || null, invoice_footer || null, clientId]);

    res.json({ success: true, message: 'Configuración comercial de la tienda guardada con éxito.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
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
// Obtener todos los productos (con columnas de costo, alarmas de stock y descuentos promocionales)
app.get('/api/clients/:clientId/products', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const result = await pool.query(
      `SELECT id, name, sku, description, price, stock, cost_price, min_stock, supplier_name, supplier_phone, brand, material, style, color, promo_discount, category_id, created_at 
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
      `SELECT id, name, sku, description, price, stock, cost_price, min_stock, supplier_name, supplier_phone, brand, material, style, color, promo_discount 
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
      `SELECT id, name, sku, stock, min_stock, supplier_name, supplier_phone, promo_discount 
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
    const { name, sku, description, price, stock, cost_price, min_stock, supplier_name, supplier_phone, brand, material, style, color, promo_discount, category_id } = req.body;

    if (!name || price === undefined || stock === undefined) {
      return res.status(400).json({ success: false, error: 'Nombre, precio y stock son requeridos.' });
    }

    const result = await pool.query(
      `INSERT INTO products (
         client_id, name, sku, description, price, stock, cost_price, min_stock, supplier_name, supplier_phone, brand, material, style, color, promo_discount, category_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
       RETURNING id, name, sku, description, price, stock, cost_price, min_stock, supplier_name, supplier_phone, brand, material, style, color, promo_discount, category_id, created_at`,
      [
        clientId, name, sku || null, description || null, price, stock, 
        cost_price || 0.00, min_stock || 5, supplier_name || null, supplier_phone || null,
        brand || null, material || null, style || null, color || null, promo_discount || 0.00,
        category_id || null
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
    const { name, sku, description, price, stock, cost_price, min_stock, supplier_name, supplier_phone, brand, material, style, color, promo_discount, category_id } = req.body;

    if (!name || price === undefined || stock === undefined) {
      return res.status(400).json({ success: false, error: 'Nombre, precio y stock son requeridos.' });
    }

    const result = await pool.query(
      `UPDATE products 
       SET name = $1, sku = $2, description = $3, price = $4, stock = $5, 
           cost_price = $6, min_stock = $7, supplier_name = $8, supplier_phone = $9,
           brand = $10, material = $11, style = $12, color = $13, promo_discount = $14,
           category_id = $15
       WHERE client_id = $16 AND id = $17 
       RETURNING id, name, sku, description, price, stock, cost_price, min_stock, supplier_name, supplier_phone, brand, material, style, color, promo_discount, category_id, created_at`,
      [
        name, sku || null, description || null, price, stock, 
        cost_price || 0.00, min_stock || 5, supplier_name || null, supplier_phone || null, 
        brand || null, material || null, style || null, color || null, promo_discount || 0.00,
        category_id || null, clientId, productId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado.' });
    }

    const updatedProd = result.rows[0];
    if (updatedProd.stock > updatedProd.min_stock) {
      // Resolver alerta si existía activa
      await logger.resolveAlert(
        `stock_low_${productId}`, 
        `El stock del producto "${updatedProd.name}" se ha restablecido a ${updatedProd.stock} unidades (Mínimo: ${updatedProd.min_stock}).`, 
        clientId as string
      );
    } else {
      // Si el stock configurado sigue siendo crítico, levantar/actualizar alerta
      await logger.raiseAlert(
        `stock_low_${productId}`, 
        'orange', 
        `El producto "${updatedProd.name}" tiene stock crítico de ${updatedProd.stock} unidades (Mínimo: ${updatedProd.min_stock}).`,
        `ID: ${productId} | Stock actual: ${updatedProd.stock} | Mínimo: ${updatedProd.min_stock}`,
        clientId as string
      );
    }

    res.json({ success: true, product: updatedProd });
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

// --- SAAS ERP: CATEGORÍAS DE PRODUCTOS ---
app.get('/api/clients/:clientId/categories', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const result = await pool.query(
      `SELECT id, name, created_at FROM product_categories WHERE client_id = $1 ORDER BY name ASC`,
      [clientId]
    );
    res.json({ success: true, categories: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/clients/:clientId/categories', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'El nombre de la categoría es requerido.' });
    }
    const result = await pool.query(
      `INSERT INTO product_categories (client_id, name) VALUES ($1, $2) RETURNING id, name, created_at`,
      [clientId, name.trim()]
    );
    res.json({ success: true, category: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/clients/:clientId/categories/:id', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, id } = req.params;
    const result = await pool.query(
      `DELETE FROM product_categories WHERE client_id = $1 AND id = $2 RETURNING id`,
      [clientId, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Categoría no encontrada.' });
    }
    res.json({ success: true, message: 'Categoría eliminada exitosamente.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SAAS ERP: PROVEEDORES ---
app.get('/api/clients/:clientId/suppliers', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const result = await pool.query(
      `SELECT s.id, s.name, s.phone, s.email, s.address, s.contact_name, s.is_laboratory, s.created_at,
              COALESCE(
                json_agg(
                  json_build_object('id', pc.id, 'name', pc.name)
                ) FILTER (WHERE pc.id IS NOT NULL), 
                '[]'
              ) as categories
       FROM suppliers s
       LEFT JOIN supplier_categories sc ON s.id = sc.supplier_id
       LEFT JOIN product_categories pc ON sc.category_id = pc.id
       WHERE s.client_id = $1
       GROUP BY s.id
       ORDER BY s.name ASC`,
      [clientId]
    );
    res.json({ success: true, suppliers: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/clients/:clientId/suppliers', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    const { clientId } = req.params;
    const { name, phone, email, address, contact_name, is_laboratory, category_ids } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'El nombre del proveedor es requerido.' });
    }

    const supplierResult = await dbClient.query(
      `INSERT INTO suppliers (client_id, name, phone, email, address, contact_name, is_laboratory)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, phone, email, address, contact_name, is_laboratory, created_at`,
      [clientId, name.trim(), phone || null, email || null, address || null, contact_name || null, is_laboratory === true]
    );
    const newSupplier = supplierResult.rows[0];

    if (category_ids && Array.isArray(category_ids) && category_ids.length > 0) {
      for (const catId of category_ids) {
        await dbClient.query(
          `INSERT INTO supplier_categories (supplier_id, category_id) VALUES ($1, $2)`,
          [newSupplier.id, catId]
        );
      }
    }

    await dbClient.query('COMMIT');
    res.json({ success: true, supplier: newSupplier });
  } catch (err: any) {
    await dbClient.query('ROLLBACK');
    res.status(500).json({ success: false, error: err.message });
  } finally {
    dbClient.release();
  }
});

app.put('/api/clients/:clientId/suppliers/:id', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    const { clientId, id } = req.params;
    const { name, phone, email, address, contact_name, is_laboratory, category_ids } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'El nombre del proveedor es requerido.' });
    }

    const supplierResult = await dbClient.query(
      `UPDATE suppliers 
       SET name = $1, phone = $2, email = $3, address = $4, contact_name = $5, is_laboratory = $6
       WHERE client_id = $7 AND id = $8
       RETURNING id, name, phone, email, address, contact_name, is_laboratory, created_at`,
      [name.trim(), phone || null, email || null, address || null, contact_name || null, is_laboratory === true, clientId, id]
    );

    if (supplierResult.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Proveedor no encontrado.' });
    }

    await dbClient.query(`DELETE FROM supplier_categories WHERE supplier_id = $1`, [id]);

    if (category_ids && Array.isArray(category_ids) && category_ids.length > 0) {
      for (const catId of category_ids) {
        await dbClient.query(
          `INSERT INTO supplier_categories (supplier_id, category_id) VALUES ($1, $2)`,
          [id, catId]
        );
      }
    }

    await dbClient.query('COMMIT');
    res.json({ success: true, supplier: supplierResult.rows[0] });
  } catch (err: any) {
    await dbClient.query('ROLLBACK');
    res.status(500).json({ success: false, error: err.message });
  } finally {
    dbClient.release();
  }
});

app.delete('/api/clients/:clientId/suppliers/:id', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, id } = req.params;
    const result = await pool.query(
      `DELETE FROM suppliers WHERE client_id = $1 AND id = $2 RETURNING id`,
      [clientId, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Proveedor no encontrado.' });
    }
    res.json({ success: true, message: 'Proveedor eliminado exitosamente.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SAAS ERP: ÓRDENES DE COMPRA ---
app.get('/api/clients/:clientId/purchase-orders', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const result = await pool.query(
      `SELECT po.id, po.order_number, po.status, po.total_amount, po.delivery_method, 
              po.carrier_name, po.tracking_number, po.shipping_cost, po.notes, po.created_at, po.received_at,
              s.name as supplier_name, s.phone as supplier_phone,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', poi.id, 
                    'product_id', poi.product_id,
                    'product_name', p.name,
                    'sku', p.sku,
                    'quantity', poi.quantity, 
                    'cost_price', poi.cost_price
                  )
                ) FILTER (WHERE poi.id IS NOT NULL),
                '[]'
              ) as items
       FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
       LEFT JOIN products p ON poi.product_id = p.id
       WHERE po.client_id = $1
       GROUP BY po.id, s.name, s.phone
       ORDER BY po.created_at DESC`,
      [clientId]
    );
    res.json({ success: true, purchaseOrders: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/clients/:clientId/purchase-orders', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    const { clientId } = req.params;
    const { supplier_id, order_number, delivery_method, carrier_name, tracking_number, shipping_cost, notes, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'La orden debe tener al menos un producto.' });
    }

    const finalOrderNumber = order_number?.trim() || 'OC-' + Math.floor(1000 + Math.random() * 9000);
    let totalAmount = 0;
    
    // Validar ítems e incrementar total
    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity <= 0 || !item.cost_price || item.cost_price < 0) {
        await dbClient.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'Cada ítem debe incluir product_id, cantidad > 0 y costo >= 0.' });
      }
      totalAmount += parseInt(item.quantity) * parseFloat(item.cost_price);
    }

    const poResult = await dbClient.query(
      `INSERT INTO purchase_orders (
         client_id, supplier_id, order_number, status, total_amount, 
         delivery_method, carrier_name, tracking_number, shipping_cost, notes
       ) VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9)
       RETURNING id, order_number, status, total_amount, created_at`,
      [
        clientId, supplier_id || null, finalOrderNumber, totalAmount, 
        delivery_method || 'envio_tienda', carrier_name || null, 
        tracking_number || null, shipping_cost || 0.00, notes || null
      ]
    );
    const newOrder = poResult.rows[0];

    for (const item of items) {
      await dbClient.query(
        `INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, cost_price)
         VALUES ($1, $2, $3, $4)`,
        [newOrder.id, item.product_id, item.quantity, item.cost_price]
      );
    }

    await dbClient.query('COMMIT');
    res.json({ success: true, purchaseOrder: newOrder });
  } catch (err: any) {
    await dbClient.query('ROLLBACK');
    res.status(500).json({ success: false, error: err.message });
  } finally {
    dbClient.release();
  }
});

app.post('/api/clients/:clientId/purchase-orders/:orderId/receive', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');
    const { clientId, orderId } = req.params;

    // Obtener orden de compra
    const poCheck = await dbClient.query(
      `SELECT id, status, shipping_cost FROM purchase_orders WHERE client_id = $1 AND id = $2`,
      [clientId, orderId]
    );

    if (poCheck.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Orden de compra no encontrada.' });
    }

    const order = poCheck.rows[0];
    if (order.status === 'received') {
      await dbClient.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Esta orden de compra ya fue recibida.' });
    }

    // Obtener ítems
    const itemsResult = await dbClient.query(
      `SELECT product_id, quantity, cost_price FROM purchase_order_items WHERE purchase_order_id = $1`,
      [orderId]
    );
    const items = itemsResult.rows;

    const totalUnits = items.reduce((acc, curr) => acc + curr.quantity, 0);
    const extraCostPerUnit = totalUnits > 0 ? parseFloat((parseFloat(order.shipping_cost || '0') / totalUnits).toFixed(2)) : 0;

    const productsReceived: any[] = [];

    // Incrementar stock y actualizar precio de costo
    for (const item of items) {
      const finalCostPrice = parseFloat(item.cost_price) + extraCostPerUnit;

      const pResult = await dbClient.query(
        `UPDATE products 
         SET stock = stock + $1, cost_price = $2
         WHERE client_id = $3 AND id = $4
         RETURNING id, name, sku, stock, min_stock, price`,
        [item.quantity, finalCostPrice, clientId, item.product_id]
      );
      
      if (pResult.rows.length > 0) {
        const prod = pResult.rows[0];
        productsReceived.push({
          id: prod.id,
          name: prod.name,
          sku: prod.sku,
          price: prod.price,
          quantity: item.quantity,
          new_stock: prod.stock
        });

        // Resolver alerta de stock crítico si existía activa
        if (prod.stock > (prod.min_stock || 5)) {
          await logger.resolveAlert(
            `stock_low_${prod.id}`, 
            `El stock del producto "${prod.name}" se ha restablecido a ${prod.stock} unidades tras recepción de compra.`, 
            clientId as string
          );
        }
      }
    }

    // Actualizar estado de la orden
    await dbClient.query(
      `UPDATE purchase_orders 
       SET status = 'received', received_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [orderId]
    );

    await dbClient.query('COMMIT');
    res.json({ success: true, message: 'Mercancía recibida e inventario actualizado.', products: productsReceived });
  } catch (err: any) {
    await dbClient.query('ROLLBACK');
    res.status(500).json({ success: false, error: err.message });
  } finally {
    dbClient.release();
  }
});

// --- SAAS ERP: FACTURACIÓN Y CARTERA ---
app.get('/api/clients/:clientId/invoices', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const result = await pool.query(
      `SELECT id, invoice_number, customer_name, customer_phone, customer_document_type, customer_document_number, customer_email, customer_address, total_amount, status, due_date, reminder_sent, overdue_sent, payment_method, installments_count, installment_frequency, created_at 
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
      paymentMethod,
      installmentsCount,
      installmentFrequency,
      abono, // Abono inicial
      deliveryMethod, // 'local' o 'domicilio'
      deliveryFee,
      deliveryAddress,
      deliveryDate,
      items 
    } = req.body;

    if (!invoiceNumber || !customerName || !customerPhone || !customerDocumentNumber || !customerEmail || !dueDate || totalAmount === undefined) {
      return res.status(400).json({ success: false, error: 'Campos obligatorios incompletos.' });
    }

    const initialAbono = parseFloat(abono) || 0;
    const cleanTotal = parseFloat(totalAmount) || 0;
    const cleanDeliveryFee = parseFloat(deliveryFee) || 0;
    const cleanInstallmentsCount = installmentsCount !== undefined ? parseInt(installmentsCount) : 1;

    // Calcular estado inicial de la factura
    let initialStatus = 'pending';
    if (paymentMethod === 'contado' || paymentMethod === 'tarjeta') {
      initialStatus = 'paid';
    } else if (paymentMethod === 'cuotas') {
      if (initialAbono >= cleanTotal) {
        initialStatus = 'paid';
      }
    }

    // 0. Registrar/Asegurar cliente en el CRM si no existe por documento
    if (customerDocumentNumber) {
      const crmCheck = await dbClient.query(`
        SELECT id FROM crm_customers WHERE client_id = $1 AND document_number = $2
      `, [clientId, customerDocumentNumber]);

      if (crmCheck.rows.length === 0) {
        const nameParts = customerName.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';

        await dbClient.query(`
          INSERT INTO crm_customers (client_id, name, last_name, document_type, document_number, phone, email, address)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          clientId,
          firstName,
          lastName,
          customerDocumentType || 'CC',
          customerDocumentNumber,
          customerPhone,
          customerEmail || null,
          customerAddress || null
        ]);
        console.log(`[CRM Auto-Enroll] ✅ Cliente ${customerName} registrado en CRM automáticamente.`);
      }
    }

    // 1. Insertar Factura
    const invoiceResult = await dbClient.query(`
      INSERT INTO invoices (
        client_id, invoice_number, customer_name, customer_phone, 
        customer_document_type, customer_document_number, customer_email, 
        customer_address, total_amount, status, due_date, 
        payment_method, installments_count, installment_frequency,
        delivery_method, delivery_fee, delivery_address, delivery_date, delivery_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING id, invoice_number, customer_name, customer_phone, customer_document_type, customer_document_number, customer_email, customer_address, total_amount, status, due_date, payment_method, installments_count, installment_frequency, delivery_method, delivery_fee, delivery_address, delivery_date, delivery_status, created_at
    `, [
      clientId, 
      invoiceNumber, 
      customerName, 
      customerPhone, 
      customerDocumentType || 'CC', 
      customerDocumentNumber, 
      customerEmail, 
      customerAddress || null, 
      cleanTotal, 
      initialStatus, 
      dueDate,
      paymentMethod || 'contado',
      cleanInstallmentsCount,
      installmentFrequency || null,
      deliveryMethod || 'local',
      cleanDeliveryFee,
      deliveryAddress || customerAddress || null,
      deliveryDate || null,
      deliveryMethod === 'domicilio' ? 'pending' : 'entregado'
    ]);

    const invoice = invoiceResult.rows[0];

    // 2. Si el pago es financiado (por cuotas), generar el plan de cuotas dinámico
    if (paymentMethod === 'cuotas') {
      // Registrar abono inicial si aplica (Cuota #0, ya pagada)
      if (initialAbono > 0) {
        await dbClient.query(`
          INSERT INTO invoice_installments (invoice_id, installment_number, due_date, amount, status, paid_amount, paid_at)
          VALUES ($1, 0, NOW(), $2, 'paid', $2, NOW())
        `, [invoice.id, initialAbono]);
      }

      // Dividir saldo restante en cuotas
      const remainingAmount = cleanTotal - initialAbono;
      if (remainingAmount > 0 && cleanInstallmentsCount > 0) {
        const baseAmount = Math.round((remainingAmount / cleanInstallmentsCount) * 100) / 100;
        
        for (let i = 1; i <= cleanInstallmentsCount; i++) {
          const installmentDate = new Date();
          if (installmentFrequency === 'semanal') {
            installmentDate.setDate(installmentDate.getDate() + i * 7);
          } else if (installmentFrequency === 'quincenal') {
            installmentDate.setDate(installmentDate.getDate() + i * 15);
          } else { // mensual
            installmentDate.setMonth(installmentDate.getMonth() + i);
          }

          // Ajustar decimales de redondeo en la última cuota
          const installmentAmount = (i === cleanInstallmentsCount) 
            ? Math.round((remainingAmount - (baseAmount * (cleanInstallmentsCount - 1))) * 100) / 100 
            : baseAmount;

          await dbClient.query(`
            INSERT INTO invoice_installments (invoice_id, installment_number, due_date, amount, status, paid_amount)
            VALUES ($1, $2, $3, $4, 'pending', 0.00)
          `, [invoice.id, i, installmentDate, installmentAmount]);
        }
      }
    }

    // 3. Insertar Items
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await dbClient.query(`
          INSERT INTO invoice_items (
            invoice_id, product_id, quantity, price, 
            product_name, product_type, lens_design, lens_material, lens_treatment
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          invoice.id, 
          item.productType === 'lens' ? null : item.productId, 
          item.quantity || 1, 
          item.price,
          item.productName || null,
          item.productType || 'inventory',
          item.lensDesign || null,
          item.lensMaterial || null,
          item.lensTreatment || null
        ]);

        if (item.productType === 'lens') {
          // Obtener el ID del cliente en CRM
          const crmCustRes = await dbClient.query(`
            SELECT id FROM crm_customers 
            WHERE client_id = $1 AND document_number = $2
            LIMIT 1
          `, [clientId, customerDocumentNumber]);
          const customerId = crmCustRes.rows[0]?.id || null;

          if (customerId) {
            // Obtener la última fórmula clínica activa del paciente
            const formulaRes = await dbClient.query(`
              SELECT id FROM formulas 
              WHERE client_id = $1 AND customer_id = $2 
              ORDER BY created_at DESC LIMIT 1
            `, [clientId, customerId]);
            const formulaId = formulaRes.rows[0]?.id || null;

            // Insertar la orden de laboratorio en estado pending
            await dbClient.query(`
              INSERT INTO lab_jobs (
                client_id, customer_id, formula_id, invoice_id,
                product_name, lens_design, lens_material, lens_treatment,
                job_value, status
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0.00, 'pending')
            `, [
              clientId,
              customerId,
              formulaId,
              invoice.id,
              item.productName || 'Lente Formulada',
              item.lensDesign || null,
              item.lensMaterial || null,
              item.lensTreatment || null
            ]);
          }
        }

        // Solo descontar stock si es un producto físico del inventario
        if (item.productType !== 'lens' && item.productId) {
          const prodUpdateRes = await dbClient.query(`
            UPDATE products 
            SET stock = GREATEST(0, stock - $1) 
            WHERE id = $2 AND client_id = $3
            RETURNING name, stock, min_stock
          `, [item.quantity || 1, item.productId, clientId]);

          if (prodUpdateRes.rows.length > 0) {
            const { name: prodName, stock: newStock, min_stock: minStock } = prodUpdateRes.rows[0];
            if (newStock <= minStock) {
              await logger.raiseAlert(
                `stock_low_${item.productId}`, 
                'orange', 
                `El producto "${prodName}" tiene stock crítico de ${newStock} unidades (Mínimo: ${minStock}).`,
                `ID: ${item.productId} | Stock actual: ${newStock} | Mínimo: ${minStock}`,
                clientId as string
              );
            }
          }
        }
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

    // Marcar todas las cuotas asociadas como pagadas
    await pool.query(
      `UPDATE invoice_installments SET status = 'paid', paid_amount = amount, paid_at = NOW() WHERE invoice_id = $1`,
      [invoiceId]
    );

    res.json({ success: true, message: 'Factura pagada exitosamente.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Obtener detalles completos de una factura (con items y cuotas)
app.get('/api/clients/:clientId/invoices/:invoiceId', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, invoiceId } = req.params;
    
    // Consultar factura
    const invRes = await pool.query(
      `SELECT id, invoice_number, customer_name, customer_phone, customer_document_type, customer_document_number, customer_email, customer_address, total_amount, status, due_date, payment_method, installments_count, installment_frequency, delivery_method, delivery_fee, delivery_address, delivery_date, delivery_status, created_at
       FROM invoices
       WHERE client_id = $1 AND id = $2`,
      [clientId, invoiceId]
    );

    if (invRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Factura no encontrada.' });
    }
    const invoice = invRes.rows[0];

    // Consultar items
    const itemsRes = await pool.query(
      `SELECT ii.id, ii.product_id, ii.quantity, ii.price, ii.product_name, ii.product_type, ii.lens_design, ii.lens_material, ii.lens_treatment, p.name as inventory_name
       FROM invoice_items ii
       LEFT JOIN products p ON ii.product_id = p.id
       WHERE ii.invoice_id = $1`,
      [invoiceId]
    );

    // Consultar cuotas si aplica
    const instRes = await pool.query(
      `SELECT id, installment_number, due_date, amount, status, paid_amount, paid_at
       FROM invoice_installments
       WHERE invoice_id = $1
       ORDER BY installment_number ASC`,
      [invoiceId]
    );

    res.json({
      success: true,
      data: {
        ...invoice,
        items: itemsRes.rows,
        installments: instRes.rows
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Actualizar información de logística de entrega (domicilios)
app.patch('/api/clients/:clientId/invoices/:invoiceId/delivery', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, invoiceId } = req.params;
    const { deliveryMethod, deliveryFee, deliveryAddress, deliveryDate, deliveryStatus } = req.body;

    const result = await pool.query(
      `UPDATE invoices
       SET delivery_method = COALESCE($1, delivery_method),
           delivery_fee = COALESCE($2, delivery_fee),
           delivery_address = COALESCE($3, delivery_address),
           delivery_date = COALESCE($4, delivery_date),
           delivery_status = COALESCE($5, delivery_status),
           updated_at = NOW()
       WHERE client_id = $6 AND id = $7
       RETURNING id, delivery_method, delivery_fee, delivery_address, delivery_date, delivery_status`,
      [
        deliveryMethod || null,
        deliveryFee !== undefined ? parseFloat(deliveryFee) : null,
        deliveryAddress || null,
        deliveryDate || null,
        deliveryStatus || null,
        clientId,
        invoiceId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Factura no encontrada.' });
    }

    res.json({ success: true, message: 'Información de despacho actualizada con éxito.', data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Obtener cuotas de una factura
app.get('/api/clients/:clientId/invoices/:invoiceId/installments', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const result = await pool.query(
      `SELECT id, installment_number, due_date, amount, status, paid_amount, paid_at 
       FROM invoice_installments 
       WHERE invoice_id = $1 
       ORDER BY installment_number ASC`,
      [invoiceId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Registrar abono o acción negociable sobre una cuota específica
app.put('/api/clients/:clientId/invoices/:invoiceId/installments/:installmentId/pay', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  const dbClient = await pool.connect();
  try {
    const { invoiceId, installmentId } = req.params;
    const { amount, actionType } = req.body; // actionType: 'pay' | 'refinance' | 'accumulate'

    await dbClient.query('BEGIN');

    // Obtener cuota actual
    const instRes = await dbClient.query(
      `SELECT id, installment_number, amount, paid_amount, status FROM invoice_installments WHERE id = $1 AND invoice_id = $2`,
      [installmentId, invoiceId]
    );
    if (instRes.rows.length === 0) {
      throw new Error('Cuota no encontrada.');
    }
    const inst = instRes.rows[0];

    const currentAmount = parseFloat(inst.amount);
    const currentPaid = parseFloat(inst.paid_amount);
    const pendingAmount = currentAmount - currentPaid;

    if (actionType === 'refinance') {
      // Alargar plazo: crear una nueva cuota al final de la línea temporal
      const maxNumRes = await dbClient.query(
        `SELECT MAX(installment_number) as max_num, MAX(due_date) as max_date FROM invoice_installments WHERE invoice_id = $1`,
        [invoiceId]
      );
      const nextNum = (maxNumRes.rows[0].max_num || 0) + 1;
      const lastDate = new Date(maxNumRes.rows[0].max_date || new Date());
      
      const invRes = await dbClient.query(`SELECT installment_frequency FROM invoices WHERE id = $1`, [invoiceId]);
      const freq = invRes.rows[0].installment_frequency || 'mensual';
      const nextDate = new Date(lastDate);
      if (freq === 'quincenal') {
        nextDate.setDate(nextDate.getDate() + 15);
      } else if (freq === 'semanal') {
        nextDate.setDate(nextDate.getDate() + 7);
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      // Crear nueva cuota
      await dbClient.query(
        `INSERT INTO invoice_installments (invoice_id, installment_number, due_date, amount, status, paid_amount)
         VALUES ($1, $2, $3, $4, 'pending', 0.00)`,
        [invoiceId, nextNum, nextDate, pendingAmount]
      );

      // Marcar la actual como pagada (refinanciada)
      await dbClient.query(
        `UPDATE invoice_installments 
         SET status = 'paid', paid_amount = amount, paid_at = NOW() 
         WHERE id = $1`,
        [installmentId]
      );
    } else if (actionType === 'accumulate') {
      // Acumulativa: sumar la deuda pendiente a la siguiente cuota
      const nextInstRes = await dbClient.query(
        `SELECT id, amount FROM invoice_installments 
         WHERE invoice_id = $1 AND installment_number > $2 AND status = 'pending' 
         ORDER BY installment_number ASC LIMIT 1`,
        [invoiceId, inst.installment_number]
      );

      if (nextInstRes.rows.length > 0) {
        const nextInst = nextInstRes.rows[0];
        const nextNewAmount = parseFloat(nextInst.amount) + pendingAmount;
        
        await dbClient.query(
          `UPDATE invoice_installments SET amount = $1 WHERE id = $2`,
          [nextNewAmount, nextInst.id]
        );

        await dbClient.query(
          `UPDATE invoice_installments 
           SET status = 'paid', paid_amount = amount, paid_at = NOW() 
           WHERE id = $1`,
          [installmentId]
        );
      } else {
        // Fallback: alargar plazo si no hay una cuota siguiente
        const nextNum = inst.installment_number + 1;
        const lastDate = new Date();
        lastDate.setMonth(lastDate.getMonth() + 1);
        
        await dbClient.query(
          `INSERT INTO invoice_installments (invoice_id, installment_number, due_date, amount, status, paid_amount)
           VALUES ($1, $2, $3, $4, 'pending', 0.00)`,
          [invoiceId, nextNum, lastDate, pendingAmount]
        );
        await dbClient.query(
          `UPDATE invoice_installments SET status = 'paid', paid_amount = amount, paid_at = NOW() WHERE id = $1`,
          [installmentId]
        );
      }
    } else {
      // Pago normal o abono
      const payVal = parseFloat(amount) || 0;
      const totalPaid = currentPaid + payVal;
      const isFullyPaid = totalPaid >= currentAmount;

      await dbClient.query(
        `UPDATE invoice_installments 
         SET paid_amount = $1, status = $2, paid_at = $3
         WHERE id = $4`,
        [totalPaid, isFullyPaid ? 'paid' : 'pending', isFullyPaid ? new Date() : null, installmentId]
      );
    }

    // Verificar si quedan cuotas pendientes en total
    const checkAllRes = await dbClient.query(
      `SELECT COUNT(id) as pending_count FROM invoice_installments WHERE invoice_id = $1 AND status = 'pending'`,
      [invoiceId]
    );
    const pendingCount = parseInt(checkAllRes.rows[0].pending_count);

    if (pendingCount === 0) {
      await dbClient.query(
        `UPDATE invoices SET status = 'paid', updated_at = NOW() WHERE id = $1`,
        [invoiceId]
      );
    } else {
      await dbClient.query(
        `UPDATE invoices SET status = 'pending', updated_at = NOW() WHERE id = $1`,
        [invoiceId]
      );
    }

    await dbClient.query('COMMIT');
    res.json({ success: true, message: 'Transacción sobre cuota registrada con éxito.' });
  } catch (err: any) {
    await dbClient.query('ROLLBACK');
    res.status(500).json({ success: false, error: err.message });
  } finally {
    dbClient.release();
  }
});

// --- SAAS OPTICA: FÓRMULAS Y RECETAS OFTÁLMICAS ---
// Obtener historial de fórmulas del cliente
app.get('/api/clients/:clientId/formulas', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { customerId } = req.query;

    let query = `
      SELECT f.id, f.customer_id, c.name as customer_name, c.last_name as customer_last_name, 
             c.document_number as customer_document_number, c.phone as customer_phone, 
             f.od_sphere, f.od_cylinder, f.od_axis, f.od_addition, 
             f.oi_sphere, f.oi_cylinder, f.oi_axis, f.oi_addition, 
             f.dp_distance, f.height, f.notes, f.created_at 
      FROM formulas f 
      JOIN crm_customers c ON f.customer_id = c.id 
      WHERE f.client_id = $1
    `;
    const params: any[] = [clientId];

    if (customerId) {
      query += ` AND f.customer_id = $2`;
      params.push(customerId);
    }

    query += ` ORDER BY f.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ success: true, formulas: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Guardar nueva fórmula oftálmica
app.post('/api/clients/:clientId/formulas', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { 
      customerId, 
      odSphere, odCylinder, odAxis, odAddition, 
      oiSphere, oiCylinder, oiAxis, oiAddition, 
      dpDistance, height, notes 
    } = req.body;

    if (!customerId) {
      return res.status(400).json({ success: false, error: 'Falta seleccionar el cliente.' });
    }

    const result = await pool.query(`
      INSERT INTO formulas (
        client_id, customer_id, 
        od_sphere, od_cylinder, od_axis, od_addition, 
        oi_sphere, oi_cylinder, oi_axis, oi_addition, 
        dp_distance, height, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, created_at
    `, [
      clientId, 
      customerId, 
      odSphere || null, 
      odCylinder || null, 
      odAxis || null, 
      odAddition || null, 
      oiSphere || null, 
      oiCylinder || null, 
      oiAxis || null, 
      oiAddition || null, 
      dpDistance || null, 
      height || null, 
      notes || null
    ]);

    res.status(201).json({ success: true, message: 'Fórmula guardada exitosamente.', data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Eliminar una fórmula
app.delete('/api/clients/:clientId/formulas/:formulaId', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, formulaId } = req.params;
    const result = await pool.query(
      `DELETE FROM formulas WHERE client_id = $1 AND id = $2 RETURNING id`,
      [clientId, formulaId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Fórmula no encontrada.' });
    }

    res.json({ success: true, message: 'Fórmula eliminada exitosamente.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Obtener citas / agenda de un cliente (soporta opcionalmente filtro ?date=YYYY-MM-DD)
app.get('/api/clients/:clientId/appointments', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { date } = req.query; // Formato YYYY-MM-DD

    let query = `
      SELECT a.id, a.customer_name, a.customer_phone, a.customer_document_number, a.crm_customer_id, 
             to_char(a.appointment_date, 'YYYY-MM-DD"T"HH24:MI:SS') as appointment_date, 
             a.status, a.visit_reason, a.visit_reason_details, a.created_at,
             c.name as crm_first_name, c.last_name as crm_last_name
      FROM appointments a
      LEFT JOIN crm_customers c ON a.crm_customer_id = c.id
      WHERE a.client_id = $1
    `;
    const params: any[] = [clientId];

    const dateStr = typeof date === 'string' ? date : undefined;
    if (dateStr) {
      query += ` AND DATE(a.appointment_date) = $2`;
      params.push(dateStr);
    }

    query += ` ORDER BY a.appointment_date ASC`;

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
    const { 
      customer_document_number, 
      customer_name, 
      customer_phone, 
      appointment_date, 
      visit_reason, 
      visit_reason_details,
      crm_customer_id
    } = req.body;

    if (!appointment_date || !customer_document_number) {
      return res.status(400).json({ success: false, error: 'Fecha de cita y número de documento (cédula) son requeridos.' });
    }

    let finalName = customer_name;
    let finalPhone = customer_phone;
    let crmCustomerId = crm_customer_id || null;

    if (!crmCustomerId) {
      // 1. Buscar si el cliente ya existe en el CRM
      const customerRes = await pool.query(
        `SELECT id, name, last_name, phone FROM crm_customers WHERE client_id = $1 AND document_number = $2 LIMIT 1`,
        [clientId, customer_document_number]
      );

      if (customerRes.rows.length > 0) {
        const customer = customerRes.rows[0];
        finalName = customer.last_name ? `${customer.name} ${customer.last_name}` : customer.name;
        finalPhone = customer.phone;
        crmCustomerId = customer.id;
      } else {
        // Si no existe, y nos pasaron nombre y celular, crearlo automáticamente
        if (customer_name && customer_phone) {
          const cleanPhone = customer_phone.replace(/\D/g, '');
          // Intentar separar el nombre ingresado en nombre y apellido de forma simple
          const nameParts = customer_name.trim().split(' ');
          const name = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          const newCustomerRes = await pool.query(
            `INSERT INTO crm_customers (client_id, name, last_name, document_number, phone)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, name, last_name, phone`,
            [clientId, name, lastName, customer_document_number, cleanPhone]
          );
          const newCust = newCustomerRes.rows[0];
          finalName = newCust.last_name ? `${newCust.name} ${newCust.last_name}` : newCust.name;
          finalPhone = newCust.phone;
          crmCustomerId = newCust.id;
        } else {
          return res.status(404).json({ 
            success: false, 
            error: 'Cliente no registrado. Por favor, proporciona el Nombre y Teléfono para darlo de alta en el sistema.' 
          });
        }
      }
    } else {
      // Obtener datos del CRM por ID
      const customerRes = await pool.query(
        `SELECT name, last_name, phone FROM crm_customers WHERE id = $1 LIMIT 1`,
        [crmCustomerId]
      );
      if (customerRes.rows.length > 0) {
        const customer = customerRes.rows[0];
        finalName = customer.last_name ? `${customer.name} ${customer.last_name}` : customer.name;
        finalPhone = customer.phone;
      }
    }

    // 2. Insertar la cita
    const result = await pool.query(
      `INSERT INTO appointments (
        client_id, customer_name, customer_phone, appointment_date, status, 
        customer_document_number, crm_customer_id, visit_reason, visit_reason_details
      )
      VALUES ($1, $2, $3, $4, 'confirmed', $5, $6, $7, $8)
      RETURNING id, customer_name, customer_phone, to_char(appointment_date, 'YYYY-MM-DD"T"HH24:MI:SS') as appointment_date, status, customer_document_number, crm_customer_id, visit_reason, visit_reason_details`,
      [
        clientId, 
        finalName, 
        finalPhone, 
        appointment_date, 
        customer_document_number, 
        crmCustomerId, 
        visit_reason || 'examen_vista', 
        visit_reason_details || null
      ]
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
    const { customer_name, customer_phone, appointment_date, status, visit_reason, visit_reason_details } = req.body;

    const result = await pool.query(
      `UPDATE appointments 
       SET customer_name = COALESCE($1, customer_name), 
           customer_phone = COALESCE($2, customer_phone), 
           appointment_date = COALESCE($3, appointment_date),
           status = COALESCE($4, status),
           visit_reason = COALESCE($5, visit_reason),
           visit_reason_details = COALESCE($6, visit_reason_details)
       WHERE id = $7 AND client_id = $8
       RETURNING id, customer_name, customer_phone, to_char(appointment_date, 'YYYY-MM-DD"T"HH24:MI:SS') as appointment_date, status, customer_document_number, crm_customer_id, visit_reason, visit_reason_details`,
      [customer_name, customer_phone, appointment_date, status, visit_reason, visit_reason_details, appointmentId, clientId]
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
    let result = await pool.query(
      `SELECT id, name, created_at FROM business_departments WHERE client_id = $1 ORDER BY name ASC`,
      [clientId]
    );
    
    if (result.rows.length === 0) {
      const defaultDepts = ['RRHH', 'Contabilidad', 'Recepción', 'Ventas', 'Logística', 'Optometría'];
      for (const dept of defaultDepts) {
        await pool.query(
          `INSERT INTO business_departments (client_id, name) VALUES ($1, $2)`,
          [clientId, dept]
        );
      }
      result = await pool.query(
        `SELECT id, name, created_at FROM business_departments WHERE client_id = $1 ORDER BY name ASC`,
        [clientId]
      );
    }
    
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
      `SELECT e.id, e.name, e.last_name, e.phone, e.role, e.department_id, d.name as department_name, e.pin, e.is_active, e.created_at,
              e.hire_date, e.basic_salary, e.payment_type, e.pay_period, e.cutoff_day_1, e.cutoff_day_2, e.pay_day_1, e.pay_day_2,
              e.vacation_days_accumulated, e.hourly_rate, e.employment_status, e.activity_status, e.payment_method, e.bank_name, e.bank_account_number
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
    const { 
      name, last_name, phone, role, department_id, pin,
      hire_date, basic_salary, payment_type, pay_period,
      cutoff_day_1, cutoff_day_2, pay_day_1, pay_day_2,
      vacation_days_accumulated, hourly_rate, employment_status,
      activity_status, payment_method, bank_name, bank_account_number
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'Nombre y teléfono son requeridos.' });
    }

    const cleanPhone = phone.replace(/\D/g, '');

    const result = await pool.query(
      `INSERT INTO employees (
         client_id, name, last_name, phone, role, department_id, pin, is_active,
         hire_date, basic_salary, payment_type, pay_period,
         cutoff_day_1, cutoff_day_2, pay_day_1, pay_day_2,
         vacation_days_accumulated, hourly_rate, employment_status,
         activity_status, payment_method, bank_name, bank_account_number
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
       RETURNING *`,
      [
        clientId, name, last_name || '', cleanPhone, role || 'agent', department_id || null, pin || '1234',
        hire_date || null, parseFloat(basic_salary) || 0.00, payment_type || 'fixed_monthly', pay_period || 'mensual',
        parseInt(cutoff_day_1) || 15, parseInt(cutoff_day_2) || 30, parseInt(pay_day_1) || 15, parseInt(pay_day_2) || 30,
        parseFloat(vacation_days_accumulated) || 0.00, parseFloat(hourly_rate) || 0.00, employment_status || 'vinculado',
        activity_status || 'activo', payment_method || 'cash', bank_name || null, bank_account_number || null
      ]
    );

    // Obtener nombre de departamento para la respuesta
    let deptName = 'Ninguno';
    if (department_id) {
      const deptRes = await pool.query(`SELECT name FROM business_departments WHERE id = $1`, [department_id]);
      if (deptRes.rows.length > 0) deptName = deptRes.rows[0].name.toLowerCase();
    }

    const fullName = `${name} ${last_name || ''}`.trim();

    // Sincronizar con agent_contacts para el flujo de cascada y soporte
    await pool.query(
      `INSERT INTO agent_contacts (client_id, name, phone, priority, status, department, is_verified, role, pin)
       VALUES ($1, $2, $3, 1, 'offline', $4, TRUE, $5, $6)
       ON CONFLICT (client_id, phone) DO UPDATE
       SET name = $2, department = $4, role = $5, pin = $6`,
      [clientId, fullName, cleanPhone, deptName, role || 'agent', pin || '1234']
    );

    res.json({ success: true, employee: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/clients/:clientId/employees/:employeeId', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, employeeId } = req.params;
    const { 
      name, last_name, phone, role, department_id, pin, is_active,
      hire_date, basic_salary, payment_type, pay_period,
      cutoff_day_1, cutoff_day_2, pay_day_1, pay_day_2,
      vacation_days_accumulated, hourly_rate, employment_status,
      activity_status, payment_method, bank_name, bank_account_number
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'Nombre y teléfono son requeridos.' });
    }

    const cleanPhone = phone.replace(/\D/g, '');

    const result = await pool.query(
      `UPDATE employees
       SET name = $1, last_name = $2, phone = $3, role = $4, department_id = $5, pin = $6, is_active = $7,
           hire_date = $8, basic_salary = $9, payment_type = $10, pay_period = $11,
           cutoff_day_1 = $12, cutoff_day_2 = $13, pay_day_1 = $14, pay_day_2 = $15,
           vacation_days_accumulated = $16, hourly_rate = $17, employment_status = $18,
           activity_status = $19, payment_method = $20, bank_name = $21, bank_account_number = $22
       WHERE id = $23 AND client_id = $24
       RETURNING *`,
      [
        name, last_name || '', cleanPhone, role, department_id || null, pin, is_active,
        hire_date || null, parseFloat(basic_salary) || 0.00, payment_type || 'fixed_monthly', pay_period || 'mensual',
        parseInt(cutoff_day_1) || 15, parseInt(cutoff_day_2) || 30, parseInt(pay_day_1) || 15, parseInt(pay_day_2) || 30,
        parseFloat(vacation_days_accumulated) || 0.00, parseFloat(hourly_rate) || 0.00, employment_status || 'vinculado',
        activity_status || 'activo', payment_method || 'cash', bank_name || null, bank_account_number || null,
        employeeId, clientId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empleado no encontrado.' });
    }

    let deptName = 'Ninguno';
    if (department_id) {
      const deptRes = await pool.query(`SELECT name FROM business_departments WHERE id = $1`, [department_id]);
      if (deptRes.rows.length > 0) deptName = deptRes.rows[0].name.toLowerCase();
    }

    const fullName = `${name} ${last_name || ''}`.trim();

    // Actualizar también en agent_contacts
    await pool.query(
      `INSERT INTO agent_contacts (client_id, name, phone, priority, status, department, is_verified, role, pin)
       VALUES ($1, $2, $3, 1, 'offline', $4, TRUE, $5, $6)
       ON CONFLICT (client_id, phone) DO UPDATE
       SET name = $2, department = $4, role = $5, pin = $6`,
      [clientId, fullName, cleanPhone, deptName, role || 'agent', pin]
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
// Obtener todos los turnos del cliente para el día de hoy (Asistencia de Hoy)
app.get('/api/clients/:clientId/shifts/today', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const result = await pool.query(
      `SELECT s.id, s.employee_id, e.name as employee_name, e.last_name as employee_last_name, s.clock_in, s.clock_out, s.lunch_start, s.lunch_end,
              EXTRACT(EPOCH FROM (COALESCE(s.clock_out, NOW()) - s.clock_in))/3600 as hours_worked
       FROM shift_logs s
       JOIN employees e ON s.employee_id = e.id
       WHERE s.client_id = $1 AND (s.clock_in >= CURRENT_DATE OR s.clock_out IS NULL)
       ORDER BY s.clock_in DESC`,
      [clientId]
    );
    res.json({ success: true, shifts: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Obtener historial de turnos de un empleado específico
app.get('/api/clients/:clientId/employees/:employeeId/shifts', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const result = await pool.query(
      `SELECT id, clock_in, clock_out, lunch_start, lunch_end, EXTRACT(EPOCH FROM (COALESCE(clock_out, NOW()) - clock_in))/3600 as hours_worked
       FROM shift_logs 
       WHERE employee_id = $1 
       ORDER BY clock_in DESC LIMIT 100`,
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
      `SELECT name, role, basic_salary, allowances, arl_class, payment_type, hourly_rate, pay_period,
              cutoff_day_1, cutoff_day_2, pay_day_1, pay_day_2, vacation_days_accumulated
       FROM employees WHERE id = $1 AND client_id = $2`,
      [employeeId, clientId]
    );

    if (empRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empleado no encontrado.' });
    }

    const emp = empRes.rows[0];
    const isHourly = emp.payment_type === 'hourly';
    const rawHourlyRate = parseFloat(emp.hourly_rate || '0');
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
    const hourlyRate = isHourly ? rawHourlyRate : (basicSalary / 240);
    const basicEarned = isHourly ? (totalHours * hourlyRate) : basicSalary;

    const extraEarned = extraHours * hourlyRate * 0.25; // Extra diurno +25%
    const nightEarned = nightHours * hourlyRate * 0.35; // Recargo nocturno +35%
    const sundayEarned = sundayHours * hourlyRate * 0.75; // Recargo dominical +75%
    
    const grossSalary = basicEarned + extraEarned + nightEarned + sundayEarned + allowances;

    // Deducciones de Empleado (Salud 4%, Pensión 4%)
    const employeeHealthDeduction = grossSalary * 0.04;
    const employeePensionDeduction = grossSalary * 0.04;
    
    // 4. Obtener anticipos confirmados de este mes
    const advRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_advances 
       FROM employee_advances 
       WHERE employee_id = $1 AND client_id = $2 
         AND status = 'delivered' 
         AND confirmed_by_admin = TRUE 
         AND confirmed_by_employee = TRUE
         AND TO_CHAR(delivered_at, 'YYYY-MM') = $3`,
      [employeeId, clientId, month_year]
    );
    const totalAdvancesDeduction = parseFloat(advRes.rows[0]?.total_advances || '0');

    const netSalaryToPay = grossSalary - employeeHealthDeduction - employeePensionDeduction - totalAdvancesDeduction;

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
        paymentType: emp.payment_type,
        payPeriod: emp.pay_period,
        cutoffDay1: emp.cutoff_day_1,
        cutoffDay2: emp.cutoff_day_2,
        payDay1: emp.pay_day_1,
        payDay2: emp.pay_day_2,
        vacationDaysAccumulated: parseFloat(emp.vacation_days_accumulated || '0'),
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
          advances: totalAdvancesDeduction,
          totalDeductions: parseFloat((employeeHealthDeduction + employeePensionDeduction + totalAdvancesDeduction).toFixed(2))
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

// Obtener tareas de un empleado (incluyendo campañas de campo asignadas como visitas)
app.get('/api/clients/:clientId/employees/:employeeId/tasks', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, employeeId } = req.params;

    // 1. Obtener tareas comunes y visitas autogestionadas
    const tasksResult = await pool.query(
      `SELECT t.id, t.title, t.description, t.due_date, t.status, t.created_by_name, t.created_at, t.task_type, t.target_customer_id, c.name as customer_name, c.last_name as customer_last_name 
       FROM employee_tasks t
       LEFT JOIN crm_customers c ON t.target_customer_id = c.id
       WHERE t.client_id = $1 AND t.employee_id = $2 
       ORDER BY t.created_at DESC`,
      [clientId, employeeId]
    );

    // 2. Obtener campañas de campo (field_visits) de este empleado
    const visitsResult = await pool.query(
      `SELECT id, name, point_of_sale, address, visit_date, status, created_at 
       FROM field_visits 
       WHERE client_id = $1 AND employee_id = $2`,
      [clientId, employeeId]
    );

    // Map campañas a formato tarea
    const visitTasks = visitsResult.rows.map(v => ({
      id: v.id,
      title: `Campaña: ${v.name}`,
      description: `Punto de Venta: ${v.point_of_sale} - Dirección: ${v.address}`,
      due_date: v.visit_date,
      status: v.status === 'programada' ? 'pendiente' : (v.status === 'en_progreso' ? 'en proceso' : 'terminado'),
      created_by_name: 'Administrador',
      created_at: v.created_at || v.visit_date,
      task_type: 'visita',
      is_campaign: true
    }));

    // Combinar y ordenar cronológicamente
    const combinedTasks = [...tasksResult.rows, ...visitTasks].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    res.json({ success: true, tasks: combinedTasks });
  } catch (err: any) {
    console.error("[Get Tasks API] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Asignar tarea a un empleado
app.post('/api/clients/:clientId/employees/:employeeId/tasks', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, employeeId } = req.params;
    const { title, description, due_date, created_by_name, task_type, target_customer_id } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'El título de la tarea es requerido.' });
    }

    const creatorName = created_by_name || (req as any).user?.username || 'Administrador';

    const result = await pool.query(
      `INSERT INTO employee_tasks (client_id, employee_id, title, description, due_date, status, created_by_name, task_type, target_customer_id)
       VALUES ($1, $2, $3, $4, $5, 'pendiente', $6, $7, $8)
       RETURNING *`,
      [clientId, employeeId, title, description || null, due_date || null, creatorName, task_type || 'tarea', target_customer_id || null]
    );

    res.json({ success: true, task: result.rows[0] });
  } catch (err: any) {
    console.error("[Post Task API] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Obtener actualizaciones/reportes de una tarea
app.get('/api/clients/:clientId/employees/:employeeId/tasks/:taskId/updates', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const result = await pool.query(
      `SELECT id, task_id, old_status, new_status, report_text, created_by_name, created_at 
       FROM employee_task_updates 
       WHERE task_id = $1 
       ORDER BY created_at DESC`,
      [taskId]
    );
    res.json({ success: true, updates: result.rows });
  } catch (err: any) {
    console.error("[Get Task Updates API] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Agregar actualización/reporte de una tarea (y cambiar su estado)
app.post('/api/clients/:clientId/employees/:employeeId/tasks/:taskId/updates', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, employeeId, taskId } = req.params;
    const { new_status, report_text, created_by_name } = req.body;

    if (!new_status || !report_text) {
      return res.status(400).json({ success: false, error: 'El estado nuevo y el texto de actualización son requeridos.' });
    }

    const creatorName = created_by_name || (req as any).user?.username || 'Empleado';

    // A. Verificar si es una campaña de campo (field_visit)
    const visitCheck = await pool.query(
      `SELECT id, status FROM field_visits WHERE id = $1 AND client_id = $2 AND employee_id = $3`,
      [taskId, clientId, employeeId]
    );

    if (visitCheck.rows.length > 0) {
      const oldStatus = visitCheck.rows[0].status;
      const mappedOldStatus = oldStatus === 'completada' ? 'terminado' : (oldStatus === 'en_progreso' ? 'en proceso' : 'pendiente');
      
      // 1. Registrar actualización
      const updateResult = await pool.query(
        `INSERT INTO employee_task_updates (task_id, old_status, new_status, report_text, created_by_name)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [taskId, mappedOldStatus, new_status, report_text, creatorName]
      );

      // 2. Mapear status y actualizar en field_visits
      const campaignStatus = new_status === 'terminado' ? 'completada' : (new_status === 'en proceso' ? 'en_progreso' : 'programada');
      await pool.query(
        `UPDATE field_visits SET status = $1 WHERE id = $2`,
        [campaignStatus, taskId]
      );

      return res.json({ success: true, update: updateResult.rows[0] });
    }

    // B. Si no es campaña, es una tarea común
    const taskResult = await pool.query(
      `SELECT status FROM employee_tasks WHERE id = $1 AND client_id = $2 AND employee_id = $3`,
      [taskId, clientId, employeeId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Tarea o campaña no encontrada.' });
    }

    const oldStatus = taskResult.rows[0].status;

    // 1. Insertar actualización
    const updateResult = await pool.query(
      `INSERT INTO employee_task_updates (task_id, old_status, new_status, report_text, created_by_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [taskId, oldStatus, new_status, report_text, creatorName]
    );

    // 2. Actualizar estado de la tarea en employee_tasks
    await pool.query(
      `UPDATE employee_tasks SET status = $1 WHERE id = $2`,
      [new_status, taskId]
    );

    res.json({ success: true, update: updateResult.rows[0] });
  } catch (err: any) {
    console.error("[Post Task Update API] Error:", err);
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
      `SELECT id, name, last_name, document_type, document_number, phone, email, address, lens_prescription, last_interaction_at, created_at, customer_type 
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
      `SELECT id, name, last_name, phone, document_type, document_number, email, address, lens_prescription, customer_type 
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
    const { name, last_name, document_type, document_number, phone, email, address, lens_prescription, customer_type } = req.body;

    if (!name || !document_number || !phone) {
      return res.status(400).json({ success: false, error: 'Nombre, documento y teléfono son requeridos.' });
    }

    const cleanPhone = phone.replace(/\D/g, '');

    const result = await pool.query(
      `INSERT INTO crm_customers (client_id, name, last_name, document_type, document_number, phone, email, address, lens_prescription, customer_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [clientId, name, last_name || '', document_type || 'CC', document_number, cleanPhone, email || null, address || null, lens_prescription || null, customer_type || 'persona']
    );

    res.json({ success: true, customer: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/clients/:clientId/crm-customers/:customerId', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, customerId } = req.params;
    const { name, last_name, document_type, document_number, phone, email, address, lens_prescription, customer_type } = req.body;

    if (!name || !document_number || !phone) {
      return res.status(400).json({ success: false, error: 'Nombre, documento y teléfono son requeridos.' });
    }

    const cleanPhone = phone.replace(/\D/g, '');

    const result = await pool.query(
      `UPDATE crm_customers
       SET name = $1, last_name = $2, document_type = $3, document_number = $4, phone = $5, email = $6, address = $7, lens_prescription = $8, customer_type = $9
       WHERE id = $10 AND client_id = $11
       RETURNING *`,
      [name, last_name || '', document_type || 'CC', document_number, cleanPhone, email || null, address || null, lens_prescription || null, customer_type || 'persona', customerId, clientId]
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

// --- SAAS ERP: GESTIÓN DE LOGOTIPOS HISTORIAL (MÚLTIPLES LOGOS) ---

// Listar logotipos cargados de un cliente
app.get('/api/clients/:clientId/logos', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId as string;
    const parentDir = path.join(process.cwd(), 'media', 'clients', clientId);
    const logosDir = path.join(parentDir, 'logos');

    if (!fs.existsSync(logosDir)) {
      fs.mkdirSync(logosDir, { recursive: true });
    }

    // Migración automática del logo legado del directorio raíz
    if (fs.existsSync(parentDir)) {
      const files = fs.readdirSync(parentDir);
      for (const file of files) {
        if (file.toLowerCase().startsWith('logo.') || file.toLowerCase().startsWith('logo_legacy.')) {
          const oldPath = path.join(parentDir, file);
          const ext = path.extname(file) || '.png';
          const newName = `logo_legacy${ext}`;
          const newPath = path.join(logosDir, newName);
          
          if (fs.existsSync(oldPath)) {
            fs.renameSync(oldPath, newPath);
            const newUrl = `/media/clients/${clientId}/logos/${newName}`;
            await pool.query(`UPDATE clients SET logo_url = $1 WHERE id = $2`, [newUrl, clientId]);
            console.log(`[Logo Migration] Logotipo migrado a subcarpeta: ${newName}`);
          }
        }
      }
    }

    const files = fs.readdirSync(logosDir);
    const logos = files.map(file => ({
      fileName: file,
      url: `/media/clients/${clientId}/logos/${file}`
    }));

    res.json({ success: true, logos });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Subir nuevo logotipo e insertarlo en el historial
app.post('/api/clients/:clientId/logos', authenticateToken as any, authorizeClientAccess as any, upload.single('logo'), async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId as string;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: 'Archivo de logotipo faltante.' });
    }

    const logosDir = path.join(process.cwd(), 'media', 'clients', clientId, 'logos');
    if (!fs.existsSync(logosDir)) {
      fs.mkdirSync(logosDir, { recursive: true });
    }

    const ext = path.extname(file.originalname) || '.png';
    const timestamp = Date.now();
    const fileName = `logo_${timestamp}${ext}`;
    const filePath = path.join(logosDir, fileName);

    // Guardar archivo en la subcarpeta logos
    fs.writeFileSync(filePath, file.buffer);
    const logoUrl = `/media/clients/${clientId}/logos/${fileName}`;

    // Actualizar el logotipo activo en la tabla clients
    await pool.query(`UPDATE clients SET logo_url = $1 WHERE id = $2`, [logoUrl, clientId]);

    console.log(`[Media Upload] 🖼️ Logotipo nuevo subbido e indexado en historial: ${logoUrl}`);
    res.json({ success: true, logoUrl });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Compatibilidad anterior para la subida de logotipo
app.post('/api/clients/:clientId/logo', authenticateToken as any, authorizeClientAccess as any, upload.single('logo'), async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId as string;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: 'Archivo de logotipo faltante.' });
    }

    const logosDir = path.join(process.cwd(), 'media', 'clients', clientId, 'logos');
    if (!fs.existsSync(logosDir)) {
      fs.mkdirSync(logosDir, { recursive: true });
    }

    const ext = path.extname(file.originalname) || '.png';
    const timestamp = Date.now();
    const fileName = `logo_${timestamp}${ext}`;
    const filePath = path.join(logosDir, fileName);

    fs.writeFileSync(filePath, file.buffer);
    const logoUrl = `/media/clients/${clientId}/logos/${fileName}`;

    await pool.query(`UPDATE clients SET logo_url = $1 WHERE id = $2`, [logoUrl, clientId]);

    console.log(`[Media Upload Compatibility] 🖼️ Logotipo subido vía legacy /logo: ${logoUrl}`);
    res.json({ success: true, logoUrl });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Seleccionar logotipo del historial
app.post('/api/clients/:clientId/logos/select', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId as string;
    const { fileName } = req.body;

    if (!fileName) {
      return res.status(400).json({ success: false, error: 'Nombre de archivo faltante.' });
    }

    const logoUrl = `/media/clients/${clientId}/logos/${fileName}`;
    await pool.query(`UPDATE clients SET logo_url = $1 WHERE id = $2`, [logoUrl, clientId]);

    res.json({ success: true, logoUrl });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Eliminar un logotipo del historial
app.delete('/api/clients/:clientId/logos/:fileName', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId as string;
    const fileName = req.params.fileName as string;
    const filePath = path.join(process.cwd(), 'media', 'clients', clientId, 'logos', fileName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);

      // Si el logo eliminado era el que estaba activo en la base de datos, asignar el último disponible o null
      const logosDir = path.dirname(filePath);
      const remainingFiles = fs.readdirSync(logosDir);
      let newLogoUrl: string | null = null;

      if (remainingFiles.length > 0) {
        newLogoUrl = `/media/clients/${clientId}/logos/${remainingFiles[remainingFiles.length - 1]}`;
      }

      await pool.query(`UPDATE clients SET logo_url = $1 WHERE id = $2`, [newLogoUrl, clientId]);
      res.json({ success: true, message: 'Logotipo eliminado con éxito.', newLogoUrl });
    } else {
      res.status(404).json({ success: false, error: 'Archivo no encontrado.' });
    }
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

// --- SAAS ERP: MÉTRICAS EJECUTIVAS PARA EL RESUMEN DEL DASHBOARD ---
app.get('/api/clients/:clientId/dashboard-metrics', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId as string;

    // 1. Suma de ventas totales
    const salesRes = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) as "totalSales" FROM invoices WHERE client_id = $1`,
      [clientId]
    );
    const totalSales = parseFloat(salesRes.rows[0].totalSales);

    // 2. Total de productos
    const productsRes = await pool.query(
      `SELECT COUNT(*) as "totalProducts" FROM products WHERE client_id = $1`,
      [clientId]
    );
    const totalProducts = parseInt(productsRes.rows[0].totalProducts);

    // 3. Chats e interacciones
    const chatsRes = await pool.query(
      `SELECT COUNT(*) as "totalChats", COALESCE(SUM(CAST(api_cost AS numeric)), 0) as "totalCost" FROM interactions WHERE client_id = $1`,
      [clientId]
    );
    const totalChats = parseInt(chatsRes.rows[0].totalChats);
    const totalCost = parseFloat(chatsRes.rows[0].totalCost);

    // 4. ROI estimado y Ahorro de tiempo
    // Estimación: Cada chat ahorra 3 minutos (0.05 horas) de trabajo humano.
    // Estimación de costo de mano de obra delegada: $12 USD / hora.
    const hoursSaved = totalChats * 0.05;
    const estimatedSavings = hoursSaved * 12; // Ahorro en USD
    const roi = totalCost > 0 ? ((estimatedSavings - totalCost) / totalCost) * 100 : 0;

    res.json({
      success: true,
      totalSales,
      totalProducts,
      totalChats,
      totalCost,
      hoursSaved,
      roi
    });
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

// --- SAAS ERP: TRABAJOS DE LABORATORIO ---
app.get('/api/clients/:clientId/lab-jobs', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const result = await pool.query(`
      SELECT j.*, 
             c.name as customer_name, c.last_name as customer_last_name, c.phone as customer_phone, c.document_number as customer_document_number,
             s.name as supplier_name,
             f.od_sphere, f.od_cylinder, f.od_axis, f.od_addition,
             f.oi_sphere, f.oi_cylinder, f.oi_axis, f.oi_addition,
             f.dp_distance, f.height
      FROM lab_jobs j
      JOIN crm_customers c ON j.customer_id = c.id
      LEFT JOIN suppliers s ON j.supplier_id = s.id
      LEFT JOIN formulas f ON j.formula_id = f.id
      WHERE j.client_id = $1
      ORDER BY j.created_at DESC
    `, [clientId]);
    res.json({ success: true, labJobs: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/clients/:clientId/lab-jobs', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { customerId, formulaId, supplierId, invoiceId, productName, lensDesign, lensMaterial, lensTreatment, jobValue, status, notes } = req.body;
    
    const result = await pool.query(`
      INSERT INTO lab_jobs (
        client_id, customer_id, formula_id, supplier_id, invoice_id, 
        product_name, lens_design, lens_material, lens_treatment, 
        job_value, status, notes, sent_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *
    `, [
      clientId, customerId, formulaId || null, supplierId || null, invoiceId || null,
      productName || 'Lente Formulada', lensDesign || null, lensMaterial || null, lensTreatment || null,
      parseFloat(jobValue) || 0, status || 'sent', notes || ''
    ]);
    res.json({ success: true, labJob: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/clients/:clientId/lab-jobs/:jobId', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, jobId } = req.params;
    const { supplierId, jobValue, status, notes } = req.body;
    
    const cleanValue = parseFloat(jobValue) || 0;
    
    let updateQuery = `
      UPDATE lab_jobs 
      SET supplier_id = $1, job_value = $2, status = $3, notes = $4
    `;
    const params = [supplierId || null, cleanValue, status, notes || null];
    
    if (status === 'sent') {
      updateQuery += `, sent_at = COALESCE(sent_at, NOW())`;
    } else if (status === 'received') {
      updateQuery += `, received_at = COALESCE(received_at, NOW())`;
    } else if (status === 'delivered') {
      updateQuery += `, delivered_at = COALESCE(delivered_at, NOW())`;
    }
    
    updateQuery += ` WHERE id = $5 AND client_id = $6 RETURNING *`;
    params.push(jobId, clientId);
    
    const result = await pool.query(updateQuery, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Trabajo de laboratorio no encontrado.' });
    }
    res.json({ success: true, labJob: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/clients/:clientId/lab-jobs/:jobId', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, jobId } = req.params;
    await pool.query(`DELETE FROM lab_jobs WHERE id = $1 AND client_id = $2`, [jobId, clientId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SAAS ERP: ANTICIPOS DE SALARIO ---
app.get('/api/clients/:clientId/employee-advances', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { employeeId } = req.query;
    
    let query = `
      SELECT a.*, e.name as employee_name, e.last_name as employee_last_name, e.phone as employee_phone
      FROM employee_advances a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.client_id = $1
    `;
    const params = [clientId];
    
    if (employeeId) {
      query += ` AND a.employee_id = $2`;
      params.push(employeeId as string);
    }
    
    query += ` ORDER BY a.created_at DESC`;
    
    const result = await pool.query(query, params);
    res.json({ success: true, advances: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/clients/:clientId/employee-advances', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { employeeId, amount, requestedDate, notes, status } = req.body;
    
    const result = await pool.query(`
      INSERT INTO employee_advances (client_id, employee_id, amount, requested_date, notes, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [clientId, employeeId, parseFloat(amount) || 0, requestedDate || new Date(), notes || '', status || 'pending']);
    
    res.json({ success: true, advance: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/clients/:clientId/employee-advances/:advanceId', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, advanceId } = req.params;
    const { status, adminNotes, paymentMethod, bankName, confirmedByAdmin, confirmedByEmployee } = req.body;
    
    let updateQuery = `
      UPDATE employee_advances 
      SET status = $1, 
          admin_notes = COALESCE($2, admin_notes), 
          payment_method = COALESCE($3, payment_method), 
          bank_name = COALESCE($4, bank_name),
          confirmed_by_admin = COALESCE($5, confirmed_by_admin),
          confirmed_by_employee = COALESCE($6, confirmed_by_employee)
    `;
    const params = [
      status, 
      adminNotes !== undefined ? adminNotes : null, 
      paymentMethod !== undefined ? paymentMethod : null, 
      bankName !== undefined ? bankName : null,
      confirmedByAdmin !== undefined ? confirmedByAdmin : null,
      confirmedByEmployee !== undefined ? confirmedByEmployee : null
    ];
    
    if (status === 'delivered') {
      updateQuery += `, delivered_at = COALESCE(delivered_at, NOW())`;
    }
    
    updateQuery += ` WHERE id = $7 AND client_id = $8 RETURNING *`;
    params.push(advanceId, clientId);
    
    const result = await pool.query(updateQuery, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Anticipo no encontrado.' });
    }
    res.json({ success: true, advance: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/clients/:clientId/employee-advances/:advanceId', authenticateToken as any, authorizeClientAccess as any, async (req: Request, res: Response) => {
  try {
    const { clientId, advanceId } = req.params;
    await pool.query(`DELETE FROM employee_advances WHERE id = $1 AND client_id = $2`, [advanceId, clientId]);
    res.json({ success: true });
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

  // Asegurar que las columnas e incrementos de BD existan
  (async () => {
    try {
      await pool.query(`ALTER TABLE clients ALTER COLUMN phone_number DROP NOT NULL;`);
      console.log("[DB Migration] ✅ Columna 'phone_number' alterada con éxito (permite NULL).");

      await pool.query(`
        ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) DEFAULT 0.00;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock INT DEFAULT 5;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(100);
        ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_phone VARCHAR(20);
        ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(100);
        ALTER TABLE products ADD COLUMN IF NOT EXISTS material VARCHAR(100);
        ALTER TABLE products ADD COLUMN IF NOT EXISTS style VARCHAR(100);
        ALTER TABLE products ADD COLUMN IF NOT EXISTS color VARCHAR(100);
        ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_discount NUMERIC(5,2) DEFAULT 0.00;
      `);
      console.log("[DB Migration] ✅ Columnas del inventario (products) alteradas con éxito.");

      // Migraciones de facturación y perfil comercial
      await pool.query(`
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS nit VARCHAR(50);
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS address VARCHAR(255);
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS invoice_footer TEXT;

        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'contado';
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS installments_count INT DEFAULT 1;
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS installment_frequency VARCHAR(50);
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(20) DEFAULT 'local';
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10, 2) DEFAULT 0.00;
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivery_address TEXT;
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMP;
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) DEFAULT 'pending';

        ALTER TABLE crm_customers ADD COLUMN IF NOT EXISTS birth_date DATE;
        ALTER TABLE crm_customers ADD COLUMN IF NOT EXISTS customer_type VARCHAR(20) DEFAULT 'persona';

        ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(150);
        ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS product_type VARCHAR(50) DEFAULT 'inventory';
        ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS lens_design VARCHAR(100);
        ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS lens_material VARCHAR(100);
        ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS lens_treatment VARCHAR(100);

        CREATE TABLE IF NOT EXISTS invoice_installments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
            installment_number INT NOT NULL,
            due_date TIMESTAMP NOT NULL,
            amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
            paid_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS formulas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id VARCHAR(50) REFERENCES clients(id) ON DELETE CASCADE,
            customer_id UUID REFERENCES crm_customers(id) ON DELETE CASCADE,
            od_sphere VARCHAR(15),
            od_cylinder VARCHAR(15),
            od_axis VARCHAR(15),
            od_addition VARCHAR(15),
            oi_sphere VARCHAR(15),
            oi_cylinder VARCHAR(15),
            oi_axis VARCHAR(15),
            oi_addition VARCHAR(15),
            dp_distance VARCHAR(15),
            height VARCHAR(15),
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );

        ALTER TABLE appointments ADD COLUMN IF NOT EXISTS visit_reason VARCHAR(50) DEFAULT 'examen_vista';
        ALTER TABLE appointments ADD COLUMN IF NOT EXISTS visit_reason_details TEXT;
        ALTER TABLE employee_tasks ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(100) DEFAULT 'Administrador';
        ALTER TABLE employee_tasks ADD COLUMN IF NOT EXISTS task_type VARCHAR(20) DEFAULT 'tarea';
        ALTER TABLE employee_tasks ADD COLUMN IF NOT EXISTS target_customer_id UUID REFERENCES crm_customers(id) ON DELETE SET NULL;

        CREATE TABLE IF NOT EXISTS employee_task_updates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            task_id UUID NOT NULL REFERENCES employee_tasks(id) ON DELETE CASCADE,
            old_status VARCHAR(20),
            new_status VARCHAR(20) NOT NULL,
            report_text TEXT NOT NULL,
            created_by_name VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log("[DB Migration] ✅ Columnas y tablas de la Fase 4 (Cartera/Logística/Perfil) inicializadas con éxito.");
    } catch (err: any) {
      console.error("[DB Migration] ⚠️ Error aplicando migraciones de arranque de la Fase 4:", err.message);
    }
  })();
  
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
