import express, { Request, Response } from 'express';
import 'dotenv/config';
import path from 'path';
import { 
  createClient, 
  getClientById, 
  updateClient, 
  deleteClient, 
  listClients, 
  updateClientStatus 
} from './database/clientsCrud';
import { pool } from './database/postgres';
import { whatsappState, initializeWhatsAppClient, connectWhatsApp } from './services/whatsapp';

const app = express();
app.use(express.json());

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

// --- ENDPOINTS DE CLIENTES (CRUD) ---

// 1. Listar todos los clientes
app.get('/api/clients', async (req: Request, res: Response) => {
  try {
    const clients = await listClients();
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

// 3. Crear un cliente (ID automático y Prompt opcional)
app.post('/api/clients', async (req: Request, res: Response) => {
  try {
    const { id, name, phone_number, system_prompt, active_tools, agent_phone } = req.body;
    if (!name || !phone_number) {
      return res.status(400).json({ 
        success: false, 
        message: 'Faltan campos obligatorios: name, phone_number' 
      });
    }

    const clientId = id || 'client_' + Math.random().toString(36).substring(2, 10);
    const finalPrompt = system_prompt || `Eres un asistente de IA amable y servicial para la empresa ${name}.`;

    await createClient({ 
      id: clientId, 
      name, 
      phone_number, 
      system_prompt: finalPrompt, 
      active_tools: active_tools || [], 
      agent_phone 
    });
    res.status(201).json({ 
      success: true, 
      message: `Cliente '${name}' creado exitosamente`,
      data: { id: clientId }
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
});
