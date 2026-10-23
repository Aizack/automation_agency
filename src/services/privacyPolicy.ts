export function getPrivacyPolicyHTML(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Política de Privacidad y Tratamiento de Datos | Frant by Diaz Lab Automation</title>
  <style>
    :root {
      --primary: #D9381E;
      --primary-hover: #b82d16;
      --dark: #161616;
      --slate: #475569;
      --body-text: #2d3748;
      --light: #F6F4EE;
      --card-bg: #ffffff;
      --border-color: #E2DFD7;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.65;
      color: var(--body-text);
      background-color: var(--light);
      margin: 0;
      padding: 0;
    }
    .top-nav {
      background-color: var(--dark);
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .top-nav .brand {
      color: #FAF8F3;
      font-weight: 700;
      font-size: 1.1rem;
      text-decoration: none;
      letter-spacing: 0.5px;
    }
    .top-nav .nav-links a {
      color: #E2DFD7;
      text-decoration: none;
      font-size: 0.85rem;
      margin-left: 18px;
      padding: 6px 12px;
      border-radius: 4px;
      transition: all 0.2s;
    }
    .top-nav .nav-links a:hover, .top-nav .nav-links a.active {
      background-color: rgba(255,255,255,0.15);
      color: #ffffff;
    }
    .header {
      background-color: var(--dark);
      color: #FAF8F3;
      padding: 50px 20px 45px 20px;
      text-align: center;
      border-bottom: 3px solid var(--primary);
    }
    .header h1 {
      margin: 0;
      font-size: 2.2rem;
      font-weight: 700;
      color: #FAF8F3;
      letter-spacing: -0.5px;
    }
    .header p {
      margin-top: 12px;
      color: #A8A29E;
      font-size: 1.05rem;
      max-width: 700px;
      margin-left: auto;
      margin-right: auto;
    }
    .container {
      max-width: 900px;
      margin: 40px auto;
      background: var(--card-bg);
      padding: 48px;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    }
    .meta-badge {
      display: inline-block;
      background: #FAF8F3;
      border: 1px solid var(--border-color);
      padding: 6px 14px;
      border-radius: 4px;
      font-size: 0.82rem;
      color: #6B6862;
      margin-bottom: 24px;
      font-weight: 500;
    }
    h2 {
      color: var(--dark);
      border-bottom: 2px solid var(--border-color);
      padding-bottom: 8px;
      margin-top: 36px;
      font-size: 1.35rem;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    h3 {
      color: var(--dark);
      font-size: 1.1rem;
      margin-top: 20px;
      margin-bottom: 8px;
    }
    p, li {
      font-size: 0.95rem;
      color: var(--body-text);
    }
    ul, ol {
      padding-left: 24px;
    }
    li {
      margin-bottom: 10px;
    }
    .highlight-box {
      background-color: #FAF8F3;
      border-left: 4px solid var(--primary);
      padding: 16px 20px;
      margin: 20px 0;
      border-radius: 0 4px 4px 0;
      font-size: 0.92rem;
      border-top: 1px solid var(--border-color);
      border-right: 1px solid var(--border-color);
      border-bottom: 1px solid var(--border-color);
    }
    .callout-info {
      background-color: #f0fdf4;
      border-left: 4px solid #16a34a;
      padding: 14px 18px;
      margin: 18px 0;
      border-radius: 0 4px 4px 0;
      font-size: 0.92rem;
    }
    .callout-meta {
      background-color: #eff6ff;
      border-left: 4px solid #0866ff;
      padding: 16px 20px;
      margin: 20px 0;
      border-radius: 0 4px 4px 0;
      font-size: 0.92rem;
    }
    .footer {
      text-align: center;
      padding: 35px 20px;
      color: #6B6862;
      font-size: 0.88rem;
      border-top: 1px solid var(--border-color);
      background-color: #FAF8F3;
      margin-top: 50px;
    }
    .footer a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 600;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    @media (max-width: 768px) {
      .container {
        padding: 24px 18px;
        margin: 20px 10px;
      }
      .header h1 {
        font-size: 1.8rem;
      }
    }
  </style>
</head>
<body>
  <nav class="top-nav">
    <a href="https://frant.app" class="brand">FRANT • Friendly Automation</a>
    <div class="nav-links">
      <a href="/terms">Términos de Servicio</a>
      <a href="/privacy" class="active">Política de Privacidad</a>
    </div>
  </nav>

  <div class="header">
    <h1>Política de Privacidad y Protección de Datos Personales</h1>
    <p>Frant (Friendly Automation) • Diaz Lab Automation • Cumplimiento Habeas Data Ley 1581 y Meta Platform</p>
  </div>

  <div class="container">
    <div class="meta-badge">
      📅 Última actualización: <strong>19 de octubre de 2026</strong> | Versión 2.4 (Habeas Data & Meta Compliance)
    </div>

    <h2>1. Responsable del Tratamiento y Ámbito de Aplicación</h2>
    <p>
      El presente documento constituye la Política de Privacidad y Tratamiento de Datos Personales de la plataforma <strong>Frant</strong> (derivado de <em>Friendly Automation</em>), desarrollada, operada y de propiedad de <strong>Diaz Lab Automation</strong> (en adelante, "la Empresa", "nosotros" o "Frant"), con domicilio principal en Barranquilla, Atlántico, Colombia, y con canal de contacto oficial en <code>contacto@diazlab.online</code>.
    </p>
    <p>
      Esta política aplica a todos los datos recopilados a través de nuestro sitio web <strong>https://frant.app</strong>, el panel de control (Dashboard SaaS), los conectores con la API Oficial de Meta (WhatsApp Business Cloud API) y los módulos de automatización con Inteligencia Artificial.
    </p>

    <h2>2. Marco Normativo y Bases Legales</h2>
    <p>
      El tratamiento de datos se rige por los más altos estándares nacionales e internacionales de privacidad:
    </p>
    <ul>
      <li><strong>República de Colombia:</strong> Ley Estatutaria 1581 de 2012 (Régimen General de Protección de Datos Personales / Habeas Data), Decreto Reglamentario 1377 de 2013, y circulares de la Superintendencia de Industria y Comercio (SIC).</li>
      <li><strong>Estándares Internacionales:</strong> Principios rectores del Reglamento General de Protección de Datos (GDPR - Reglamento UE 2016/679) relativos a licitud, transparencia, limitación de la finalidad y minimización de datos.</li>
      <li><strong>Políticas de Plataforma de Meta:</strong> Meta Platform Terms, Developer Policies y WhatsApp Business Solution Provider Guidelines.</li>
    </ul>
    <p>
      <strong>Bases legales del tratamiento:</strong> (i) El consentimiento libre, previo, expreso e informado del titular; (ii) la ejecución de la relación contractual de prestación de servicios de software SaaS; y (iii) el cumplimiento de deberes legales (tributarios y contables ante la DIAN).
    </p>

    <h2>3. Información que Recopilamos</h2>
    <p>Para la correcta operación del ERP y la automatización inteligente, recopilamos las siguientes categorías de datos:</p>
    <ul>
      <li><strong>Datos de Identificación del Inquilino (Empresa Cliente):</strong> Razón social o nombre comercial, Número de Identificación Tributaria (NIT/RUT), teléfono corporativo, correo electrónico y credenciales seguras de acceso al Dashboard.</li>
      <li><strong>Datos de Integración de Meta (WhatsApp Cloud API):</strong> Identificador de cuenta de WhatsApp Business (WABA ID), ID de número de teléfono corporativo (Phone Number ID) y tokens de acceso otorgados mediante el flujo seguro de Embedded Signup u OAuth de Meta.</li>
      <li><strong>Datos Operativos del Negocio:</strong> Catálogo de productos, listas de precios, existencias de inventario, órdenes de venta, facturas emitidas y datos de contacto de clientes finales (nombres y teléfonos móviles) necesarios para procesar pedidos o citas.</li>
      <li><strong>Registros Técnicos y de Conectividad:</strong> Direcciones IP de acceso, tipo de navegador, registros de auditoría (logs) y tokens de sesión JWT temporales.</li>
    </ul>

    <h2>4. Finalidades del Tratamiento de Datos</h2>
    <p>La información recopilada se destina de forma exclusiva a:</p>
    <ol>
      <li>Proveer las funciones del ERP: punto de venta (POS), facturación electrónica, control de inventario y pedidos a domicilio.</li>
      <li>Procesar y responder automáticamente consultas de clientes finales en WhatsApp mediante agentes de Inteligencia Artificial debidamente autorizados por el comercio.</li>
      <li>Aislar estrictamente los datos entre inquilinos mediante arquitectura multi-tenant segura (cada tienda únicamente accede a su información).</li>
      <li>Auditar la seguridad del sistema y prevenir fraudes, ataques cibernéticos o suplantaciones.</li>
      <li>Cumplir con las obligaciones fiscales y de conservación de soportes comerciales exigidas por la ley colombiana.</li>
    </ol>
    <div class="callout-info">
      <strong>Prohibición estricta de venta de datos:</strong> Diaz Lab Automation <strong>NUNCA comercializa, arrienda ni transfiere</strong> bases de datos, listas de contactos o información transaccional a intermediarios, empresas de publicidad o data brokers.
    </div>

    <h2>5. Subencargados del Tratamiento y Transferencia Internacional de Datos</h2>
    <p>
      Para operar con alta disponibilidad y tecnología de vanguardia, Frant se apoya en proveedores de infraestructura tecnológica (subencargados) de primer nivel mundial:
    </p>
    <ul>
      <li><strong>Meta Platforms, Inc. (EE.UU.):</strong> Enrutamiento seguro y entrega de mensajes a través de la API oficial de WhatsApp Business Cloud.</li>
      <li><strong>Google Cloud & OpenAI (EE.UU.):</strong> Modelos de inteligencia artificial para procesamiento de lenguaje natural en tiempo real.</li>
      <li><strong>Amazon Web Services (AWS) / Nube Cloud:</strong> Almacenamiento seguro y cifrado de objetos e imágenes multimedia.</li>
      <li><strong>Pasarelas de Pago Certificadas PCI-DSS (Wompi, Stripe):</strong> Procesamiento de transacciones bancarias y pagos electrónicos.</li>
    </ul>
    <p>
      Todos los subencargados operan bajo cláusulas de protección de datos, certificaciones SOC 2 / ISO 27001 o marcos de transferencia internacional acordes con los estándares de la SIC y de la Unión Europea.
    </p>

    <h2>6. Inteligencia Artificial: Transparencia y Privacidad de Prompts</h2>
    <div class="highlight-box">
      <strong>Compromiso de No Re-entrenamiento:</strong> Las conversaciones procesadas por nuestros agentes de IA, los datos de inventario y los prompts enviados a los modelos de lenguaje (Google Gemini y OpenAI) <strong>NO son utilizados para entrenar modelos públicos de lenguaje</strong>. Se procesan de manera efímera bajo acuerdos de confidencialidad comercial con políticas estrictas de cero retención de entrenamiento de API (Zero Data Retention for Training).
    </div>

    <h2>7. Cumplimiento Específico con Políticas de Google API y Uso Limitado (Google API Services User Data Policy)</h2>
    <div class="callout-meta" style="border-left-color: #4285F4; background-color: #F8FAFC;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <svg width="24" height="24" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
        <strong style="font-size: 1.05rem; color: #1E293B;">Declaración Integral de Cumplimiento de Políticas de Datos de Usuario de Google (Google User Data Disclosures)</strong>
      </div>
      
      <p style="margin-top: 4px;">
        El uso y la transferencia a cualquier otra aplicación por parte de <strong>Frant ERP</strong> de la información recibida a través de las API de Google se apegan estrictamente a la 
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style="color:#1A73E8; font-weight:600; text-decoration:underline;">
          Política de Datos de Usuario de los Servicios de la API de Google (Google API Services User Data Policy)
        </a>, incluidos los requisitos de <strong>Uso Limitado (Limited Use Requirements)</strong>.
      </p>

      <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; padding: 18px; margin: 16px 0;">
        <h3 style="margin-top: 0; color: #0F172A; font-size: 1.05rem; display: flex; align-items: center; gap: 8px;">
          <span>🛡️</span> Mecanismos Técnicos de Protección de Datos Sensibles (Data Protection Mechanisms for Sensitive Data)
        </h3>
        <p style="font-size: 0.9rem; color: #334155;">
          En estricto cumplimiento con los requisitos de verificación de Google OAuth (<em>Google Cloud Security Verification Requirements</em>), Frant ERP implementa las siguientes medidas técnicas, organizativas y criptográficas para salvaguardar todos los datos de usuario y credenciales obtenidos a través de las API de Google:
        </p>

        <ul style="font-size: 0.9rem; color: #334155; padding-left: 20px;">
          <li style="margin-bottom: 12px;">
            <strong>Cifrado en Tránsito (Encryption in Transit):</strong><br>
            Todas las comunicaciones entre el navegador web del usuario, la infraestructura de servidores de Frant ERP y las API de Google están cifradas obligatoriamente de extremo a extremo utilizando los protocolos criptográficos <strong>TLS 1.2 y TLS 1.3 sobre HTTPS</strong> con certificados SSL/TLS modernos y suites de cifrado seguras. Se prohíbe cualquier comunicación en texto plano.
          </li>
          <li style="margin-bottom: 12px;">
            <strong>Cifrado en Reposo (Encryption at Rest):</strong><br>
            Todos los datos sensibles de autenticación de Google, incluidos los tokens de acceso y tokens de actualización OAuth 2.0 (<em>refresh tokens</em>), se almacenan cifrados en reposo utilizando el algoritmo estándar de la industria <strong>AES-256 (Advanced Encryption Standard con claves de 256 bits)</strong> en bases de datos relacionales PostgreSQL protegidas y aisladas detrás de cortafuegos de red restringidos.
          </li>
          <li style="margin-bottom: 12px;">
            <strong>Control de Acceso Basado en Roles y Mínimo Privilegio (Access Controls & Least Privilege):</strong><br>
            El acceso a las credenciales y funcionalidades de envío de correo electrónico se rige bajo el principio de menor privilegio (PoLP) y control de acceso basado en roles (RBAC). Únicamente los usuarios autenticados con privilegios de administrador del inquilino (comercio) que autorizó expresamente la cuenta de Google pueden interactuar con la integración. La arquitectura multi-tenant de Frant ERP garantiza el aislamiento físico y lógico estricto entre empresas, impidiendo que cualquier otro usuario o tienda acceda a las credenciales de un tercero.
          </li>
          <li style="margin-bottom: 12px;">
            <strong>Política de Retención y Purgado Definitivo de Datos (Data Retention and Purge Policy):</strong><br>
            • Los tokens de Google se conservan <strong>únicamente mientras la integración permanezca activamente conectada</strong> por el usuario.<br>
            • Si el usuario hace clic en <em>"Desvincular Gmail"</em> dentro del panel de control de Frant ERP, o revoca el acceso desde la consola de seguridad de Google (<a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style="color:#1A73E8; text-decoration:underline;">myaccount.google.com/permissions</a>), todos los tokens de acceso, tokens de actualización y registros asociados son <strong>eliminados de forma inmediata, permanente e irreversible</strong> de nuestras bases de datos operativas (tiempo de retención residual: 0 días).<br>
            • Ante una solicitud de supresión de cuenta enviada a <code>contacto@diazlab.online</code>, la purga completa de datos se ejecuta en un plazo máximo de 24 horas hábiles.
          </li>
          <li style="margin-bottom: 8px;">
            <strong>Prohibición Expresa de Uso de Datos para Modelos de Inteligencia Artificial (AI/ML Policy):</strong><br>
            <div style="background: #F1F5F9; border-left: 4px solid #0EA5E9; padding: 10px 14px; margin-top: 6px; font-weight: 500; color: #0F172A;">
              <strong>Cláusula de no entrenamiento (Mandatory Workspace API Disclosure):</strong><br>
              <em>Frant does not use data obtained through Google Workspace APIs (including Gmail APIs) to develop, train, or improve generalized or non-personalized artificial intelligence (AI) and/or machine learning (ML) models.</em><br>
              <span style="font-size: 0.85rem; color: #475569; font-weight: normal;">
                (Frant no utiliza los datos obtenidos a través de las API de Google Workspace, incluidas las API de Gmail, para desarrollar, entrenar o mejorar modelos de inteligencia artificial y/o aprendizaje automático generalizados o no personalizados).
              </span>
            </div>
          </li>
        </ul>
      </div>

      <div style="margin-top: 14px;">
        <h4 style="margin: 8px 0 4px 0; color: #0F172A; font-size: 0.95rem;">Detalle de Permisos Solicitados y Justificación Operativa:</h4>
        <ul style="font-size: 0.88rem; color: #334155; padding-left: 20px;">
          <li>
            <code>https://www.googleapis.com/auth/gmail.send</code>: 
            Permiso sensible requerido exclusivamente para permitir que el comerciante envíe facturas electrónicas, recibos de caja, cotizaciones y estados de cuenta a sus clientes finales directamente desde su propia dirección de Gmail corporativa. <strong>Frant ERP no lee, no modifica, no elimina ni almacena correos de la bandeja de entrada del usuario.</strong>
          </li>
          <li>
            <code>https://www.googleapis.com/auth/userinfo.email</code> y <code>https://www.googleapis.com/auth/userinfo.profile</code>:
            Permisos no sensibles utilizados únicamente para identificar la dirección de correo conectada y mostrarla al administrador en la interfaz de configuración (ej. <em>"Conectado como: ventas@tienda.com"</em>).
          </li>
        </ul>
      </div>

      <p style="font-size: 0.85rem; color: #64748B; margin-top: 12px; margin-bottom: 0;">
        <strong>Revocación Autónoma:</strong> El usuario puede revocar el acceso en cualquier momento desde <em>Frant ERP ➔ Configuración ➔ Correo / Gmail ➔ Desvincular</em> o desde <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style="color:#1A73E8;">myaccount.google.com/permissions</a>.
      </p>
    </div>

    <h2>8. Cumplimiento Específico con Políticas de Meta for Developers</h2>
    <div class="callout-meta">
      <strong>Garantías WhatsApp Cloud API:</strong><br>
      • Los tokens de acceso de Meta se almacenan con cifrado simétrico en variables aisladas y bases de datos protegidas.<br>
      • El webhook de eventos de Meta solo procesa mensajes correspondientes al número registrado por cada cliente y descarta cualquier evento no autorizado.<br>
      • Cumplimos rigurosamente con la <em>WhatsApp Commerce Policy</em> y los <em>Meta Platform Terms</em>.
    </div>

    <h2>9. Mecanismos Autónomos de Eliminación de Datos (Data Deletion Callback)</h2>
    <p>
      En cumplimiento con los requerimientos obligatorios de Meta for Developers y el derecho constitucional de cancelación de datos, Frant ofrece tres métodos garantizados e inmediatos para solicitar o ejecutar la eliminación de datos:
    </p>

    <div class="highlight-box">
      <strong>1. Desconexión Autónoma desde el Dashboard (En Tiempo Real):</strong><br>
      Dentro del panel de control de Frant en <em>Configuración ➔ Integraciones ➔ Meta WhatsApp</em>, haga clic en <strong>"Desconectar y Eliminar Datos"</strong>. El sistema revoca los tokens de Meta y purga los registros de vinculación inmediatamente.
    </div>

    <div class="highlight-box">
      <strong>2. Eliminación Automatizada vía Webhook de Meta (Data Deletion Callback):</strong><br>
      Si desvincula la aplicación <strong>Frant</strong> directamente desde su Business Manager de Meta (en <em>Configuración del Negocio ➔ Integraciones ➔ Aplicaciones</em>), Meta invoca de forma automática nuestro webhook:
      <br>
      <code style="background:#FAF8F3; padding:4px 8px; border:1px solid #E2DFD7; font-family:monospace; color:#D9381E; display:inline-block; margin-top:6px;">
        POST https://frant.app/api/v1/meta/data-deletion
      </code>
      <br>
      El sistema responde con un código de confirmación de eliminación rastreable conforme a la especificación oficial de Meta.
    </div>

    <div class="highlight-box">
      <strong>3. Canal Directo por Correo Electrónico:</strong><br>
      Puede solicitar la eliminación total de su cuenta y base de datos escribiendo a <code>contacto@diazlab.online</code> indicando su nombre comercial y NIT. Su petición será ejecutada en menos de 24 horas hábiles.
    </div>

    <h2>10. Derechos de los Titulares (Derechos ARCO y Ley 1581)</h2>
    <p>Conforme al artículo 8 de la Ley 1581 de 2012, el titular de los datos personales tiene derecho a:</p>
    <ul>
      <li><strong>Conocer, actualizar y rectificar</strong> sus datos personales frente a Diaz Lab Automation.</li>
      <li><strong>Solicitar prueba de la autorización</strong> otorgada para el tratamiento.</li>
      <li><strong>Ser informado</strong> sobre el uso que se ha dado a sus datos.</li>
      <li><strong>Revocar la autorización y/o solicitar la supresión</strong> del dato cuando no se respeten los principios, derechos y garantías constitucionales.</li>
      <li><strong>Acceder en forma gratuita</strong> a sus datos personales objeto de tratamiento.</li>
    </ul>

    <h3>Procedimiento y Términos Legales de Respuesta</h3>
    <p>
      Para ejercer cualquiera de estos derechos, remita una solicitud escrita a <code>contacto@diazlab.online</code>. Los tiempos de respuesta observan estrictamente los plazos legales:
    </p>
    <ul>
      <li><strong>Consultas:</strong> Serán atendidas en un término máximo de <strong>diez (10) días hábiles</strong> contados a partir de la fecha de recibo.</li>
      <li><strong>Reclamos (Actualización, Corrección o Supresión):</strong> Serán tramitados en un término máximo de <strong>quince (15) días hábiles</strong> contados a partir del día siguiente a la fecha de su recibo, con posibilidad de prórroga motivada de hasta ocho (8) días hábiles conforme al artículo 15 de la Ley 1581 de 2012.</li>
    </ul>

    <h2>11. Cookies y Almacenamiento Local</h2>
    <p>
      Frant utiliza cookies técnicas esenciales y tokens criptográficos en el almacenamiento local (Local Storage) del navegador exclusivamente para mantener la sesión de autenticación segura del usuario mediante estándares JWT. No utilizamos cookies de rastreo de terceros con fines de perfilamiento publicitario externo.
    </p>

    <h2>12. Canales Oficiales de Contacto Legal</h2>
    <p>Para consultas, aclaraciones o ejercicio de derechos de privacidad:</p>
    <ul>
      <li><strong>Oficial de Privacidad / Área Legal:</strong> <code>contacto@diazlab.online</code></li>
      <li><strong>Atención al Cliente y Soporte:</strong> <code>contacto@diazlab.online</code></li>
      <li><strong>Razón Social:</strong> Diaz Lab Automation</li>
      <li><strong>Domicilio:</strong> Barranquilla, Atlántico, Colombia</li>
      <li><strong>Portal Oficial:</strong> <a href="https://frant.app">https://frant.app</a></li>
    </ul>
  </div>

  <div class="footer">
    &copy; 2026 <strong>Frant (Friendly Automation)</strong> • Desarrollado por <strong>Diaz Lab Automation</strong>.<br>
    Barranquilla, Atlántico, Colombia • Todos los derechos reservados.<br>
    Consulte también nuestros <a href="/terms">Términos y Condiciones Generales de Uso</a>.
  </div>
</body>
</html>`;
}
