import os

root_dir = r"d:\Archivos\proyectos\Agencia Automatización\Bot multi-tenant-exp\.antigravity\agentes\verticales_negocio"

agents = {
    "01_datos_empresa_y_sedes.md": """# AGENTE VERTICAL 01: DATOS DE LA EMPRESA, SEDES & CONFIGURACIÓN IA

## Submódulos Alineados del Menú:
- **Datos de la Empresa**
- **Habilitación DIAN** (Wizard & Credenciales)
- **+ Nueva Sede** (Gestión Multi-Sede & NIT)
- **Configuración Agente IA** (Prompts de atención, llaves Gemini, tonos)

## Componentes y Tablas Relacionadas:
- Componentes: `SaaSErpStoreSettings.tsx`, `SaaSErpHabilitacionDian.tsx`, `SaaSErpAiAgentModule.tsx`
- Tablas SQL: `clients`, `stores`, `ai_agent_configs`

## Directrices de Negocio:
1. Aislar las configuraciones por sede e inquilino (`client_id`, `store_id`).
2. Gestionar credenciales de habilitación DIAN sin exponer llaves privadas.
""",

    "02_logistica_inventario_laboratorio.md": """# AGENTE VERTICAL 02: LOGÍSTICA, INVENTARIO, LABORATORIO & DOMICILIOS

## Submódulos Alineados del Menú:
- **Inventario de Productos** (Matriz de variantes, stock, precios)
- **Trabajos de Laboratorio** (Órdenes de montaje, lentes, estados)
- **Despachos y Domicilios** (Rutas, GPS repartidor Speedie Gonzalez)

## Componentes y Tablas Relacionadas:
- Componentes: `SaaSErpInventory.tsx`, `SaaSErpDomicilios.tsx`
- Tablas SQL: `products`, `product_variants`, `lab_jobs`, `deliveries`

## Directrices de Negocio:
1. **Regla de Laboratorio**: Una factura con lentes oftálmicos crea automáticamente una orden de laboratorio en estado "Por Asignar".
2. **Control de Stock**: Prevenir venta de productos sin stock salvo reserva explícita.
""",

    "03_facturacion_pos_dian_cartera.md": """# AGENTE VERTICAL 03: FACTURACIÓN POS/DIAN, COTIZACIONES & CARTERA

## Submódulos Alineados del Menú:
- **Facturación POS & DIAN** (Emisión de facturas electrónicas y tirilla térmica)
- **Cotizaciones** (Presupuestos comerciales)
- **Documentos Soporte** (Compras a no obligados a facturar)
- **Arqueo de Caja** (Cierre diario, efectivo, transferencias)
- **Cartera de Cobros** (Cuentas por cobrar y cuotas)

## Componentes y Tablas Relacionadas:
- Componentes: `SaaSErpInvoices.tsx`, `SaaSErpQuotes.tsx`, `SaaSErpSupportDocuments.tsx`, `SaaSErpCartera.tsx`
- Tablas SQL: `invoices`, `invoice_items`, `quotes`, `support_documents`, `installments`

## Directrices de Negocio:
1. **Firma Electrónica**: Integración transparente con Factus / Alegra.
2. **Arqueo de Caja**: Cuadre automático de dinero físico vs. transferencias recibidas.
""",

    "04_finanzas_contabilidad_nomina.md": """# AGENTE VERTICAL 04: FINANZAS, CONTABILIDAD, NÓMINA & PLANEACIÓN

## Submódulos Alineados del Menú:
- **Contabilidad** (P&L, gastos fijos, balance general)
- **Nómina Electrónica ⚡** (Desprendibles de pago, devengados, deducciones)
- **Exógena & Form 350** (Reportes fiscales tributarios)
- **Conciliación Bancaria** (Cruce de extractos)
- **Planeación Empresarial** (Proyecciones de inversión y préstamos)

## Componentes y Tablas Relacionadas:
- Componentes: `SaaSErpAccounting.tsx`, `EnterprisePlanningModule.tsx`
- Tablas SQL: `accounting_expenses`, `payroll_records`, `financial_plans`

## Directrices de Negocio:
1. Precisión decimal exacta en montos tributarios sin errores de punto flotante.
""",

    "05_crm_clientes_difusion.md": """# AGENTE VERTICAL 05: CLIENTES, DIFUSIÓN, CAMPAÑAS & METAS DE VENTAS

## Submódulos Alineados del Menú:
- **Directorio de Clientes** (CRM 360°, historial de compras y fórmulas)
- **Campañas de Campo** (Atención externa y brigadas de salud visual)
- **Difusión Promocional** (Mensajería masiva en WhatsApp)
- **Metas & Ventas Personal** (Objetivos comerciales por vendedor)

## Componentes y Tablas Relacionadas:
- Componentes: `SaaSErpCRM.tsx`, `SaaSErpCampaigns.tsx`
- Tablas SQL: `crm_customers`, `campaigns`, `sales_targets`

## Directrices de Negocio:
1. **Historial Único**: Vincular cada cliente con sus facturas, prescripciones y citas previas.
""",

    "06_citas_y_salud_visual.md": """# AGENTE VERTICAL 06: CITAS & SALUD VISUAL (OPTOMETRÍA)

## Submódulos Alineados del Menú:
- **Programación de Citas** (Calendario interactivo, horas, buscador CRM)
- **Optometría (Fórmulas)** (Refracción, esfera, cilindro, eje, adición, historia clínica)

## Componentes y Tablas Relacionadas:
- Componentes: `SaaSErpAppointments.tsx`, `SaaSErpFormulas.tsx`
- Tablas SQL: `appointments`, `optometry_records`

## Directrices de Negocio:
1. Husos horarios protegidos en citas (evitar desplazamientos UTC).
2. Cálculo de fórmulas oftálmicas y prescripción autorizada por optómetra.
""",

    "07_personal_seguridad_auditoria.md": """# AGENTE VERTICAL 07: PERSONAL, SEGURIDAD, AUDITORÍA & SISTEMA

## Submódulos Alineados del Menú:
- **Administración de Personal** (Ficha de empleado, turnos, marcaciones, tareas)
- **Accesos y Permisos** (Roles RBAC, módulos permitidos)
- **Trazabilidad & Auditoría** (Bitácora de eventos 360°)
- **Estado del Sistema** (Diagnóstico, VPS, VPulse security, degradación)

## Componentes y Tablas Relacionadas:
- Componentes: `SaaSErpEmployees.tsx`, `SaaSErpUsers.tsx`, `SaaSErpAuditLogs.tsx`
- Tablas SQL: `employees`, `users`, `system_audit_logs`

## Directrices de Negocio:
1. Control estricto de PIN de marcación de personal y auto-asignación de supervisores.
"""
}

# Remove old files if any
for f in os.listdir(root_dir):
    os.remove(os.path.join(root_dir, f))

# Write new 7 vertical agents
for fname, content in agents.items():
    fpath = os.path.join(root_dir, fname)
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(content)

print("Created 7 Menu-Aligned Vertical Agents successfully at:", root_dir)
