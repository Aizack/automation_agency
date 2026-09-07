# 📜 Guía y Hoja de Ruta: Rediseño Wabi-Sabi Paper (KOI ERP)

Este documento contiene las especificaciones técnicas, el sistema de diseño y los avances del proyecto de rediseño **Wabi-Sabi Paper** para **KOI ERP**. Sirve como punto de partida para continuar el desarrollo en este repositorio experimental (`Bot multi-tenant-exp`).

---

## 🎨 1. Sistema de Diseño (Wabi-Sabi Paper)

### 🎨 Paleta Cromática:
- **Fondo de Pantalla Principal**: `#F6F4EE` (Papel marfil natural, cálido y mate).
- **Tarjetas / Tarjeteros de Contenido**: `#FFFFFF` (Blanco impuro pulcro con bordes bien definidos).
- **Bordes y Divisores de Estructura**: `#E2DFD7` (Líneas sutiles tono arena / pergamino).
- **Texto Principal y Títulos**: `#161616` (Negro carbón mate, alta legibilidad).
- **Texto Secundario / Etiquetas**: `#6B6862` (Gris piedra / grafito suave).
- **Acento Primario / Botones Acción**: `#D9381E` (Rojo Bermellón / Lacre tradicional).
- **Estados Activos / Éxito**: `#15803d` (Verde esmeralda sobrio).

### 🖋️ Tipografía y Estilo Editorial:
- **Títulos de Módulo e Impacto**: Serif estético (estilo `Instrument Serif` / `Georgia`).
- **Textos de Cuerpo, Formularios e Interfaz**: Sans-Serif limpio (estilo `Inter` / `Roboto`).
- **IDs, Teléfonos, Precios y Código**: Monospace estricto (`JetBrains Mono` / `Consolas`).

---

## 📐 2. Arquitectura de Layout y Navegación

### 1. Menú Lateral Desplegable (`.sidebar-expandable`):
- **Estado Replegado (Idle)**: `64px` de ancho. Muestra únicamente los íconos vectoriales alineados verticalmente.
- **Estado Desplegado (`:hover`)**: `290px` de ancho con transición suave (`transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1)`). Muestra los nombres de los módulos y las flechas de acordión.
- **Transición de Texto**: `opacity` y `white-space: nowrap` para evitar saltos bruscos.

### 2. Barra Superior (`.top-header`):
- Logo de **KOI ERP** + Buscador zen universal con filtro rápido.
- Indicador de Inquilino / Negocio Activo ("Óptica Nuevo Horizonte", "Consola Global Super Admin").
- Acceso a Soporte & AutoFix IA, Botón para volver a Admin y Badge de Perfil de Usuario con Avatar.

---

## 🗂️ 3. Estructura Reorganizada del Menú del ERP

1. **Datos de la Empresa** *(Pestaña de Inicio por Defecto al entrar a una tienda)*:
   - 📄 **Datos de la Empresa** (`configuracion`): Razón social legal, NIT, dirección, teléfono, correo y **Categoría del Negocio** (Óptica, Restaurante, Comercio General, Agencia).
   - ⚡ **Habilitación DIAN Factus** (`dian_habilitacion`): Proceso de pruebas e integración de facturación electrónica.

2. **Configuración Agente IA**:
   - 🤖 **Configuración Agente IA & Resumen** (`resumen`): System Prompt, Tono de voz, RAG (Base de Conocimiento Google Drive / Archivos PDF/TXT), Asesores Humanos en cascada, Audios pregrabados y Código QR de WhatsApp.

3. **Logística & Stock**:
   - 📦 Inventario de Productos (`inventario`)
   - 🧪 Insumos & Materias Primas (`inventario_insumos`)
   - 🔬 Trabajos de Laboratorio (`lab_jobs` - Ópticas)
   - 🚚 Despachos y Domicilios (`domicilios`)

4. **Gastronomía & Mesas** *(Condicional Restaurantes)*:
   - 🍕 Menú & Recetario (`restaurante_menu`)
   - 🍽️ Comandero & Mesas (`restaurante_mesas`)
   - 👨‍🍳 Pantalla Cocina KDS (`restaurante_kds`)

5. **Facturación** *(Módulo Independiente)*:
   - 💳 Facturación POS & DIAN (`facturacion`)
   - 📋 Cotizaciones (`cotizaciones`)
   - 📄 Documentos Soporte (`documentos_soporte`)
   - 💰 Arqueo de Caja (`arqueo_caja`)
   - 📉 Cartera & Cobros (`cartera`)

6. **Finanzas** *(Módulo Independiente)*:
   - 📊 Contabilidad General (`contabilidad`)
   - 📈 Planeación Empresarial (`planeacion_empresarial`)

7. **Clientes & Difusión**:
   - 👥 Directorio CRM Clientes (`clientes`)
   - 🎯 Campañas de Prospección (`campanias`)
   - 💬 Difusión WhatsApp (`marketing`)
   - 🏆 Metas de Ventas (`metas_ventas`)

8. **Personal & Seguridad**:
   - 👤 Gestión Colaboradores (`empleados`)
   - 🔐 Permisos & Roles (`usuarios`)
   - 📜 Logs & Trazabilidad (`trazabilidad`)
   - 👓 Fórmulas / Optometría (`formulas` - Ópticas)
   - 📅 Agenda & Citas (`agenda`)

---

## 🛠️ 4. Correcciones Técnicas Importantes Realizadas

1. **Solución a Pantalla Blanca (Violación del Orden de Hooks en React)**:
   - Se reordenó `ClientDashboard.tsx` colocando los `useState` al inicio del componente, antes de cualquier sentencia `if (loading)` o `if (!clientData)`.

2. **Persistencia de Sesión de Admins y Superadmins**:
   - Se añadió excepción de rol en `src/middlewares/authMiddleware.ts` para evitar que la verificación `active_user_sessions` en PostgreSQL cierre la sesión de admins al abrir múltiples pestañas o servidores.
   - En `App.tsx`, se guarda `view_as_client = 'true'` y `current_view = 'client'` al abrir una tienda para evitar que F5 (Refrescar) devuelva al usuario al panel del Super Admin.
   - Se persiste y restaura la pestaña activa (`client_active_tab`) en `localStorage`.

3. **Compactación de Métricas KPI**:
   - `.kpi-metrics-grid` se configuró en `repeat(4, 1fr)` con padding optimizado de `0.85rem 1rem` para mostrar las 4 métricas en 1 sola fila sin espacio blanco sobrante.

4. **Reubicación de Categoría del Negocio**:
   - Removida de la Ventana de Agente IA (Ventana 0) y colocada en **Datos de la Empresa** (Ventana 1). Se actualizó el endpoint `PUT /api/clients/:clientId/profile-settings` para guardar la categoría en PostgreSQL.

---

## 🚀 5. Instrucciones para Continuar en un Nuevo Chat

Cuando abras el chat en este proyecto (`Bot multi-tenant-exp`), simplemente indica:
> *"Continuemos con el rediseño Wabi-Sabi Paper según el archivo `REDISENO_WABI_SABI_GUIA.md`."*
