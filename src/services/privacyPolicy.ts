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
      El presente documento constituye la Política de Privacidad y Tratamiento de Datos Personales de la plataforma <strong>Frant</strong> (derivado de <em>Friendly Automation</em>), desarrollada, operada y de propiedad de <strong>Diaz Lab Automation</strong> (en adelante, "la Empresa", "nosotros" o "Frant"), con domicilio principal en Bogotá D.C., Colombia, y con canal de contacto oficial en <code>contactanos@diazlab.online</code> y <code>legal@diazlab.online</code>.
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

    <h2>7. Cumplimiento Específico con Políticas de Meta for Developers</h2>
    <div class="callout-meta">
      <strong>Garantías WhatsApp Cloud API:</strong><br>
      • Los tokens de acceso de Meta se almacenan con cifrado simétrico en variables aisladas y bases de datos protegidas.<br>
      • El webhook de eventos de Meta solo procesa mensajes correspondientes al número registrado por cada cliente y descarta cualquier evento no autorizado.<br>
      • Cumplimos rigurosamente con la <em>WhatsApp Commerce Policy</em> y los <em>Meta Platform Terms</em>.
    </div>

    <h2>8. Mecanismos Autónomos de Eliminación de Datos (Data Deletion Callback)</h2>
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
      Puede solicitar la eliminación total de su cuenta y base de datos escribiendo a <code>legal@diazlab.online</code> o <code>soporte@diazlab.online</code> indicando su nombre comercial y NIT. Su petición será ejecutada en menos de 24 horas hábiles.
    </div>

    <h2>9. Derechos de los Titulares (Derechos ARCO y Ley 1581)</h2>
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
      Para ejercer cualquiera de estos derechos, remita una solicitud escrita a <code>legal@diazlab.online</code>. Los tiempos de respuesta observan estrictamente los plazos legales:
    </p>
    <ul>
      <li><strong>Consultas:</strong> Serán atendidas en un término máximo de <strong>diez (10) días hábiles</strong> contados a partir de la fecha de recibo.</li>
      <li><strong>Reclamos (Actualización, Corrección o Supresión):</strong> Serán tramitados en un término máximo de <strong>quince (15) días hábiles</strong> contados a partir del día siguiente a la fecha de su recibo, con posibilidad de prórroga motivada de hasta ocho (8) días hábiles conforme al artículo 15 de la Ley 1581 de 2012.</li>
    </ul>

    <h2>10. Cookies y Almacenamiento Local</h2>
    <p>
      Frant utiliza cookies técnicas esenciales y tokens criptográficos en el almacenamiento local (Local Storage) del navegador exclusivamente para mantener la sesión de autenticación segura del usuario mediante estándares JWT. No utilizamos cookies de rastreo de terceros con fines de perfilamiento publicitario externo.
    </p>

    <h2>11. Canales Oficiales de Contacto Legal</h2>
    <p>Para consultas, aclaraciones o ejercicio de derechos de privacidad:</p>
    <ul>
      <li><strong>Oficial de Privacidad / Área Legal:</strong> <code>legal@diazlab.online</code></li>
      <li><strong>Atención al Cliente y Soporte:</strong> <code>soporte@diazlab.online</code> / <code>contactanos@diazlab.online</code></li>
      <li><strong>Razón Social:</strong> Diaz Lab Automation</li>
      <li><strong>Domicilio:</strong> Bogotá D.C., Colombia</li>
      <li><strong>Portal Oficial:</strong> <a href="https://frant.app">https://frant.app</a></li>
    </ul>
  </div>

  <div class="footer">
    &copy; 2026 <strong>Frant (Friendly Automation)</strong> • Desarrollado por <strong>Diaz Lab Automation</strong>.<br>
    Bogotá D.C., Colombia • Todos los derechos reservados.<br>
    Consulte también nuestros <a href="/terms">Términos y Condiciones Generales de Uso</a>.
  </div>
</body>
</html>`;
}
