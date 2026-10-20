export function getTermsOfServiceHTML(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Términos y Condiciones de Servicio | Frant by Diaz Lab Automation</title>
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
    .callout-warning {
      background-color: #fffbeb;
      border-left: 4px solid #d97706;
      padding: 14px 18px;
      margin: 18px 0;
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
      <a href="/terms" class="active">Términos de Servicio</a>
      <a href="/privacy">Política de Privacidad</a>
    </div>
  </nav>

  <div class="header">
    <h1>Términos y Condiciones Generales de Uso</h1>
    <p>Plataforma SaaS de Gestión Empresarial (ERP) y Automatización con Inteligencia Artificial</p>
  </div>

  <div class="container">
    <div class="meta-badge">
      📅 Última actualización: <strong>19 de octubre de 2026</strong> | Versión contractual 2.4
    </div>

    <p>
      Bienvenido a <strong>Frant</strong> (derivado de <em>Friendly Automation</em>), plataforma desarrollada, operada y de propiedad exclusiva de <strong>Diaz Lab Automation</strong> (en adelante, "la Empresa", "nosotros" o "Frant"), con domicilio en Bogotá D.C., Colombia.
    </p>
    <p>
      Los presentes Términos y Condiciones Generales de Uso (los "Términos") rigen el acceso, suscripción, navegación y utilización de la plataforma web, APIs, agentes de Inteligencia Artificial y servicios conexos disponibles a través del dominio <strong>https://frant.app</strong> y sus respectivos subdominios.
    </p>

    <div class="highlight-box">
      <strong>Aceptación Vinculante:</strong> Al crear una cuenta, iniciar sesión mediante credenciales directas o servicios de terceros (incluyendo Google OAuth o Meta Embedded Signup), o utilizar cualquiera de las herramientas de Frant, usted declara que actúa como persona natural mayor de edad con plena capacidad legal o en representación autorizada de una persona jurídica, y acepta quedar legalmente vinculado por estos Términos y nuestra <a href="/privacy" style="color:var(--primary); font-weight:600;">Política de Privacidad</a>. Si no está de acuerdo, debe abstenerse inmediatamente de usar el servicio.
    </div>

    <h2>1. Identificación del Operador</h2>
    <ul>
      <li><strong>Denominación comercial:</strong> Frant (Friendly Automation).</li>
      <li><strong>Razón Social del Desarrollador y Operador:</strong> Diaz Lab Automation.</li>
      <li><strong>Domicilio principal:</strong> Bogotá D.C., República de Colombia.</li>
      <li><strong>Contacto general y soporte:</strong> <code>contactanos@diazlab.online</code> / <code>soporte@diazlab.online</code>.</li>
      <li><strong>Contacto para asuntos legales y notificaciones:</strong> <code>legal@diazlab.online</code>.</li>
      <li><strong>Sitio web oficial:</strong> <a href="https://frant.app" target="_blank" rel="noopener">https://frant.app</a>.</li>
    </ul>

    <h2>2. Descripción del Servicio y Modelo SaaS</h2>
    <p>
      Frant opera como una solución de software como servicio (SaaS) multi-inquilino (multi-tenant) diseñada para comercios, agencias y empresas de diversos sectores (incluyendo retail, gastronomía, ópticas, salud y servicios profesionales). El ecosistema integra:
    </p>
    <ol>
      <li><strong>Módulos de Gestión ERP & POS:</strong> Control de inventarios en tiempo real, gestión de ventas de mostrador, comanderos digitales para restaurantes, cotizaciones, órdenes de compra y gestión de clientes.</li>
      <li><strong>Facturación y Documentos Electrónicos:</strong> Módulos de facturación electrónica e integración con proveedores tecnológicos avalados ante la Dirección de Impuestos y Aduanas Nacionales (DIAN) de Colombia u homólogos tributarios.</li>
      <li><strong>Automatización con Agentes de Inteligencia Artificial:</strong> Asistentes conversacionales inteligentes alimentados por modelos avanzados de lenguaje (LLMs como Google Gemini y OpenAI) orientados a la atención al cliente, reservas, catálogo y gestión de pedidos.</li>
      <li><strong>Integración con Meta WhatsApp Cloud API:</strong> Conectividad oficial mediante la Graph API de Meta para el envío y recepción de mensajes empresariales a través de líneas autorizadas de WhatsApp Business.</li>
    </ol>

    <h2>3. Aislamiento Lógico de Inquilinos (Multi-Tenant) y Seguridad de Cuentas</h2>
    <p>
      Cada cliente empresarial opera bajo un identificador exclusivo de inquilino (<code>client_id</code>). Frant garantiza el aislamiento lógico riguroso entre bases de datos, catálogos, credenciales y conversaciones de cada tienda.
    </p>
    <ul>
      <li><strong>Custodia de Credenciales:</strong> El Usuario es el único responsable de salvaguardar sus contraseñas, tokens de autenticación JWT y claves de acceso de usuarios empleados o cajeros.</li>
      <li><strong>Notificación de Vulneraciones:</strong> En caso de sospecha de acceso no autorizado, el Usuario debe notificar inmediatamente a <code>soporte@diazlab.online</code> para congelar credenciales.</li>
      <li><strong>Cifrado de Seguridad:</strong> Las contraseñas se almacenan mediante hashing criptográfico robusto (bcrypt/PBKDF2) y las comunicaciones se cifran en tránsito mediante TLS 1.3.</li>
    </ul>

    <h2>4. Propiedad Intelectual y Licencia de Uso Limitada</h2>
    <div class="callout-info">
      <strong>Usted conserva la propiedad total de sus datos:</strong> Todos los datos de su inventario, precios, ventas, facturas, clientes finales e información empresarial son de propiedad exclusiva de su negocio.
    </div>
    <p>
      Por su parte, <strong>Diaz Lab Automation</strong> es el titular exclusivo de todos los derechos de propiedad intelectual e industrial sobre el software Frant, incluyendo el código fuente, código objeto, arquitectura de software, bases de datos estructurales, algoritmos, diseños de interfaz (UI), experiencia de usuario (UX), logotipos, isotipos y marcas comerciales.
    </p>
    <p>
      Al contratar el servicio, se otorga al Usuario una <strong>licencia no exclusiva, revocable, intransferible y no sublicenciable</strong> para acceder y usar la plataforma en la nube durante la vigencia de su suscripción. Queda estrictamente prohibido:
    </p>
    <ul>
      <li>Efectuar ingeniería inversa, descompilar o intentar extraer el código fuente de Frant.</li>
      <li>Revender, alquilar, arrendar o comercializar el software a terceros sin un contrato previo de distribución/marca blanca suscrito con Diaz Lab Automation.</li>
      <li>Eludir o modificar las medidas de seguridad perimetrales, controles de acceso multi-tenant o límites de cuotas de API.</li>
    </ul>

    <h2>5. Planes de Suscripción, Tarifas y Facturación</h2>
    <ul>
      <li><strong>Esquema de Tarifas:</strong> Los servicios se contratan bajo planes mensuales o anuales cuyas tarifas, características y cuotas de consumo (mensajes, usuarios, sucursales) se publican en el sitio web o en la cotización comercial respectiva.</li>
      <li><strong>Pasarelas de Pago Autorizadas:</strong> Los pagos se procesan a través de pasarelas de pago de terceros certificadas PCI-DSS (Wompi, Stripe u otras habilitadas en la plataforma). Frant no almacena números de tarjetas de crédito ni códigos de seguridad CVV.</li>
      <li><strong>Renovación y Cancelación:</strong> Las suscripciones se renuevan periódicamente de acuerdo con el ciclo seleccionado. El Usuario puede solicitar la cancelación de su suscripción en cualquier momento antes de la fecha de corte. Salvo disposición legal en contrario (como el derecho de retracto aplicable conforme a la Ley 1480 de 2011 dentro de los primeros 5 días hábiles siguientes a la contratación sin consumo efectivo), las mensualidades ya devengadas no son reembolsables.</li>
      <li><strong>Suspensión por Mora:</strong> La falta de pago faculta a Frant para suspender temporalmente el acceso a los módulos tras previo aviso de gracia de 5 días calendario.</li>
    </ul>

    <h2>6. Política de Uso Aceptable y Normas de WhatsApp (Meta)</h2>
    <p>
      El Usuario se compromete expresamente a utilizar la plataforma en estricto cumplimiento de la ley colombiana, las leyes internacionales aplicables y las <strong>Políticas de WhatsApp Business y Meta Platform Terms</strong>. Queda terminantemente prohibido:
    </p>
    <ul>
      <li>Enviar mensajes masivos no solicitados (SPAM) a usuarios que no hayan otorgado su consentimiento previo y expreso (opt-in).</li>
      <li>Comercializar productos o servicios prohibidos por la <em>WhatsApp Commerce Policy</em> (drogas, armas, servicios para adultos, apuestas no autorizadas, suplementos médicos no verificados, etc.).</li>
      <li>Incurrir en suplantación de identidad (phishing), fraude, acoso, difamación o difusión de contenido malicioso.</li>
      <li>Utilizar métodos de automatización que violen los Términos de Servicio de Meta. Frant canaliza sus conexiones de WhatsApp prioritariamente a través de la API Oficial de Meta (WhatsApp Business Cloud API).</li>
    </ul>
    <div class="callout-warning">
      <strong>Facultad de Suspensión Preventiva:</strong> En caso de que Meta reporte un número de teléfono por violaciones reiteradas de política o bloqueo de cuenta, o ante quejas fundamentadas de terceros por spam, Diaz Lab Automation se reserva el derecho de inhabilitar temporal o definitivamente el conector de mensajería del inquilino infractor sin responsabilidad de indemnización.
    </div>

    <h2>7. Servicios de Terceros, APIs e Inteligencia Artificial</h2>
    <p>
      El funcionamiento de Frant involucra la interacción con proveedores tecnológicos de primer nivel:
    </p>
    <ul>
      <li><strong>Meta Platforms, Inc.:</strong> Para la entrega y recepción de mensajes de WhatsApp Business Cloud API.</li>
      <li><strong>Google Cloud & OpenAI:</strong> Para los modelos de procesamiento de lenguaje natural (LLM) que dan vida a los agentes de IA.</li>
      <li><strong>Proveedores de Nube y Almacenamiento:</strong> Servidores en la nube (VPS) y buckets de almacenamiento de objetos (AWS S3) para archivos multimedia.</li>
    </ul>
    <div class="highlight-box">
      <strong>Supervisión Humana y Deslinde de IA:</strong> Los agentes de Inteligencia Artificial son herramientas de asistencia y automatización. Si bien se diseñan con altos estándares de precisión, el Usuario comprende y acepta que los modelos de lenguaje pueden generar ocasionalmente imprecisiones ("alucinaciones"). El Usuario es el responsable de auditar las respuestas del bot, definir los precios y políticas de su comercio, y mantener supervisión humana sobre pedidos críticos y cotizaciones.
    </div>
    <p>
      <strong>Privacidad de Prompts:</strong> Diaz Lab Automation garantiza contractualmente que los datos, recetas comerciales, conversaciones de WhatsApp y prompts de cada cliente <strong>NUNCA son comercializados ni utilizados para re-entrenar modelos públicos de terceros</strong>.
    </p>

    <h2>8. Niveles de Servicio (SLA) y Mantenimiento</h2>
    <p>
      Diaz Lab Automation procura mantener una disponibilidad operativa (uptime) objetivo del <strong>99.5%</strong> anual en su infraestructura central.
    </p>
    <p>
      No se considerarán caídas del servicio imputables a Frant:
    </p>
    <ul>
      <li>Interrupciones generales de internet, fallas en proveedores de telecomunicaciones o caídas de infraestructura global de Meta (WhatsApp), Google o AWS.</li>
      <li>Ventanas de mantenimiento programadas informadas con al menos 24 horas de antelación.</li>
      <li>Fallas ocasionadas por configuraciones erróneas, suspensiones de líneas en Meta Business Manager o credenciales caducadas por parte del propio Usuario.</li>
    </ul>

    <h2>9. Suspensión y Terminación del Servicio</h2>
    <ul>
      <li><strong>Terminación por el Usuario:</strong> El Usuario puede dar de baja su cuenta en cualquier momento solicitándolo por los canales de soporte o desactivando sus suscripciones.</li>
      <li><strong>Terminación por Frant:</strong> Frant podrá suspender o terminar el acceso inmediato en caso de: (i) violación grave de estos Términos o de las políticas de Meta; (ii) mora superior a 15 días calendario; o (iii) orden de autoridad judicial o administrativa competente.</li>
      <li><strong>Destino de los Datos tras la Baja:</strong> Tras la cancelación definitiva, el Usuario podrá solicitar la exportación de su histórico de ventas e inventario en formato estructurado (CSV/JSON) dentro de los 30 días calendario siguientes. Vencido este plazo, los datos se eliminarán o anonimizarán de manera segura conforme a nuestra Política de Privacidad.</li>
    </ul>

    <h2>10. Limitación de Responsabilidad</h2>
    <p>
      En la medida máxima permitida por la legislación aplicable, Diaz Lab Automation no será responsable por daños indirectos, lucro cesante, pérdidas comerciales, daño emergente derivado de la interrupción temporal de servicios de terceros (como bloqueos de números aplicados directamente por Meta a discreción de sus filtros de spam) o de decisiones comerciales adoptadas con base en recomendaciones de agentes de IA sin supervisión humana.
    </p>
    <p>
      La responsabilidad pecuniaria total acumulada de Diaz Lab Automation frente al Usuario por cualquier reclamación derivada de estos Términos estará limitada a la suma equivalente a lo efectivamente pagado por el Usuario en los tres (3) meses inmediatamente anteriores al hecho que dio origen a la reclamación.
    </p>

    <h2>11. Legislación Aplicable, Domicilio y Jurisdicción</h2>
    <p>
      Estos Términos y Condiciones se rigen e interpretan de conformidad con las <strong>leyes de la República de Colombia</strong> (en particular la Ley 527 de 1999 de Comercio Electrónico, Ley 1480 de 2011 - Estatuto del Consumidor, Ley 1581 de 2012 de Protección de Datos Personales y demás normas concordantes).
    </p>
    <p>
      Cualquier discrepancia o controversia que surja entre las partes se intentará solucionar inicialmente por la vía del arreglo directo en un plazo máximo de treinta (30) días calendario. De persistir la controversia, las partes se someterán a la jurisdicción ordinaria de los jueces de la ciudad de <strong>Bogotá D.C., Colombia</strong>, renunciando expresamente a cualquier otro fuero que pudiera corresponderles por razón de sus domicilios presentes o futuros.
    </p>

    <h2>12. Modificaciones a los Términos</h2>
    <p>
      Diaz Lab Automation se reserva el derecho de actualizar o modificar estos Términos en cualquier momento para reflejar cambios tecnológicos, actualizaciones de leyes o nuevos requerimientos de las plataformas de Meta o Google. Las modificaciones sustanciales serán notificadas a través de la plataforma o al correo electrónico registrado con al menos quince (15) días de antelación a su entrada en vigencia. El uso continuo de la plataforma tras dicho plazo constituye aceptación plena de las modificaciones.
    </p>

    <h2>13. Canales de Contacto y Notificaciones</h2>
    <p>
      Para cualquier duda, solicitud de soporte, reporte de incidentes o notificación legal:
    </p>
    <ul>
      <li><strong>Correo de Soporte Técnico:</strong> <code>soporte@diazlab.online</code></li>
      <li><strong>Correo de Asuntos Legales y Notificaciones Judiciales:</strong> <code>legal@diazlab.online</code></li>
      <li><strong>Atención Comercial y General:</strong> <code>contactanos@diazlab.online</code></li>
      <li><strong>Portal Web:</strong> <a href="https://frant.app">https://frant.app</a></li>
    </ul>
  </div>

  <div class="footer">
    &copy; 2026 <strong>Frant (Friendly Automation)</strong> • Desarrollado por <strong>Diaz Lab Automation</strong>.<br>
    Bogotá D.C., Colombia • Todos los derechos reservados.<br>
    Consulte también nuestra <a href="/privacy">Política de Privacidad y Tratamiento de Datos</a>.
  </div>
</body>
</html>`;
}
