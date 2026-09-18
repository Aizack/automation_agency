import os
import subprocess

html_content = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Manual Universal de Implementación y Orquestación para Desarrollo Asistido por IA</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;700;800&display=swap');
        
        @page {
            size: A4;
            margin: 20mm 15mm 20mm 15mm;
        }

        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            color: #1e293b;
            background-color: #ffffff;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            font-size: 13px;
        }

        .header-cover {
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0369a1 100%);
            color: #ffffff;
            padding: 40px;
            border-radius: 16px;
            margin-bottom: 30px;
            box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.25);
        }

        .header-cover h1 {
            font-size: 26px;
            font-weight: 800;
            margin: 0 0 10px 0;
            letter-spacing: -0.5px;
            color: #f8fafc;
        }

        .header-cover .subtitle {
            font-size: 15px;
            color: #38bdf8;
            font-weight: 600;
            margin-bottom: 20px;
        }

        .header-cover .badge {
            display: inline-block;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        h2 {
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 8px;
            margin-top: 30px;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
        }

        h3 {
            font-size: 15px;
            font-weight: 600;
            color: #1e3a8a;
            margin-top: 20px;
            margin-bottom: 10px;
        }

        p, li {
            color: #334155;
            font-size: 13px;
        }

        ul, ol {
            padding-left: 20px;
        }

        li {
            margin-bottom: 6px;
        }

        .card-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin: 20px 0;
        }

        .card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 4px solid #0284c7;
            padding: 14px;
            border-radius: 8px;
            page-break-inside: avoid;
        }

        .card h4 {
            margin: 0 0 6px 0;
            font-size: 13px;
            color: #0f172a;
        }

        .card p {
            margin: 0;
            font-size: 12px;
            color: #64748b;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 12px;
            page-break-inside: avoid;
        }

        th {
            background-color: #0f172a;
            color: #ffffff;
            text-align: left;
            padding: 10px 12px;
            font-weight: 600;
            border-top-left-radius: 6px;
            border-top-right-radius: 6px;
        }

        td {
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
        }

        tr:nth-child(even) {
            background-color: #f8fafc;
        }

        pre, code {
            font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
            background-color: #0f172a;
            color: #38bdf8;
            border-radius: 6px;
        }

        pre {
            padding: 14px;
            font-size: 11px;
            overflow-x: auto;
            line-height: 1.5;
            page-break-inside: avoid;
        }

        code {
            padding: 2px 6px;
            font-size: 11px;
        }

        .workflow-box {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 12px;
            padding: 16px;
            margin: 20px 0;
            page-break-inside: avoid;
        }

        .workflow-title {
            font-weight: 700;
            color: #0369a1;
            margin-bottom: 10px;
            font-size: 13px;
        }

        .alert-box {
            background-color: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 12px 16px;
            border-radius: 6px;
            margin: 16px 0;
            color: #991b1b;
            font-size: 12px;
        }

        .footer-note {
            margin-top: 40px;
            border-top: 1px solid #e2e8f0;
            padding-top: 14px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
        }
    </style>
