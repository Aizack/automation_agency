import os

base_dir = r"d:\Archivos\proyectos\Agencia Automatización\Bot multi-tenant-exp\scratch\antigravity-universal-framework"

files = {
    r".antigravity\agentes\01_arquitecto_software.md": "# Agente 01: Arquitecto de Software\n\n- Diseñar esquemas de base de datos relacionales / NoSQL.\n- Definir contratos de APIs y patrones limpios de arquitectura.\n- Garantizar escalabilidad y desacoplamiento de servicios.\n",
    r".antigravity\agentes\02_experto_dominio.md": "# Agente 02: Experto en Dominio de Negocio\n\n- Definir reglas de negocio y restricciones operativas del sector.\n- Validar flujos de trabajo clave y requerimientos funcionales del cliente.\n",
    r".antigravity\agentes\03_desarrollador_fullstack.md": "# Agente 03: Desarrollador Fullstack\n\n- Escribir código limpio en TypeScript/Python/Node.js.\n- Implementar controladores, servicios, repositorios y componentes UI.\n- Seguir tipado estricto sin 'any'.\n",
    r".antigravity\agentes\04_disenador_uiux.md": "# Agente 04: Diseñador UI/UX\n\n- Diseñar interfaces modernas, responsivas y visualmente impactantes.\n- Definir el sistema de diseño, paleta de colores, componentes y transiciones.\n",
    r".antigravity\agentes\05_auditor_seguridad.md": "# Agente 05: Auditor de Seguridad\n\n- Garantizar cifrado de datos sensibles en reposo y tránsito.\n- Revisar control de acceso por roles (RBAC) y prevenir vulnerabilidades OWASP.\n",
    r".antigravity\agentes\06_monitor_errores_eventos.md": "# Agente 06: Monitor de Errores y Eventos\n\n- Captura de excepciones runtime y monitoreo de latencia.\n- Registrar logs estructurados y auditables de eventos del sistema.\n",
    r".antigravity\agentes\07_qa_tester.md": "# Agente 07: QA Tester\n\n- Diseñar y ejecutar suite de pruebas unitarias, de integración y de interfaz.\n- Validar historias de usuario antes de cada entrega.\n",
    r".antigravity\contexto\01_negocio_y_objetivos.md": "# Contexto de Negocio y Objetivos\n\n[Describir la visión general del proyecto, el problema que resuelve y sus pilares clave de valor]\n",
    r".antigravity\contexto\02_reglas_y_constraints_dominio.md": "# Reglas y Constraints de Dominio\n\n[Especificar restricciones legales, normativas o técnicas propias del sector]\n",
    r".antigravity\contexto\03_modelo_datos_general.md": "# Modelo de Datos General\n\n[Diagrama o DDL SQL de las tablas y entidades del sistema]\n",
    r".antigravity\contexto\04_stack_tecnologico.md": "# Stack Tecnológico\n\n- Backend: Node.js (TypeScript) / Express\n- Base de Datos: PostgreSQL\n- Frontend: React (Vite)\n- Contenedores: Docker / Docker Compose\n",
    r".antigravity\orquestacion\01_orquestador_principal.md": "# Orquestador Principal Antigravity\n\nDirectivas de evaluación de solicitudes y enrutamiento hacia los agentes especialistas.\n",
    r".antigravity\orquestacion\02_flujos_trabajo_inter_agentes.md": "# Flujos de Trabajo Inter-Agentes\n\nSecuencias paso a paso de colaboración entre Arquitecto, Dev, UI/UX, Seguridad y QA.\n",
    r".antigravity\especificaciones\01_protocolo_desarrollo_paso_a_paso.md": "# Especificación 01: Protocolo de Desarrollo Paso a Paso\n\n1. Sincronizar memoria (`context.md`).\n2. Clasificar tarea y asumir rol de Agente.\n3. Inspeccionar archivos empíricamente.\n4. Proponer plan de cambios.\n5. Desarrollar modularmente.\n6. Ejecutar verificación / tests.\n7. Actualizar `context.md`.\n",
    r".antigravity\roles\jerarquia_y_responsabilidades.md": "# Jerarquía y Responsabilidades\n\nDefinición de autoridades y alcance de cada rol dentro del proyecto.\n",
    r".antigravity\clasificaciones\taxonomia_tareas.md": "# Taxonomía de Tareas\n\n- FEATURE: Nueva funcionalidad\n- BUGFIX: Corrección de error\n- REFACTOR: Mejora de código sin cambiar comportamiento\n- SECURITY: Parche de seguridad\n- PERFORMANCE: Optimización de velocidad/memoria\n",
    r"context.md": "# Contexto del Proyecto\n\nEste archivo sirve como memoria persistente del proyecto para sincronizar rápidamente al agente Antigravity.\n"
}

for rel_path, content in files.items():
    full_path = os.path.join(base_dir, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Universal Antigravity Framework generated successfully at:", base_dir)
