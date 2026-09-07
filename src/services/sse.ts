import { Response } from 'express';

// Mapa de clientId -> Set de conexiones Response activas
const sseClients = new Map<string, Set<Response>>();

/**
 * Registrar un cliente SSE en el mapa en memoria
 */
export const registerSseClient = (clientId: string, res: Response) => {
  if (!sseClients.has(clientId)) {
    sseClients.set(clientId, new Set());
  }
  const clientSet = sseClients.get(clientId)!;
  clientSet.add(res);

  // Remover cliente cuando se cierre la conexión HTTP
  res.on('close', () => {
    clientSet.delete(res);
    if (clientSet.size === 0) {
      sseClients.delete(clientId);
    }
  });
};

/**
 * Emitir un evento SSE a un cliente específico (y a conexiones de administración)
 */
export const broadcastSseEvent = (clientId: string, eventName: string, data: any) => {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;

  // 1. Enviar al tenant específico
  const targetClients = sseClients.get(clientId);
  if (targetClients) {
    for (const clientRes of targetClients) {
      try {
        clientRes.write(payload);
      } catch (err) {
        // Ignorado, res.on('close') lo removerá
      }
    }
  }

  // 2. Enviar también a los visores 'admin' si el evento es de un cliente específico
  if (clientId !== 'admin' && sseClients.has('admin')) {
    for (const adminRes of sseClients.get('admin')!) {
      try {
        adminRes.write(payload);
      } catch (err) {
        // Ignorado
      }
    }
  }
};

// Ping de retención de conexión cada 25 segundos para evitar timeouts de proxies (ej. Nginx / Cloudflare)
setInterval(() => {
  const pingPayload = `: ping\n\n`;
  for (const [, clientSet] of sseClients) {
    for (const clientRes of clientSet) {
      try {
        clientRes.write(pingPayload);
      } catch (err) {
        // Ignorado
      }
    }
  }
}, 25000);
