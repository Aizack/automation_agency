export function getPrivacyPolicyHTML(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Política de Privacidad | Frant Bot - Automatización IA</title>
  <style>
    :root {
      --primary: #0866ff;
      --dark: #0f172a;
      --slate: #475569;
      --light: #f8fafc;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: var(--slate);
      background-color: var(--light);
      margin: 0;
      padding: 0;
    }
    .header {
      background-color: var(--dark);
      color: #ffffff;
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 2.2rem;
      color: #ffffff;
    }
    .header p {
      margin-top: 10px;
      color: #94a3b8;
      font-size: 1.1rem;
    }
    .container {
      max-width: 850px;
      margin: 40px auto;
      background: #ffffff;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    h2 {
      color: var(--dark);
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
      margin-top: 30px;
    }
    ul {
      padding-left: 20px;
    }
    li {
      margin-bottom: 8px;
    }
    .footer {
      text-align: center;
      padding: 30px;
      color: #64748b;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Política de Privacidad</h1>
    <p>Frant Bot - Plataforma de Automatización de IA y Mensajería Multi-Tenant</p>
  </div>
  <div class="container">
    <p>Última actualización: <strong>30 de septiembre de 2026</strong></p>
    
    <h2>1. Introducción</h2>
    <p>En <strong>Frant Bot</strong> nos tomamos muy en serio la privacidad y la protección de los datos de nuestros usuarios e inquilinos (comercios). Esta Política de Privacidad describe cómo recopilamos, utilizamos, almacenamos y protegemos la información procesada a través de nuestra plataforma de automatización de inteligencia artificial vinculada a servicios de mensajería como la API Oficial de Meta (WhatsApp Business Cloud API).</p>

    <h2>2. Información que Recopilamos</h2>
    <p>Para prestar nuestros servicios de automatización de atención al cliente e IA, recopilamos la siguiente información:</p>
    <ul>
      <li><strong>Información de la Cuenta de Comercio</strong>: Nombre comercial, teléfono corporativo, correo electrónico y credenciales de acceso al Dashboard.</li>
      <li><strong>Datos de Integración de Meta (WhatsApp Cloud API)</strong>: Identificador de cuenta de WhatsApp Business (WABA ID), ID de número de teléfono y tokens de acceso otorgados mediante el flujo de autorización de Meta.</li>
      <li><strong>Datos de Mensajería y Conversación</strong>: Contenido de mensajes de texto y estados de envío procesados por el Agente de IA para responder a consultas de inventario, cartera y servicios.</li>
    </ul>

    <h2>3. Uso de la Información</h2>
    <p>La información recopilada se utiliza exclusivamente para:</p>
    <ul>
      <li>Procesar y responder automáticamente consultas de clientes finales mediante modelos de Inteligencia Artificial.</li>
      <li>Gestionar inventarios, facturas, agendamiento de citas y consultas de estado de envíos del comercio.</li>
      <li>Enviar notificaciones operativas autorizadas por el usuario.</li>
      <li>Garantizar la seguridad, auditoría y aislamiento multi-tenant de la plataforma.</li>
    </ul>

    <h2>4. Protección de Datos y Seguridad</h2>
    <p>Implementamos estándares estrictos de seguridad de la información, incluyendo encriptación de credenciales, tokens de acceso autenticados mediante JWT, control de acceso basado en roles y aislamiento riguroso entre bases de datos de inquilinos. NUNCA vendemos ni compartimos datos personales o conversaciones con terceros no autorizados.</p>

    <h2>5. Cumplimiento con las Políticas de Meta</h2>
    <p>Frant Bot cumple rigurosamente con las Políticas de la Plataforma de Meta for Developers y la Política de WhatsApp Business Solution Providers. Los datos obtenidos a través de la Graph API de Meta se utilizan únicamente para ejecutar la integración solicitada por el usuario.</p>

    <h2>6. Eliminación de Datos (Data Deletion)</h2>
    <p>Cualquier usuario o comercio puede solicitar la eliminación completa de su cuenta y de sus datos asociados enviando un correo a <code>soporte@diazlab.com</code> o desvinculando la aplicación directamente desde su cuenta de Meta Business Manager.</p>

    <h2>7. Contacto</h2>
    <p>Si tienes preguntas sobre esta Política de Privacidad, puedes contactarnos en:</p>
    <p><strong>Correo electrónico:</strong> soporte@diazlab.com<br>
    <strong>Dirección:</strong> Diaz Lab Software, Colombia</p>
  </div>
  <div class="footer">
    &copy; 2026 Frant Bot / Diaz Lab. Todos los derechos reservados.
  </div>
</body>
</html>`;
}
