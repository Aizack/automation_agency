import nodemailer, { Transporter } from 'nodemailer';

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

    const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || 'contactanos@diazlab.online';

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
