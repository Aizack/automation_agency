# 📄 Documentación Oficial: Ocultamiento de Costos, Filtro DIAN y Contabilidad Fiscal Dinámica (2026)

Este documento constituye la documentación oficial de planificación y ejecución para la protección de costos de inventario, filtrado de facturación electrónica DIAN y la estructuración del módulo de contabilidad fiscal dinámica por tipo de negocio en la plataforma multi-tenant.

---

## 🎯 1. OBJETIVO DEL PROYECTO

1. **Privacidad de Costos de Inventario (Perfil Empleado)**: Proteger los márgenes comerciales del negocio impidiendo que los colaboradores con rol `employee` visualicen o editen los precios de costo y ROI de las mercancías (monturas, lentes, insumos).
2. **Filtrado Inteligente de Facturación DIAN**: Permitir el filtrado rápido en el historial de facturas entre comprobantes fiscales transmitidos a la DIAN (Factura Electrónica con CUFE) y comprobantes/remisiones internas POS.
3. **Módulo de Contabilidad Fiscal y P&L Dinámico por Negocio**: Adaptar la contabilidad para ser **100% adaptable y opcional por negocio**, permitiendo definir si la tienda aplica IVA (19%), Impoconsumo (8%) o es Exenta/Excluida (0%), evitando campos innecesarios que estorben en ópticas o negocios no responsables de IVA.

---

## 📋 2. PLAN DE IMPLEMENTACIÓN TÉCNICA

### 2.1. Configuración Dinámica de Impuestos por Negocio y Producto
- **Nivel Tienda (`SaaSErpStoreSettings.tsx` / `clients` table)**:
  - Permitir al administrador configurar el régimen o perfil fiscal por defecto de la tienda:
    - `[ 🟢 Exento / Excluido de IVA (0%) ]` *(Ideal para ópticas, consultorios y pequeños negocios)*
    - `[ 🏢 Responsable de IVA (19%) ]` *(Para empresas de comercio general)*
    - `[ 🍽️ Impuesto al Consumo / Impoconsumo (8%) ]` *(Para restaurantes y gastronomía)*
    - `[ ⚙️ Personalizado por Producto ]`
- **Nivel Producto (`SaaSErpInventory.tsx`)**:
  - Si la tienda opera bajo el régimen "Personalizado por Producto", se mostrará un selector opcional de IVA/Impuesto por producto (`0%`, `19%`, `8%`).
  - Si la tienda está configurada como "Exenta de IVA (0%)", **no se mostrará ningún campo de IVA en facturación ni en el producto**, garantizando una interfaz limpia sin elementos que estorben.

### 2.2. Protección de Precios de Costo en Inventario (`SaaSErpInventory.tsx`)
- **Tabla del Catálogo**:
  - Renderizar condicionalmente el encabezado `<th>COSTO</th>` y su correspondiente columna `<td>{prod.cost_price}</td>` solo cuando el usuario autenticado sea Administrador o Dueño del Negocio (`isAdmin === true`).
- **Resumen KPIs Financieros**:
  - Ocultar la tarjeta de ROI y costo acumulado de inventario a colaboradores, mostrando únicamente el valor potencial de venta en catálogo.
- **Formulario de Creación / Edición de Producto**:
  - Condicionar la visibilidad del campo `Precio Costo (COP)` únicamente para administradores. Los colaboradores solo configurarán el `Precio de Venta (COP)`.

### 2.3. Filtro por Tipo de Comprobante DIAN (`SaaSErpInvoices.tsx`)
- **Selector de Filtro Fiscal**:
  - Integrar en el encabezado de facturación un filtro desplegable:
    - `[ ⚡ Todos los Comprobantes (DIAN + Internos) ]`
    - `[ 📄 Solo Facturas Electrónicas DIAN (Con CUFE / Transmitidas) ]`
    - `[ 🧾 Solo Remisiones / Comprobantes Internos (Sin DIAN) ]`
- **Lógica de Filtrado**:
  - Evaluar la presencia del atributo `inv.cufe` o el estado `inv.electronic_status === 'accepted'`.

### 2.4. Módulo de Contabilidad Fiscal & P&L Adaptativo (`SaaSErpAccounting.tsx`)
- **Resumen Fiscal Adaptativo**:
  - Si la tienda tiene IVA o Impoconsumo activo, mostrará la discriminación de **Ingresos Brutos**, **Base Gravable**, **Impuestos Generados** e **Ingreso Neto Real**.
  - Si la tienda es Exenta (0%), mostrará directamente **Ingresos Totales Limpios**.
- **Estado de Resultados Simplificado (P&L)**:
  - **Costo de Ventas (COGS)**: Sumatoria de costos de productos vendidos en el periodo.
  - **Utilidad Bruta Operativa**: `Ingresos Brutos - Costo de Ventas`.
  - **Utilidad Neta Operativa**: `Utilidad Bruta - Gastos Fijos Operativos (Arriendo, Luz, Agua, Internet)`.
- **Exportador Contable para Contador (Excel / CSV)**:
  - Botón de descarga directa con la relación de facturas, impuestos discriminados (si aplica) y gastos para el contador público de la empresa.

---

## 🧪 3. VERIFICACIÓN Y PRUEBAS AUTOMATIZADAS

1. **Build de Producción**:
   - `npm run build:frontend` (Garantizar 0 advertencias críticas y compilación exitosa de Vite/TypeScript).
2. **Prueba de Configuración de Impuestos**:
   - Configurar tienda como "Exenta (0%)": Verificar que no se muestre IVA en catálogo ni facturación.
   - Configurar tienda como "Responsable de IVA (19%)": Verificar desglose correcto de impuestos.
3. **Prueba de Aislamiento de Roles**:
   - Inicio de sesión con colaborador (`Speedie` / `employee`): Confirmar que la columna **COSTO** y los campos de costo de producto NO estén visibles.
   - Inicio de sesión con Administrador: Confirmar que el costo y ROI se muestren correctamente.
4. **Prueba del Filtro DIAN**:
   - Filtrar facturas electrónicas emitidas con CUFE vs notas/remisiones de venta interna.

---

## 📌 4. WALKTHROUGH & RESUMEN DE CAMBIOS EJECUTADOS

*(Sección reservada para registrar los cambios exactos y capturas de pantalla tras completar la ejecución)*
