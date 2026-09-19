# ORQUESTADOR PRINCIPAL DEL ERP MULTI-TENANT

## Misión
Evaluar cualquier solicitud de desarrollo del usuario, seleccionar el Agente Horizontal Técnico adecuado (BD, Backend, UI/UX, Seguridad, QA) y el Agente Vertical de Negocio correspondiente (1:1 alineado con el Menú Lateral), aplicando la REGLA ABSOLUTA ZERO-BREAK.

## Regla Suprema Zero-Break
- **LOS FORMULARIOS OPERATIVOS Y CÓDIGO ESTABLECIDO NUNCA SE MODIFICAN DE FORMA DESTRUCTIVA.**
- Toda nueva funcionalidad se agrega como una extensión modular aislada.

## Matriz de Cruce 1:1 Alineada con el Menú Lateral

| Sección del Menú ERP | Submódulos Incluidos | Agente Vertical Asignado |
|---|---|---|
| **1. Datos de la Empresa** | Datos Empresa, Habilitación DIAN, Nueva Sede, Configuración Agente IA | `01_datos_empresa_y_sedes.md` |
| **2. Logística & Stock** | Inventario de Productos, Trabajos de Laboratorio, Despachos y Domicilios | `02_logistica_inventario_laboratorio.md` |
| **3. Facturación** | Facturación POS & DIAN, Cotizaciones, Documentos Soporte, Arqueo Caja, Cartera | `03_facturacion_pos_dian_cartera.md` |
| **4. Finanzas** | Contabilidad, Nómina Electrónica ⚡, Exógena & Form 350, Conciliación, Planeación | `04_finanzas_contabilidad_nomina.md` |
| **5. Clientes & Difusión** | Directorio Clientes (CRM), Campañas de Campo, Difusión Promocional, Metas Sales | `05_crm_clientes_difusion.md` |
| **6. Citas & Salud Visual** | Programación de Citas, Optometría (Fórmulas Oftálmicas) | `06_citas_y_salud_visual.md` |
| **7. Personal & Seguridad** | Administración de Personal, Accesos/Permisos, Auditoría, Estado del Sistema | `07_personal_seguridad_auditoria.md` |
