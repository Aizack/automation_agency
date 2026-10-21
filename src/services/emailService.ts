import nodemailer, { Transporter } from 'nodemailer';
import { google } from 'googleapis';
import { pool } from '../database/postgres';

interface SmtpConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
}

function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASS || process.env.GMAIL_APP_PASSWORD;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (!user || !pass) {
    return null;
  }

  if (process.env.GMAIL_USER || (host && host.includes('gmail'))) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass
      }
    });
  }

  if (!host) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  });
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  fromName?: string;
  attachments?: Array<{
    filename: string;
    content?: any;
    path?: string;
    contentType?: string;
  }>;
}

/**
 * Obtiene la configuración de correo de una tienda/sede específica.
 */
export async function getStoreEmailConfig(clientId: string) {
  const res = await pool.query(
    `SELECT name, email, gmail_account_email, gmail_connected_at, email_channel,
            (gmail_refresh_token IS NOT NULL AND gmail_refresh_token != '') as has_gmail
     FROM clients 
     WHERE id = $1`,
    [clientId]
  );
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return {
    storeName: row.name,
    storeEmail: row.email,
    gmailAccountEmail: row.gmail_account_email,
    gmailEmail: row.gmail_account_email,
    gmailConnectedAt: row.gmail_connected_at,
    connectedAt: row.gmail_connected_at,
    emailChannel: row.email_channel || 'system',
    isGmailConnected: Boolean(row.has_gmail),
    connected: Boolean(row.has_gmail)
  };
}

/**
 * Envía un correo electrónico a nombre de una tienda/sede en particular.
 * Si la tienda tiene Gmail OAuth conectado, el correo sale directamente desde su cuenta de Gmail.
 * Si no, usa el servicio transaccional por defecto con Reply-To al correo de la tienda.
 */
