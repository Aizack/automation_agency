import { query } from '../database/connection';

export interface ClientConfig {
  id: string;
  name: string;
  phoneNumber: string; // El número de WhatsApp que la agencia le asignó o conectó a este cliente
  systemPrompt: string;
  activeTools: string[];
}

export const getClientConfigByPhone = async (phone: string): Promise<ClientConfig | null> => {
  try {
    const res = await query(
      'SELECT id, name, phone_number as "phoneNumber", system_prompt as "systemPrompt", active_tools as "activeTools" FROM clients WHERE phone_number = $1',
      [phone]
    );

    if (res.rows.length === 0) {
      return null;
    }

    return res.rows[0] as ClientConfig;
  } catch (error) {
    console.error(`[Config] Error obteniendo configuración para el número ${phone}:`, error);
    return null;
  }
};
