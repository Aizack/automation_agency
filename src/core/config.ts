import { pool } from '../database/postgres';

export interface ClientConfig {
  id: string;
  name: string;
  phoneNumber: string; // El número de WhatsApp que la agencia le asignó o conectó a este cliente
  systemPrompt: string;
  activeTools: string[];
  status: string;      // Estado de la cuenta (active, suspended, inactive)
}

/**
 * Consulta la base de datos PostgreSQL para buscar la configuración del cliente
 * asociándolo con su número de teléfono registrado.
 */
export const getClientConfigByPhone = async (phone: string): Promise<ClientConfig | null> => {
  try {
    const res = await pool.query(
      `SELECT 
        id, 
        name, 
        phone_number AS "phoneNumber", 
        system_prompt AS "systemPrompt", 
        active_tools AS "activeTools", 
        status 
       FROM clients 
       WHERE phone_number = $1 LIMIT 1`,
      [phone]
    );

    if (res.rows.length === 0) {
      return null;
    }

    return res.rows[0] as ClientConfig;
  } catch (error) {
    console.error("[Config] ❌ Error buscando configuración de cliente en la base de datos:", error);
    return null;
  }
};