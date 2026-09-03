# 📄 Documentación Oficial: Ocultamiento de Costos, Filtro DIAN y Contabilidad Fiscal (2026)

Este documento constituye la documentación oficial de planificación y ejecución para la protección de costos de inventario, filtrado de facturación electrónica DIAN y estructuración del módulo de contabilidad fiscal en la plataforma multi-tenant.

---

## 🎯 1. OBJETIVO DEL PROYECTO

1. **Privacidad de Costos de Inventario (Perfil Empleado)**: Proteger los márgenes comerciales del negocio impidiendo que los colaboradores con rol `employee` visualicen o editen los precios de costo y ROI de las mercancías (monturas, lentes, insumos).
2. **Filtrado Inteligente de Facturación DIAN**: Permitir el filtrado rápido en el historial de facturas entre comprobantes fiscales transmitidos a la DIAN (Factura Electrónica con CUFE) y comprobantes/remisiones internas POS.
3. **Módulo de Contabilidad Fiscal y P&L (Colombia / DIAN)**: Adaptar la contabilidad para discriminar impuestos (IVA 19%, Impoconsumo 8%), calcular el Costo de Ventas (COGS), generar el Estado de Resultados (Utilidad Bruta vs Utilidad Neta) y permitir la exportación de reportes para el contador en Excel/CSV.

---

## 📋 2. PLAN DE IMPLEMENTACIÓN TÉCNICA

### 2.1. Protección de Precios de Costo en Inventario (`SaaSErpInventory.tsx`)
- **Tabla del Catálogo**:
  - Renderizar condicionalmente el encabezado `<th>COSTO</th>` y su correspondiente columna `<td>{prod.cost_price}</td>` solo cuando el usuario autenticado sea Administrador o Dueño del Negocio (`isAdmin === true`).
- **Resumen Kpis Financieros**:
  - Ocultar la tarjeta de ROI y costo acumulado de inventario a colaboradores, mostrando únicamente el valor potencial de venta en catálogo.
- **Formulario de Creación / Edición de Producto**:
  - Condicionar la visibilidad del campo `Precio Costo (COP)` únicamente para administradores. Los colaboradores solo configurarán el `Precio de Venta (COP)`.

### 2.2. Filtro por Tipo de Comprobante DIAN (`SaaSErpInvoices.tsx`)
- **Selector de Filtro Fiscal**:
  - Integrar en el encabezado de facturación un filtro desplegable:
    - `[ ⚡ Todos los Comprobantes (DIAN + Internos) ]`
    - `[ 📄 Solo Facturas Electrónicas DIAN (Con CUFE / Transmitidas) ]`
    - `[ 🧾 Solo Remisiones / Comprobantes Internos (Sin DIAN) ]`
- **Lógica de Filtrado**:
  - Evaluar la presencia del atributo `inv.cufe` o el estado `inv.electronic_status === 'accepted'`.

### 2.3. Módulo de Contabilidad Fiscal DIAN Colombia (`SaaSErpAccounting.tsx`)
- **Resumen Fiscal & Discriminación de Impuestos**:
  - Medidores de **Ingresos Brutos**, **Base Gravable**, **IVA Generado (19%)** e **Ingreso Neto Real**.
- **Estado de Resultados Simplificado (P&L)**:
  - **Costo de Ventas (COGS)**: Sumatoria de costos de productos vendidos en el periodo.
  - **Utilidad Bruta Operativa**: `Ingresos Brutos - Costo de Ventas`.
  - **Utilidad Neta Operativa**: `Utilidad Bruta - Gastos Fijos Operativos (Arriendo, Luz, Agua, Internet)`.
- **Exportador Contable para Contador (Excel / CSV)**:
  - Botón de descarga directa con la relación de facturas, base gravable, impuestos discriminados y gastos para el contador público de la empresa.

---

## 🧪 3. VERIFICACIÓN Y PRUEBAS AUTOMATIZADAS

1. **Build de Producción**:
   - `npm run build:frontend` (Garantizar 0 advertencias críticas y compilación exitosa de Vite/TypeScript).
2. **Prueba de Aislamiento de Roles**:
   - Inicio de sesión con colaborador (`Speedie` / `employee`): Confirmar que la columna **COSTO** y los campos de costo de producto NO estén visibles.
   - Inicio de sesión con Administrador: Confirmar que el costo y ROI se muestren correctamente.
3. **Prueba del Filtro DIAN**:
   - Filtrar facturas electrónicas emitidas con CUFE vs notas/remisiones de venta interna.

---

## 📌 4. WALKTHROUGH & RESUMEN DE CAMBIOS EJECUTADOS

*(Sección reservada para registrar los cambios exactos y capturas de pantalla tras completar la ejecución)*