export async function sendEmailForClient(
  clientId: string,
  options: SendEmailOptions
): Promise<{ success: boolean; messageId?: string; sender?: string; channel?: 'gmail' | 'system'; error?: string }> {
  try {
    const clientRes = await pool.query(
      `SELECT id, name, email, gmail_account_email, gmail_refresh_token, email_channel 
       FROM clients 
       WHERE id = $1`,
      [clientId]
    );

    const client = clientRes.rows[0];
    if (!client) {
      return { success: false, error: 'Tienda no encontrada' };
    }

    const senderName = options.fromName || client.name || 'Frant ERP';

    // 1. Si la tienda tiene Gmail OAuth vinculado
    if (client.gmail_refresh_token && client.gmail_account_email) {
      const clientIdGoogle = process.env.GOOGLE_CLIENT_ID;
      const clientSecretGoogle = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUriGoogle = process.env.GOOGLE_REDIRECT_URI;

      if (!clientIdGoogle || !clientSecretGoogle) {
        console.warn(`[Store Email] ⚠️ GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET no configurados para enviar vía Gmail.`);
      } else {
        const oauth2Client = new google.auth.OAuth2(
          clientIdGoogle,
          clientSecretGoogle,
          redirectUriGoogle
        );
        oauth2Client.setCredentials({ refresh_token: client.gmail_refresh_token });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        
        // Formatear mensaje MIME RFC 2822 para Gmail REST API
        const utf8Subject = `=?utf-8?B?${Buffer.from(options.subject).toString('base64')}?=`;
        const messageParts = [
          `From: "${senderName}" <${client.gmail_account_email}>`,
          `To: ${options.to}`,
          `Content-Type: text/html; charset=utf-8`,
          `MIME-Version: 1.0`,
          `Subject: ${utf8Subject}`,
          '',
          options.html || options.text || ''
        ];
        const rawMessage = messageParts.join('\r\n');
        const encoded = Buffer.from(rawMessage)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const sendRes = await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw: encoded }
        });

        console.log(`[Store Email] ✅ Correo enviado mediante Gmail API REST de la tienda (${client.gmail_account_email}) a ${options.to}. ID: ${sendRes.data.id}`);
        return { success: true, messageId: sendRes.data.id || undefined, sender: client.gmail_account_email, channel: 'gmail' };
      }
    }

    // 2. Fallback: Servicio transaccional global con Reply-To de la tienda
    const transporter = getTransporter();
    if (!transporter) {
      return {
        success: false,
        error: 'No hay servicio de correo configurado. Vincula tu cuenta de Gmail en Ajustes o configura el servidor SMTP.'
      };
    }

    const systemFrom = process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || 'contacto@diazlab.online';
    const replyTo = client.email || client.gmail_account_email || systemFrom;

    const info = await transporter.sendMail({
      from: `"${senderName}" <${systemFrom}>`,
      replyTo: `"${senderName}" <${replyTo}>`,
      to: options.to,
      subject: options.subject,
      text: options.text || '',
      html: options.html,
      attachments: options.attachments
    });

    console.log(`[Store Email] ✅ Correo enviado mediante transporte del sistema a ${options.to} (Reply-To: ${replyTo}). ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId, sender: systemFrom, channel: 'system' };
  } catch (err: any) {
    console.error(`[Store Email] ❌ Error enviando correo para la tienda ${clientId}:`, err);
    return { success: false, error: err.message || 'Error al enviar correo' };
  }
}

/**
 * Envía un código OTP de autenticación de doble factor (MFA) por correo electrónico.
 */
export async function sendEmailOtp(to: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getTransporter();

    if (!transporter) {
      console.warn(`[MFA Email] ⚠️ No se enviará correo a ${to}: Variables de entorno SMTP no configuradas.`);
      return {
        success: false,
        error: 'El servicio de correo electrónico (SMTP) no está configurado en el servidor (.env). Utiliza WhatsApp o Google Authenticator para ingresar, o configura SMTP_USER y SMTP_PASS.'
      };
    }

    const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || 'contacto@diazlab.online';

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F6F4EE; padding: 40px 20px; color: #161616;">
        <div style="max-width: 480px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E2DFD7; border-radius: 6px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-family: serif; font-size: 26px; font-weight: bold; color: #161616; letter-spacing: 1.5px;">FRANT ERP</span>
            <div style="font-size: 11px; text-transform: uppercase; color: #D9381E; font-weight: bold; margin-top: 4px; letter-spacing: 1.5px;">Seguridad & Autenticación</div>
          </div>
          
          <h2 style="font-size: 18px; font-weight: 600; color: #161616; margin-top: 0; text-align: center;">Código de Verificación</h2>
          
          <p style="font-size: 14px; color: #6B6862; line-height: 1.5; text-align: center; margin-bottom: 24px;">
            Has solicitado acceder a tu cuenta. Utiliza el siguiente código de 6 dígitos para completar tu inicio de sesión seguro:
          </p>
          
          <div style="background-color: #FAF8F3; border: 1px dashed #D9381E; border-radius: 4px; padding: 18px; text-align: center; margin-bottom: 24px;">
            <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #D9381E;">${code}</span>
          </div>
          
          <p style="font-size: 12px; color: #8F8C84; line-height: 1.4; text-align: center; margin: 0;">
            ⏱️ Este código expira en <strong>10 minutos</strong>. Si no solicitaste este código, puedes ignorar este mensaje o comunicarte con el administrador.
          </p>
        </div>
        <div style="max-width: 480px; margin: 16px auto 0; text-align: center; font-size: 11px; color: #8F8C84;">
          Frant ERP — Plataforma Multi-Tenant Segura
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"Frant Seguridad" <${fromAddress}>`,
      to,
      subject: `🔐 Tu código de verificación Frant: ${code}`,
      text: `Tu código de verificación de inicio de sesión es: ${code}. Válido por 10 minutos.`,
      html: htmlContent
    });

    console.log(`[MFA Email] ✅ Correo OTP enviado satisfactoriamente a ${to}. MessageId: ${info.messageId}`);
    return { success: true };
  } catch (err: any) {
    console.error(`[MFA Email] ❌ Error enviando correo OTP a ${to}:`, err);
    return {
      success: false,
      error: `Error al enviar correo: ${err.message || 'Fallo de conexión SMTP'}`
    };
  }
}
