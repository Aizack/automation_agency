import { pool } from './postgres';
import { ClientConfig } from '../core/config';

/**
 * Registra un nuevo cliente (Tenant) en la base de datos PostgreSQL.
 */
export const createClient = async (client: {
  id: string;
  name: string;
  phone_number: string;
  system_prompt: string;
  active_tools?: string[];
  agent_phone?: string;
  drive_folder_id?: string;
  username?: string;
  password?: string;
  email?: string;
  contact_name?: string;
}): Promise<void> => {
  try {
    await pool.query(
      `INSERT INTO clients (id, name, phone_number, system_prompt, active_tools, agent_phone, drive_folder_id, username, password, email, contact_name, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active')`,
      [
        client.id,
        client.name,
        client.phone_number,
        client.system_prompt,
        client.active_tools || [],
        client.agent_phone || null,
        client.drive_folder_id || null,
        client.username || null,
        client.password || null,
        client.email || null,
        client.contact_name || null
      ]
    );
    console.log(`[CRUD] Client '${client.name}' (ID: ${client.id}) successfully created.`);
  } catch (error) {
    console.error("[CRUD] ❌ Error creating client in DB:", error);
    throw error;
  }
};

/**
 * Obtiene la configuración de un cliente por su ID único.
 */
export const getClientById = async (id: string): Promise<ClientConfig | null> => {
  try {
    const res = await pool.query(
      `SELECT 
        id, 
        name, 
        phone_number AS "phoneNumber", 
        system_prompt AS "systemPrompt", 
        active_tools AS "activeTools", 
        status, 
        agent_phone AS "agentPhone",
        drive_folder_id AS "driveFolderId",
        username,
        password,
        email,
        contact_name AS "contactName"
       FROM clients 
       WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (res.rows.length === 0) {
      return null;
    }
    return res.rows[0] as ClientConfig;
  } catch (error) {
    console.error(`[CRUD] ❌ Error fetching client with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Actualiza los campos específicos de un cliente.
 */
export const updateClient = async (
  id: string,
  updates: Partial<{
    name: string;
    phone_number: string;
    system_prompt: string;
    active_tools: string[];
    status: string;
    agent_phone: string;
    drive_folder_id: string;
    username: string;
    password: string;
    email: string;
    contact_name: string;
  }>
): Promise<void> => {
  try {
    const setQuery: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      setQuery.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    });

    if (setQuery.length === 0) return;

    values.push(id);
    const queryStr = `UPDATE clients SET ${setQuery.join(', ')} WHERE id = $${paramIndex}`;

    await pool.query(queryStr, values);
    console.log(`[CRUD] Client with ID '${id}' successfully updated.`);
  } catch (error) {
    console.error(`[CRUD] ❌ Error updating client with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Cambia el estado de facturación de un cliente (ej. 'active', 'suspended').
 */
export const updateClientStatus = async (id: string, status: 'active' | 'suspended' | 'inactive'): Promise<void> => {
  try {
    await pool.query('UPDATE clients SET status = $1 WHERE id = $2', [status, id]);
    console.log(`[CRUD] Status of client '${id}' set to '${status}'.`);
  } catch (error) {
    console.error(`[CRUD] ❌ Error updating status of client ${id}:`, error);
    throw error;
  }
};

/**
 * Elimina un cliente por su ID.
 */
export const deleteClient = async (id: string): Promise<void> => {
  try {
    await pool.query('DELETE FROM clients WHERE id = $1', [id]);
    console.log(`[CRUD] Client with ID '${id}' deleted from database.`);
  } catch (error) {
    console.error(`[CRUD] ❌ Error deleting client ${id}:`, error);
    throw error;
  }
};

/**
 * Devuelve la lista completa de todos los clientes.
 */
export const listClients = async (): Promise<ClientConfig[]> => {
  try {
    const res = await pool.query(
      `SELECT 
        id, 
        name, 
        phone_number AS "phoneNumber", 
        system_prompt AS "systemPrompt", 
        active_tools AS "activeTools", 
        status, 
        agent_phone AS "agentPhone",
        drive_folder_id AS "driveFolderId",
        username,
        password,
        email,
        contact_name AS "contactName"
       FROM clients 
       ORDER BY created_at DESC`
    );
    return res.rows as ClientConfig[];
  } catch (error) {
    console.error("[CRUD] ❌ Error listing clients:", error);
    throw error;
  }
};
