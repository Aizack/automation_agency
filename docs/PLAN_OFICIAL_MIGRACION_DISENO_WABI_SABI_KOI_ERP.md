# 🏮 Documento Oficial de Migración de Diseño Wabi-Sabi Paper
## KOI ERP — Sistema SaaS Multi-Tenant (Entorno Experimental `Bot multi-tenant-exp`)

---

> [!IMPORTANT]
> **DECLARACIÓN OFICIAL DE INTEGRIDAD FUNCIONAL**:
> Esta migración es un reemplazo de la capa estética y de interfaz de usuario ("Piel del Sistema"). 
> **NO modifica la base de datos, NO altera el backend/servidor API y NO elimina ningún campo, módulo, pestaña o función existente en el sistema.**

---

## 📌 1. Alcance de la Migración

- **Carpeta Objetivo**: `d:\Archivos\proyectos\Agencia Automatización\Bot multi-tenant-exp`
- **Rama de Git**: `feature/backup-alegra-factus`
- **Archivos Clave Afectados**:
  1. `dashboard/src/index.css` (Tokens visuales Wabi-Sabi Paper)
  2. `dashboard/src/components/ClientDashboard.tsx` (Shell global: Sidebar expandible en hover + Topbar)
  3. `dashboard/src/components/SaaSErpInventory.tsx` (Módulo de inventario, tarjetas KPI, catálogo y modal 2-columnas)

---

## 🗺️ 2. Mapeo Oficial de Módulos & Pestañas (`ClientDashboard.tsx`)

Todos los **27 estados de pestañas (`activeTab`)** quedan mapeados dentro de la estructura de 6 categorías Wabi-Sabi:

| Categoría Wabi-Sabi | Pestañas React / Módulos Mapeados (`activeTab`) | Descripción |
| :--- | :--- | :--- |
| **0. Agente IA WhatsApp** | `resumen` | Configuración del Agente IA, Prompt del Sistema, Estado QR WhatsApp, Archivos de Entrenamiento. |
| **1. Información Empresa** | `configuracion`, `planeacion_empresarial` | Perfil Comercial, Logotipo, Sincronización Google Drive, Sucursales/Sedes, Planeación Empresarial. |
| **2. Logística & Stock** | `inventario`, `inventario_insumos`, `lab_jobs`, `domicilios` | Catálogo de Inventario, Insumos / Materias Primas, Trabajos de Laboratorio Oftálmico, Despachos y Domicilios. |
| **3. Gastronomía & Mesas** *(Condicional Restaurante)* | `restaurante_menu`, `restaurante_mesas`, `restaurante_kds` | Menú y Recetario, Comandero & Mesas, Pantalla KDS (Cocina/Barra). |
| **4. Facturación & Finanzas** | `facturacion`, `dian_habilitacion`, `facturacion2`, `cotizaciones`, `documentos_soporte`, `arqueo_caja`, `contabilidad`, `cartera` | Facturación POS, Wizard Factus DIAN (5 pasos), Facturación v2 Admin, Cotizaciones, Documentos Soporte, Arqueo de Caja, Contabilidad General, Cartera & Cobros. |
| **5. Clientes & Difusión** | `clientes`, `campanias`, `marketing`, `metas_ventas` | Directorio CRM de Clientes, Campañas de Campo, Marketing & WhatsApp Difusión, Metas de Ventas. |
| **6. Personal & Seguridad** | `empleados`, `usuarios`, `trazabilidad`, `formulas`, `agenda` | Gestión de Colaboradores, Permisos & Roles de Usuarios, Auditoría Logs de Trazabilidad, Fórmulas / Recetas Oftálmicas, Agenda & Citas Médicas. |

---

## 📋 3. Mapeo Oficial de Campos de Inventario (`SaaSErpInventory.tsx`)

### A. Campos del Formulario de Producto / Servicio:
- **`productType`**: Selección entre *Producto Inventariable (Físico)* y *Servicio / Honorario (Sin Stock)*.
- **`name`**: Nombre comercial del ítem.
- **`sku`**: SKU / Código interno o escaneo de barras.
- **`description`**: Descripción comercial para cotización y factura.
- **`price`**: Precio de venta base.
- **`costPrice`**: Precio de costo para cálculo de utilidad y ROI.
- **`stock` & `minStock`**: Stock global y alerta mínima.
- **`brand`**, **`material`**, **`style`**, **`color`**: Atributos técnicos de producto.
- **`promoDiscount`**: Porcentaje de descuento promocional.
- **`categoryId`**: Categoría seleccionada + Modal rápido para crear nueva categoría (`showCreateCategoryPrompt`).
- **`unspsc`**: Código Estándar DIAN (UNSPSC / EAN) para facturación electrónica.

### B. Matriz de Variantes por Color (Con Cuadrito Muestra 18px):
- **`hasVariants`**: Alternador de producto con variantes de color.
- **`variantList`**: Matriz dinámica (`color`, `sku`, `stock`, `min_stock`, `image_url`).
- **`color-swatch-box`**: Muestra cuadrada (`18px x 18px`, `border-radius: 3px`) que cambia dinámicamente de color según la opción seleccionada.
- **`totalStock`**: Calculadora en tiempo real del stock sumado de todas las variantes.

### C. Fototeca por Variante (Panel Derecho Fijo):
- **`photo-color-swatches-column`**: Selector vertical de cuadritos de color a la izquierda del recuadro *Dropzone* para alternar y cargar una fotografía por cada variante de color.

### D. Modales & Funciones Secundarias Preservadas:
- Filtros Avanzados (Barra de búsqueda escaneable, Marca, Nivel de stock, Precio Mín/Máx).
- Importación CSV de catálogo.
- Impresión de Código de Barras SVG (`JsBarcode`) con perfiles (`LABEL_PRINT_PROFILES`).
- Traspaso de Stock Inter-Sedes (`handleOpenCrossStock` / `handleExecuteTransfer`).
- Reabastecimiento de Stock (*Refill Modal*).
- Selector de Color Personalizado (*Paint Picker*).

---

> Documento Oficial de Referencia — KOI ERP 2026.