</head>
<body>

    <div class="header-cover">
        <span class="badge">Antigravity Agentic Framework</span>
        <h1>Manual Universal de Implementación y Orquestación para Desarrollo Asistido por IA</h1>
        <div class="subtitle">Marco de Trabajo Estandarizado (.antigravity / .cloud)</div>
        <p style="color: #cbd5e1; font-size: 12px; margin: 0;">Diseñado para ser agnóstico, escalable y reutilizable en cualquier proyecto de software.</p>
    </div>

    <h2>1. Propósito y Filosofía del Marco de Trabajo</h2>
    <p>El <strong>Manual Universal de Desarrollo con IA</strong> es un marco metodológico diseñado para estructurar, acelerar y fortalecer cualquier proyecto de software (Web, Móvil, SaaS, APIs, Bots o Agentes) desarrollado con la asistencia de <strong>Antigravity</strong>.</p>

    <div class="card-grid">
        <div class="card">
            <h4>1. Cero Proyectos en Blanco</h4>
            <p>No iniciar el desarrollo desde una terminal vacía. Todo proyecto comienza inyectando el contexto, los agentes y las reglas operacionales.</p>
        </div>
        <div class="card">
            <h4>2. Memoria Persistente (context.md)</h4>
            <p>Sincronización rápida al inicio de la sesión para eliminar consumo excesivo de tokens y asegurar la memoria del proyecto.</p>
        </div>
        <div class="card">
            <h4>3. Especialización Multi-Agente</h4>
            <p>Roles claramente definidos (Arquitectura, Dominio, Fullstack, UI/UX, Seguridad, Monitoreo y QA) en lugar de prompts genéricos.</p>
        </div>
        <div class="card">
            <h4>4. Desarrollo por Especificaciones</h4>
            <p>La IA sigue un protocolo estricto determinista de 7 pasos en lugar de adivinar o improvisar.</p>
        </div>
    </div>

    <h2>2. Estructura Universal de Carpetas (.antigravity / .cloud)</h2>
    <p>Todo nuevo proyecto debe estructurarse desde el día 1 con la siguiente arquitectura organizativa:</p>

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
│   │   ├── 01_protocolo_desarrollo_paso_a_paso.md
│   │   ├── 02_especificacion_backend_api.md
│   │   ├── 03_especificacion_frontend_ui.md
│   │   └── 04_especificacion_integraciones.md
│   ├── roles/
│   │   └── jerarquia_y_responsabilidades.md
│   └── clasificaciones/
│       └── taxonomia_tareas.md
└── context.md (Memoria Persistente Sincronizada)</code></pre>

    <h2>3. Catálogo Universal de Agentes Especializados</h2>
    <table>
        <thead>
            <tr>
                <th>Agente</th>
                <th>Rol</th>
                <th>Responsabilidad Principal</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>01_arquitecto_software</strong></td>
                <td>Arquitectura & BD</td>
                <td>Diseña modelos de datos relacionales/NoSQL, APIs REST/GraphQL, escalabilidad y patrones limpios.</td>
            </tr>
            <tr>
                <td><strong>02_experto_dominio</strong></td>
                <td>Lógica de Negocio</td>
                <td>Define y valida las reglas específicas del sector (salud, finanzas, e-commerce, nutrición, etc.).</td>
            </tr>
            <tr>
                <td><strong>03_desarrollador_fullstack</strong></td>
                <td>Implementador</td>
                <td>Escribe código modular, limpio y fuertemente tipado (TypeScript, Node.js, React, Python).</td>
            </tr>
            <tr>
                <td><strong>04_disenador_uiux</strong></td>
                <td>Sistema Visual & UX</td>
                <td>Interfaces modernas, sistemas de diseño (Wabi-Sabi, Glassmorphism, Dark/Light modes) y animaciones.</td>
            </tr>
            <tr>
                <td><strong>05_auditor_seguridad</strong></td>
                <td>Seguridad & Privacidad</td>
                <td>Cifrado de datos, autenticación (JWT/OAuth), cumplimiento de normativas (OWASP, HIPAA, GDPR).</td>
            </tr>
            <tr>
                <td><strong>06_monitor_errores_eventos</strong></td>
                <td>Logs & Performance</td>
                <td>Captura de excepciones runtime, métricas de respuesta, resiliencia y degradas controladas.</td>
            </tr>
            <tr>
                <td><strong>07_qa_tester</strong></td>
                <td>Garantía de Calidad</td>
                <td>Pruebas unitarias, de integración, de regresión y validación de historias de usuario.</td>
            </tr>
        </tbody>
    </table>

    <h2>4. Protocolo Estricto de 7 Pasos para la IA</h2>

    <div class="workflow-box">
        <div class="workflow-title">🔄 Flujo Algorítmico de Ejecución Antigravity</div>
        <p><strong>[1. Sincronizar Memoria (context.md)]</strong> ➔ <strong>[2. Clasificar Tarea y Asignar Agente]</strong> ➔ <strong>[3. Inspeccionar Código Fuente]</strong><br>
        ➔ <strong>[4. Diseñar Plan Breve]</strong> ➔ <strong>[5. Código Modular]</strong> ➔ <strong>[6. Ejecutar Verificación / Tests]</strong> ➔ <strong>[7. Actualizar Memoria]</strong></p>
    </div>

    <ul>
        <li><strong>Paso 1: Sincronización de Memoria:</strong> Leer <code>context.md</code> y <code>.antigravity/contexto/</code> al inicio de la sesión.</li>
        <li><strong>Paso 2: Clasificación y Rol:</strong> Asumir la identidad y límites del agente especializado idóneo para la tarea.</li>
        <li><strong>Paso 3: Inspección Empírica:</strong> Jamás adivinar rutas ni esquemas. Verificar siempre el código fuente real con herramientas de inspección.</li>
        <li><strong>Paso 4: Plan Breve:</strong> Proponer cambios modulares sin romper APIs ni dependencias activas.</li>
        <li><strong>Paso 5: Código Limpio:</strong> TypeScript estricto, sin <code>any</code>, cumpliendo patrones SOLID.</li>
        <li><strong>Paso 6: Verificación Ejecutada:</strong> Correr compilaciones reales o suite de pruebas (<code>npm run build</code>, <code>npm test</code>).</li>
        <li><strong>Paso 7: Memoria Sincronizada:</strong> Actualizar <code>context.md</code> al concluir.</li>
    </ul>

    <h2>5. Directrices e Inconvenientes Prohibidos</h2>
    <div class="alert-box">
        <strong>⚠️ Reglas Inquebrantables de Desarrollo:</strong>
        <ul style="margin-top: 6px; margin-bottom: 0;">
            <li>Prohibido parchear síntomas: Resolver siempre la causa raíz identificada en logs.</li>
            <li>Prohibido declarar éxito sin ejecutar comandos de verificación.</li>
            <li>Prohibido usar tipos ambiguos o <code>any</code> en código de producción.</li>
        </ul>
    </div>

    <div class="footer-note">
        Antigravity Agentic Framework • Documento Generado para Uso Universal en Proyectos de Software
    </div>

</body>
</html>
"""

html_path = r"d:\Archivos\proyectos\Agencia Automatización\Bot multi-tenant-exp\MANUAL_UNIVERSAL_DESARROLLO_IA.html"
pdf_path = r"d:\Archivos\proyectos\Agencia Automatización\Bot multi-tenant-exp\MANUAL_UNIVERSAL_DESARROLLO_IA.pdf"

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print("HTML created at", html_path)

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
print("PDF compilation exit code:", res.returncode)
if os.path.exists(pdf_path):
    print("PDF SUCCESS: File size =", os.path.getsize(pdf_path), "bytes")
else:
    print("PDF Failed:", res.stderr)
