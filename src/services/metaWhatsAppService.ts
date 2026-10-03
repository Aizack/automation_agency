import { pool } from '../database/postgres';
import { routeIncomingMessage } from '../core/router';
import { getClientById, updateClient } from '../database/clientsCrud';

export class MetaWhatsAppService {

  /**
   * Envía un mensaje de texto plano a través de la API oficial de Meta Graph API.
   */
  static async sendMetaTextMessage(
    phoneNumberId: string, 
    toPhone: string, 
    text: string, 
    accessToken: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const cleanPhone = toPhone.replace(/[^0-9]/g, '');
      const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: { preview_url: false, body: text }
        })
      });

      const resData: any = await response.json();

      if (!response.ok) {
        console.error(`[Meta API Sender] Error enviando mensaje a +${cleanPhone}:`, resData);
        return { success: false, error: resData.error?.message || 'Error en Graph API de Meta' };
      }

      console.log(`[Meta API Sender] ✅ Mensaje enviado exitosamente a +${cleanPhone} (ID: ${resData.messages?.[0]?.id})`);
      return { success: true, data: resData };
    } catch (error: any) {
      console.error('[Meta API Sender] Excepción de red:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Procesa la carga útil (Payload) de mensajes entrantes enviados por el Webhook de Meta.
   */
  static async processIncomingMetaWebhook(payload: any): Promise<void> {
    try {
      if (payload.object !== 'whatsapp_business_account') return;

      const entries = payload.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          if (change.field !== 'messages') continue;

          const value = change.value || {};
          const metadata = value.metadata || {};
          const phoneNumberId = metadata.phone_number_id;
          const displayPhoneNumber = metadata.display_phone_number?.replace(/\D/g, '');

          const messages = value.messages || [];
          for (const msg of messages) {
            // Solo procesamos mensajes de texto entrantes
            if (msg.type !== 'text' || !msg.text?.body) continue;

            const senderPhone = msg.from;
            const messageBody = msg.text.body;

            console.log(`[Meta Webhook] 📩 Mensaje recibido de +${senderPhone} para PhoneID: ${phoneNumberId} (Tel: ${displayPhoneNumber}): "${messageBody}"`);

            // 1. Buscar qué tenant / cliente posee este phoneNumberId o displayPhoneNumber
            let tenantId = 'admin';
            let metaToken = process.env.META_WA_TOKEN || 'EAAVzPHiUbzkBSo16d1EoBBta7HHnw8gO5ZAlv25tzhZAhdf7gydQM5EUHruHotZCZB9D8ae8V7Le2RE9ZCSmZCDYlKrpl2F7R79ZCSoZCn0SKqBOWo0mKgUZAYR4lA9XHwgGy3s2J1QGGpUZCtDTs59lBghYqbmlYpAFZBEHZBl4bWZC3NAMGS61PoSIR2Q9h1jj8rscYa7XryvKVPrOaRoPcxnqQJZBZCO71AXYHm4RxPsXgYeCS2LmrPwQm3hLZCINsAzLWkHnnjiLCQIGFdkemoWwZAoZBdXEonPUutGFBXusEZD';

            try {
              const tenantRes = await pool.query(
                `SELECT id, meta_wa_token 
                 FROM clients 
                 WHERE meta_phone_number_id = $1 
                    OR ( $2 != '' AND RIGHT(REGEXP_REPLACE(COALESCE(phone_number, ''), '\\D', 'g'), 10) = RIGHT(REGEXP_REPLACE($2, '\\D', 'g'), 10) )
                    OR ( $2 != '' AND RIGHT(REGEXP_REPLACE(COALESCE(phone, ''), '\\D', 'g'), 10) = RIGHT(REGEXP_REPLACE($2, '\\D', 'g'), 10) )
                 LIMIT 1`,
                [phoneNumberId, displayPhoneNumber || '']
              );

              if (tenantRes.rows.length > 0) {
                tenantId = tenantRes.rows[0].id;
                metaToken = tenantRes.rows[0].meta_wa_token || metaToken;
              }
            } catch (dbErr: any) {
              console.warn('[Meta Webhook] Error buscando tenant por ID:', dbErr.message);
            }

            if (!metaToken) {
              console.warn(`[Meta Webhook] ⚠️ Token de Meta no configurado para el tenant ${tenantId}. Saltando respuesta.`);
              continue;
            }

            // 2. Procesar el mensaje a través del motor de Agentes IA (Gemini 3.7 Flash)
            const botPhone = displayPhoneNumber || phoneNumberId;
            const responseText = await routeIncomingMessage(
              botPhone,
              senderPhone,
              messageBody,
              async (to, text) => {
                await this.sendMetaTextMessage(phoneNumberId, to, text, metaToken);
              },
              async (to, filePath) => {
                // Envío de audio o adjunto no soportado aún por texto plano en este bridge
                await this.sendMetaTextMessage(phoneNumberId, to, `[Nota de voz adjunta]`, metaToken);
              },
              tenantId
            );

            // 3. Responder al usuario en WhatsApp vía Meta Graph API
            if (responseText) {
              await this.sendMetaTextMessage(phoneNumberId, senderPhone, responseText, metaToken);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('[Meta Webhook Processor] Error procesando webhook:', err);
    }
  }

  /**
   * Intercambia el código de autorización de Embedded Signup por un token de acceso permanente de Meta.
   */
  static async exchangeEmbeddedSignupCode(clientId: string, code: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const appId = process.env.META_APP_ID || '';
      const appSecret = process.env.META_APP_SECRET || '';

      if (!appId || !appSecret) {
        return { success: false, error: 'META_APP_ID o META_APP_SECRET no configurados en el servidor.' };
      }

      const url = `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`;
      const response = await fetch(url);
      const resData: any = await response.json();

      if (!response.ok || !resData.access_token) {
        return { success: false, error: resData.error?.message || 'Error al intercambiar token OAuth' };
      }

      const accessToken = resData.access_token;

      // Guardar el token devuelto en la base de datos para este cliente
      await pool.query(
        `UPDATE clients SET meta_wa_token = $1, updated_at = NOW() WHERE id = $2`,
        [accessToken, clientId]
      );

      return { success: true, data: { accessToken } };
    } catch (err: any) {
      console.error('[Meta Embedded Signup] Error en intercambio de token:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Registra oficialmente un número de teléfono en Meta Cloud API (Paso final para pasar de Pendiente a Conectado).
   * Referencia oficial Meta: POST /{PHONE_NUMBER_ID}/register
   */
  static async registerPhoneNumber(
    phoneNumberId: string,
    accessToken: string,
    pin: string = '123456'
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/register`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          pin: pin
        })
      });

      const resData: any = await response.json();
      if (!response.ok) {
        return { success: false, error: resData.error?.message || 'Error registrando número en Meta Graph API' };
      }

      console.log(`[Meta API Register] ✅ Número ${phoneNumberId} registrado exitosamente en Meta Cloud API!`);
      return { success: true, data: resData };
    } catch (error: any) {
      console.error('[Meta API Register] Excepción:', error);
      return { success: false, error: error.message };
    }
  }
}
