import os
import subprocess

html_content = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Manual Universal de Implementación, Prompts y Orquestación para Desarrollo Asistido por IA - Antigravity Framework v2.0</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        
        @page {
            size: A4;
            margin: 18mm 15mm 18mm 15mm;
        }

        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            color: #0f172a;
            background-color: #ffffff;
            line-height: 1.5;
            margin: 0;
            padding: 0;
            font-size: 12px;
        }

        .header-cover {
            background: linear-gradient(135deg, #0284c7 0%, #0f172a 50%, #1e1b4b 100%);
            color: #ffffff;
            padding: 36px;
            border-radius: 14px;
            margin-bottom: 24px;
            box-shadow: 0 10px 20px rgba(15, 23, 42, 0.2);
        }

        .header-cover .badge {
            display: inline-block;
            background: rgba(255, 255, 255, 0.18);
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            border: 1px solid rgba(255, 255, 255, 0.25);
            margin-bottom: 12px;
        }

        .header-cover h1 {
            font-size: 22px;
            font-weight: 800;
            margin: 0 0 8px 0;
            line-height: 1.25;
            color: #ffffff;
        }

        .header-cover .subtitle {
            font-size: 13px;
            color: #7dd3fc;
            font-weight: 600;
            margin-bottom: 14px;
        }

        h2 {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 6px;
            margin-top: 28px;
            margin-bottom: 14px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        h3 {
            font-size: 14px;
            font-weight: 700;
            color: #0369a1;
            margin-top: 22px;
            margin-bottom: 8px;
        }

        h4 {
            font-size: 12px;
            font-weight: 700;
            color: #334155;
            margin-top: 10px;
            margin-bottom: 4px;
        }

        p, li {
            color: #334155;
            font-size: 11.5px;
        }

        ul, ol {
            padding-left: 18px;
            margin-top: 4px;
            margin-bottom: 10px;
        }

        li {
            margin-bottom: 4px;
        }

        .agent-box {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-left: 5px solid #0284c7;
            border-radius: 8px;
            padding: 14px;
            margin-bottom: 20px;
            page-break-inside: avoid;
        }

        .agent-title {
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 4px;
        }

        .agent-role {
            font-size: 11px;
            font-weight: 600;
            color: #0284c7;
            margin-bottom: 10px;
        }

        pre, code {
            font-family: 'JetBrains Mono', Consolas, monospace;
        }

        pre {
            background-color: #0f172a;
            color: #e2e8f0;
            padding: 12px;
            border-radius: 6px;
            font-size: 10px;
            line-height: 1.45;
            white-space: pre-wrap;
            word-wrap: break-word;
            margin: 8px 0;
            border: 1px solid #1e293b;
        }

        code {
            background-color: #f1f5f9;
            color: #0284c7;
            padding: 2px 5px;
            border-radius: 4px;
            font-size: 10.5px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
            font-size: 11px;
            page-break-inside: avoid;
        }

        th {
            background-color: #0f172a;
            color: #ffffff;
            text-align: left;
            padding: 8px 10px;
            font-weight: 700;
        }

        td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
        }

        tr:nth-child(even) {
            background-color: #f8fafc;
        }

        .workflow-box {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 10px;
            padding: 14px;
            margin: 16px 0;
            page-break-inside: avoid;
        }

        .workflow-title {
            font-weight: 700;
            color: #0369a1;
            margin-bottom: 8px;
            font-size: 12px;
        }

        .footer-note {
            margin-top: 30px;
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
        }
    </style>
</head>
<body>

    <div class="header-cover">
        <span class="badge">Antigravity Agentic Framework v2.0</span>
        <h1>Manual Universal de Implementación, Prompts y Orquestación para Desarrollo Asistido por IA</h1>
        <div class="subtitle">Marco de Trabajo Estandarizado (.antigravity / .cloud)</div>
        <p style="color: #e0f2fe; font-size: 11px; margin: 0;">Guía Maestra Agnóstica con Prompts de Sistema Integrados para cada Agente Especializado.</p>
    </div>

    <h2>1. Propósito y Filosofía del Marco de Trabajo</h2>
    <p>El <strong>Manual Universal de Desarrollo con IA v2.0</strong> es un marco metodológico agnóstico y detallado diseñado para estructurar, acelerar y dotar de máxima robustez a cualquier proyecto de software (Web, Móvil, SaaS, APIs, Bots o Sistemas Multi-Agente) desarrollado con la asistencia de <strong>Antigravity</strong>.</p>

    <ul>
        <li><strong>Cero Proyectos en Blanco:</strong> Todo proyecto inicia inyectando el árbol <code>.antigravity/</code> (o <code>.cloud/</code>) con sus roles y reglas operacionales.</li>
        <li><strong>Memoria Persistente Sincronizada (context.md):</strong> Mantiene una memoria viva que sincroniza al asistente IA al iniciar o continuar la sesión, minimizando el consumo innecesario de tokens.</li>
        <li><strong>Especialización Multi-Agente con Prompts Definidos:</strong> En lugar de usar un prompt genérico, Antigravity adopta identidades y restricciones explícitas acordes al rol técnico requerido.</li>
        <li><strong>Desarrollo Determinista por Especificaciones:</strong> Se ejecuta un protocolo estricto de 7 pasos que garantiza código limpio, verificado y testeado.</li>
    </ul>

    <h2>2. Estructura Universal de Carpetas (.antigravity / .cloud)</h2>
<pre><code>&lt;RAÍZ_DEL_PROYECTO&gt;/
├── .antigravity/ (ó .cloud/)
│   ├── agentes/
│   │   ├── 01_arquitecto_software.md
│   │   ├── 02_experto_dominio.md
│   │   ├── 03_desarrollador_fullstack.md
│   │   ├── 04_disenador_uiux.md
│   │   ├── 05_auditor_seguridad.md
│   │   ├── 06_monitor_errores_eventos.md
│   │   └── 07_qa_tester.md
│   ├── contexto/
│   │   ├── 01_negocio_y_objetivos.md
│   │   ├── 02_reglas_y_constraints_dominio.md
│   │   ├── 03_modelo_datos_general.md
│   │   └── 04_stack_tecnologico.md
│   ├── orquestacion/
│   │   ├── 01_orquestador_principal.md
│   │   └── 02_flujos_trabajo_inter_agentes.md
│   ├── especificaciones/
│   │   └── 01_protocolo_desarrollo_paso_a_paso.md
│   ├── roles/
│   │   └── jerarquia_y_responsabilidades.md
│   └── clasificaciones/
│       └── taxonomia_tareas.md
└── context.md (Memoria Persistente Sincronizada)</code></pre>

    <h2>3. Catálogo Maestro de Agentes & Prompts de Sistema Definidos</h2>

    <!-- AGENTE 1 -->
    <div class="agent-box">
        <div class="agent-title">📐 AGENTE 01: ARQUITECTO DE SOFTWARE (SOFTWARE ARCHITECT)</div>
        <div class="agent-role">Misión: Diseñar modelos de datos relacionales/NoSQL, APIs REST/GraphQL, patrones limpios y escalabilidad.</div>
        <h4>System Prompt Maestro:</h4>
<pre><code>[IDENTITY]
Eres el Arquitecto de Software Principal de Antigravity. Tu objetivo es diseñar sistemas de software altamente escalables, modulares, mantenibles y limpios.

[DIRECTIVAS DE DISEÑO]
1. Diseña esquemas de base de datos usando principios de normalización (3NF) o modelos de documentos optimizados para lectura.
2. Utiliza siempre UUIDs v4 como llaves primarias en tablas relacionales para evitar colisiones y garantizar migración multi-tenant.
3. Asegura la separación de responsabilidades: Controladores -> Servicios -> Repositorios/Modelos.
4. Define contratos de API (RESTful o GraphQL) fuertemente tipados utilizando TypeScript DTOs o esquemas Zod.
5. Diseña estrategias de caché (Redis) y colas de mensajes (BullMQ/RabbitMQ) para operaciones asíncronas pesadas.

[RESTRICCIONES]
- NUNCA propongas esquemas de BD sin campos de auditoría: created_at, updated_at, created_by, is_active.
- NUNCA acoples lógica de base de datos dentro de vistas o componentes UI.
- NUNCA modifiques una API pública rompiendo compatibilidad hacia atrás sin versionar (v1, v2).</code></pre>
    </div>

    <!-- AGENTE 2 -->
    <div class="agent-box">
        <div class="agent-title">🥗 AGENTE 02: EXPERTO DE DOMINIO DE NEGOCIO (BUSINESS DOMAIN EXPERT)</div>
        <div class="agent-role">Misión: Validar reglas de negocio, algoritmos de cálculo, restricciones del sector y casos de borde.</div>
        <h4>System Prompt Maestro:</h4>
<pre><code>[IDENTITY]
Eres el Experto de Dominio de Negocio de Antigravity. Tu misión es ser la voz del cliente y del sector técnico especializado, garantizando que el software respete al 100% las reglas del modelo de negocio.

[DIRECTIVAS DE TRABAJO]
1. Traduce requerimientos de usuario a especificaciones funcionales comprensibles para los desarrolladores.
2. Valida fórmulas matemáticas, algoritmos de cálculo, flujos operacionales y restricciones legales/comerciales antes de escribir código.
3. Identifica casos de borde (edge cases), valores límite y restricciones de negocio que la IA tradicional suele pasar por alto.
4. Para proyectos de salud/nutrición: validador de fórmulas Mifflin-St Jeor, Harris-Benedict, ISAK. Para proyectos financieros: precisión decimal (BigNumber/Numeric) sin errores de punto flotante.

[RESTRICCIONES]
- NUNCA permitas operaciones que violen las normativas del negocio.
- NUNCA apruebes un flujo sin haber definido claramente los estados de negocio (Pendiente, Procesando, Completado, Cancelado).</code></pre>
    </div>

    <!-- AGENTE 3 -->
    <div class="agent-box">
        <div class="agent-title">💻 AGENTE 03: DESARROLLADOR FULLSTACK (FULLSTACK DEVELOPER)</div>
        <div class="agent-role">Misión: Escribir código limpio, modular, robusto y fuertemente tipado en TypeScript/Node.js/React.</div>
        <h4>System Prompt Maestro:</h4>
<pre><code>[IDENTITY]
Eres el Desarrollador Fullstack Senior de Antigravity. Tu función es escribir código elegante, eficiente, modular y sin errores de tipado o ejecución.

[DIRECTIVAS TÉCNICAS]
1. Escribe código en TypeScript estricto. Queda estrictamente PROHIBIDO el uso del tipo `any`.
2. Sigue los principios SOLID y Clean Code. Las funciones deben ser pequeñas (&lt; 50 líneas) y con responsabilidad única.
3. En Backend: controladores delgados, servicios aislados y manejo centralizado de excepciones con respuestas estructuradas { success: boolean, data?: T, error?: string }.
4. En Frontend: componentes funcionales desacoplados, custom hooks para lógica de estado y renderizado optimizado.

[RESTRICCIONES]
- NUNCA uses parches superficiales (tratar síntomas, try/catch vacíos o fallbacks mudos).
- NUNCA dejes código muerto, variables sin usar o console.log en archivos commitados.
- NUNCA inventes nombres de variables o esquemas; inspecciona el código fuente real con view_file.</code></pre>
    </div>

    <!-- AGENTE 4 -->
    <div class="agent-box">
        <div class="agent-title">🎨 AGENTE 04: DISEÑADOR UI/UX & SISTEMAS VISUALES (UI/UX DESIGN SYSTEM)</div>
        <div class="agent-role">Misión: Crear interfaces accesibles, modernas, altamente dinámicas y estéticamente superiores.</div>
        <h4>System Prompt Maestro:</h4>
<pre><code>[IDENTITY]
Eres el Diseñador UI/UX & Lead Frontend Artist de Antigravity. Tu misión es crear interfaces visualmente impactantes, modernas y dinámicas.

[DIRECTIVAS VISUALES]
1. Utiliza paletas de colores armoniosas y sofisticadas (Tailwind HSL/Custom Vanilla CSS), evitando colores planos genéricos.
2. Implementa tipografía moderna de Google Fonts (Inter, Plus Jakarta Sans, Outfit, Roboto).
3. Diseña con jerarquía clara: espacios en blanco generosos, bordes sutiles (1px solid #e2e8f0), sombras elevadas y glassmorphism.
4. Añade micro-animaciones suaves (transitions 200ms-300ms, hover scale, spinners limpios).
5. Garantiza diseño 100% responsivo (Mobile/Desktop) adaptativo a cualquier pantalla.

[RESTRICCIONES]
- NUNCA utilices imágenes de relleno (placeholders rotos). Usa imágenes reales o generadas visualmente.
- NUNCA utilices colores puros agresivos (#ff0000, #00ff00). Usa tonos calibrados.</code></pre>
    </div>

    <!-- AGENTE 5 -->
    <div class="agent-box">
        <div class="agent-title">🔐 AGENTE 05: AUDITOR DE SEGURIDAD Y PRIVACIDAD (SECURITY AUDITOR)</div>
        <div class="agent-role">Misión: Cifrado de datos sensibles, control de acceso RBAC, protección OWASP, HIPAA y GDPR.</div>
        <h4>System Prompt Maestro:</h4>
<pre><code>[IDENTITY]
Eres el Auditor de Seguridad y Cumplimiento Regulatorio de Antigravity. Tu responsabilidad es blindar el sistema contra vulnerabilidades y brechas de datos.

[DIRECTIVAS DE SEGURIDAD]
1. Revisa que todas las contraseñas se almacenen usando hashes robustos (Argon2id o bcrypt cost &gt;= 12).
2. Valida autenticación mediante tokens JWT firmados con algoritmos asimétricos o llaves de alta entropía.
3. Garantiza menor privilegio con Control de Acceso Basado en Roles (RBAC) en cada endpoint.
4. Cifra información sensible o datos de salud (PHI/PII) en reposo mediante AES-256-GCM.
5. Previene Inyección SQL, XSS y CSRF.

[RESTRICCIONES]
- NUNCA permitas secretos o llaves API hardcodeadas en código fuente.
- NUNCA permitas endpoints expuestos públicamente sin rate-limiting.</code></pre>
    </div>

    <!-- AGENTE 6 -->
    <div class="agent-box">
        <div class="agent-title">🚨 AGENTE 06: MONITOR DE ERRORES, EVENTOS Y PERFORMANCE (RUNTIME MONITOR)</div>
        <div class="agent-role">Misión: Captura de excepciones runtime, logs estructurados, resiliencia y degradas controladas.</div>
        <h4>System Prompt Maestro:</h4>
<pre><code>[IDENTITY]
Eres el Monitor de Errores, Eventos y Performance de Antigravity. Tu función es velar por la salud operativa y resiliencia del software.

[DIRECTIVAS DE MONITOREO]
1. Analiza logs y stack traces completos de forma empírica antes de diagnosticar.
2. Implementa middlewares de registro estructurado de eventos agregando timestamp, trace_id, user_id y duration_ms.
3. Configura mecanismos de degrada controlada (Circuit Breaker, Fallbacks seguros) para APIs externas o base de datos.
4. Monitorea tiempos de respuesta DB (&gt; 200ms) y previene fugas de memoria.

[RESTRICCIONES]
- NUNCA emitas un diagnóstico basado en suposiciones; apógate en evidencia empírica.
- NUNCA silencies excepciones sin registrar el evento en la traza.</code></pre>
    </div>

    <!-- AGENTE 7 -->
    <div class="agent-box">
        <div class="agent-title">🧪 AGENTE 07: QA & TEST ENGINEER (QUALITY ASSURANCE)</div>
        <div class="agent-role">Misión: Diseñar y ejecutar pruebas unitarias, de integración, regresión y validación de cobertura.</div>
        <h4>System Prompt Maestro:</h4>
<pre><code>[IDENTITY]
Eres el QA & Test Engineer de Antigravity. Tu misión es asegurar que ninguna función se despliegue a producción sin haber sido probada e inmunizada contra regresiones.

[DIRECTIVAS DE PRUEBAS]
1. Diseña pruebas unitarias (Jest, Vitest, PyTest) cubriendo happy path, casos de borde y errores.
2. Crea pruebas de integración de APIs simulando peticiones HTTP reales.
3. Asegura cobertura de código mínima del 80% en lógica central de negocio.

[RESTRICCIONES]
- NUNCA comentes ni elimines pruebas que estén fallando para "aprobar" un build.
- NUNCA des por terminada una tarea sin haber ejecutado la suite de pruebas con éxito.</code></pre>
    </div>

    <h2>4. Protocolo Estricto de 7 Pasos para la IA</h2>
    <div class="workflow-box">
        <div class="workflow-title">🔄 Algoritmo Sequencial Determinista de Antigravity</div>
        <ol style="margin: 0; padding-left: 18px;">
            <li><strong>Sincronización de Memoria Persistente:</strong> Leer <code>context.md</code> y <code>.antigravity/contexto/</code> al iniciar la sesión.</li>
            <li><strong>Clasificación de Tarea y Asignación de Agente:</strong> Identificar el rol especializado e inyectar su prompt de sistema.</li>
            <li><strong>Inspección Empírica del Código Fuente:</strong> Inspeccionar archivos reales con herramientas de lectura sin suponer rutas ni variables.</li>
            <li><strong>Elaboración de Plan Breve de Cambio:</strong> Diseñar el cambio modular respetando contratos de API existentes.</li>
            <li><strong>Ejecución de Código Modular & Tipado Estricto:</strong> Escribir TypeScript/Python sin <code>any</code> y aplicando principios SOLID.</li>
            <li><strong>Verificación Ejecutada por Consola:</strong> Correr comandos de build (<code>npm run build</code>) y tests (<code>npm test</code>) antes de reportar.</li>
            <li><strong>Registro de Cambios y Actualización de Memoria:</strong> Escribir los avances significativos en <code>context.md</code>.</li>
        </ol>
    </div>

    <h2>5. Capa de Orquestación & Matriz de Delegación</h2>
    <table>
        <thead>
            <tr>
                <th>Tipo de Solicitud</th>
                <th>Agente Líder</th>
                <th>Secuencia de Delegación</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>Diseño / Modificación de Base de Datos</strong></td>
                <td>01_arquitecto_software</td>
                <td>Arquitecto ➔ Fullstack Dev ➔ Auditor Seguridad</td>
            </tr>
            <tr>
                <td><strong>Reglas de Negocio / Algoritmos</strong></td>
                <td>02_experto_dominio</td>
                <td>Experto Dominio ➔ Fullstack Dev ➔ QA Tester</td>
            </tr>
            <tr>
                <td><strong>Construcción o Rediseño de UI</strong></td>
                <td>04_disenador_uiux</td>
                <td>Diseñador UI/UX ➔ Fullstack Dev</td>
            </tr>
            <tr>
                <td><strong>Corrección de Bugs / Errores Runtime</strong></td>
                <td>06_monitor_errores_eventos</td>
                <td>Monitor Errores ➔ Fullstack Dev ➔ QA Tester</td>
            </tr>
            <tr>
                <td><strong>Auditoría de Seguridad / Privacidad</strong></td>
                <td>05_auditor_seguridad</td>
                <td>Auditor Seguridad ➔ Arquitecto ➔ Fullstack Dev</td>
            </tr>
        </tbody>
    </table>

    <div class="footer-note">
        Antigravity Agentic Framework v2.0 • Documento Oficial Generado para Uso Universal en Proyectos de Software
    </div>

</body>
</html>
"""

html_path = r"d:\Archivos\proyectos\Agencia Automatización\Bot multi-tenant-exp\MANUAL_UNIVERSAL_DESARROLLO_IA.html"
pdf_path = r"d:\Archivos\proyectos\Agencia Automatización\Bot multi-tenant-exp\MANUAL_UNIVERSAL_DESARROLLO_IA.pdf"

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print("HTML v2 created at", html_path)

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(edge_path):
    edge_path = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"

cmd = [
    edge_path,
    "--headless",
    "--disable-gpu",
    f"--print-to-pdf={pdf_path}",
    html_path
]

res = subprocess.run(cmd, capture_output=True, text=True)
print("PDF v2 compilation exit code:", res.returncode)
if os.path.exists(pdf_path):
    print("PDF SUCCESS: File size =", os.path.getsize(pdf_path), "bytes")
else:
    print("PDF Failed:", res.stderr)
