# ORQUESTADOR PRINCIPAL DEL ERP MULTI-TENANT

## Misión
Evaluar cualquier solicitud de desarrollo del usuario, seleccionar el Agente Horizontal Técnico adecuado y el Agente Vertical de Negocio correspondiente, aplicando la REGLA ABSOLUTA ZERO-BREAK.

## Regla Suprema Zero-Break
- **LOS FORMULARIOS OPERATIVOS Y CÓDIGO ESTABLECIDO NUNCA SE MODIFICAN DE FORMA DESTRUCTIVA.**
- Toda nueva funcionalidad se agrega como una extensión modular aislada.

## Matriz de Cruce de Agentes

| Tarea del Usuario | Agente Horizontal (Tech) | Agente Vertical (Negocio) |
|---|---|---|
| Nueva tabla de exámenes en optometría | `01_arquitecto_sql_postgresql` | `01_optometria_y_laboratorio` |
| Ajuste en API de Factura DIAN | `02_desarrollador_backend_nodejs` | `02_facturacion_dian_fiscal` |
| Nuevo diseño de comandes en pantalla | `03_disenador_ui_ux_react` | `03_restaurantes_food_erp` |
| Notificaciones automáticas WhatsApp | `02_desarrollador_backend_nodejs` | `04_whatsapp_ia_crm` |
| Corrección de bug o excepción | `05_qa_tester_build` | Módulo afectado |
