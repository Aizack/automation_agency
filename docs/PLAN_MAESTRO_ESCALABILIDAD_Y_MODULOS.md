# 🏛️ Plan Maestro Completo: Módulos Estratégicos, IA AutoFix y Escalación Vertical

> **Fecha de Actualización:** 31 de Agosto, 2026  
> **Estado:** Documento Maestro Definitivo  
> **Ubicación en Repositorio:** `docs/PLAN_MAESTRO_ESCALABILIDAD_Y_MODULOS.md`

---

## 📌 Visión General de la Hoja de Ruta

Este documento constituye la guía arquitectónica y funcional completa de la plataforma ERP SaaS Multi-Tenant **Frant**. Contempla los 7 frentes estratégicos de desarrollo para llevar el producto al nivel más alto de competencia internacional.

---

## 🗺️ Los 7 Módulos del Plan Maestro

```mermaid
graph TD
    M1[1. Finanzas & Planeación de Élite] --> M2[2. IA AutoFix & Tickets de Soporte]
    M2 --> M3[3. Agente Re-engagement 3/8 Meses]
    M3 --> M4[4. Alerta Stock + WhatsApp IA a Proveedores]
    M4 --> M5[5. POS PWA Offline-First + Anti-Cheat]
    M5 --> M6[6. Módulo Multi-Sede & Multi-Bodega]
    M6 --> M7[7. Sincronización E-Commerce Shopify/Woo]
```

---

### 🟢 Módulo 1: Finanzas & Planeación Empresarial de Élite
- **Cruce Automático sin Redundancia**:
  - **Nómina Completa**: Salario base + 49.5% de carga prestacional y seguridad social del empleador (Salud, Pensión, ARL, Prima, Cesantías, Int. Cesantías, Vacaciones) leídos de los empleados activos.
  - **Gastos Fijos Operativos**: Pestaña en **Contabilidad** (`SaaSErpAccounting.tsx`) para registrar Arriendo, Servicios Públicos, Internet y Mantenimiento.
  - **Ventas & Margen Promedio**: Calculados automáticamente del inventario y facturación.
- **Inversión Inicial (CAPEX & Montaje)**: Registra adecuaciones, mobiliario, maquinaria, licencias y reserva de caja.
- **Estructura de Capital & Deuda Bancaria**: Registra créditos (Banco, Monto, Tasa % E.M., Plazo) con cálculo automático de la **Cuota Mensual Amortizada**.
- **Indicadores Clave**: Punto de Equilibrio Contable, **Punto de Equilibrio Financiero REAL (con cuota del banco)** y Tiempo de Retorno de Inversión (Payback ROI).

---

### 🟢 Módulo 2: Sistema de IA AutoFix + Tickets de Soporte
- **Reglas Incalculables de Seguridad**:
  - ❌ **CERO `DELETE`**: Jamás se borran datos físicamente (solo actualización de estado auditada).
  - ❌ **NO Inventar Parámetros**: Fixes concretos sin mutar esquemas de BD.
  - ❌ **Sin Ingeniería Inversa**: Si el fallo requiere cambiar código fuente, diagnostica y **escala el ticket a ingenieros humanos** vía WhatsApp/Email.
- **Auto-Captura & Tickets Manuales**: Botón *"Soporte & AutoFix"* en el header y captura automática de excepciones 500.

---

### 🟡 Módulo 3: Agente Proactivo de Re-engagement Específico para Ópticas (A 3 y 8 Meses)
- **A los 3 Meses de la Factura**: El bot de WhatsApp contacta proactivamente al paciente para ofrecerle productos complementarios (kit de limpieza, gotas humectantes, estuche o segundo par de sol con descuento).
- **A los 8 Meses de la Fórmula**: El bot contacta automáticamente al paciente agendando o sugiriendo su **nuevo examen de la vista / revisión optométrica anual preventiva**.

---

### 🟡 Módulo 4: Alerta de Stock Mínimo + Mensaje IA por WhatsApp al Proveedor
- **Monitoreo de Stock Mínimo**: Cuando un producto o insumo cae por debajo de su `stock_minimo`, el ERP dispara una notificación al Administrador e Encargado de Inventario.
- **Cotización/Recompra Autónoma por IA**: Al ser autorizada la recompra con 1 clic, **la IA redacta y envía automáticamente un mensaje por WhatsApp al teléfono del Proveedor** para cotizar o encargar el pedido de reabastecimiento.

---

### 🟡 Módulo 5: POS PWA Offline-First + Temporizador Interno Anti-Cheat
- **Operación Offline Continua**: Empaquetado PWA con Service Worker e IndexedDB para permitir facturar y cobrar sin conexión a internet.
- **Temporizador Anti-Cheat**: Validación de timestamp interno encriptado y token de sincronización que impide a los usuarios alterar la fecha/hora del sistema operativo para extender membresías offline o alterar facturas.

---

### 🟡 Módulo 6: Módulo Multi-Sede & Multi-Bodega (Add-on Pago por Tienda)
- **Sucursales & Bodegas**: Permite a empresas con 2 o más locales administrar sedes bajo una misma marca.
- **Separación de Cajas e Inventarios**: Transferencias de stock entre bodegas y contabilidad por sede a un precio add-on por tienda (evitando cobrar suscripciones completas independientes).

---

### 🟡 Módulo 7: Sincronización de Inventario con E-Commerce (Shopify / WooCommerce)
- **Conector Bidireccional**: Actualiza el stock del ERP en tiempo real cuando se efectúa una venta en Shopify o WooCommerce y sincroniza catálogo e imágenes automáticamente.

---

## 📅 Estado de Desarrollo y Ejecución

| Módulo | Estado | Ubicación Principal en Código / Documentación |
|---|---|---|
| **1. Finanzas & Planeación de Élite** | 🟢 Implementado | `EnterprisePlanningModule.tsx`, `SaaSErpAccounting.tsx`, `server.ts` |
| **2. IA AutoFix & Tickets** | 🟢 Implementado | `autoFixAgent.ts`, `SaaSErpSupportTickets.tsx`, `server.ts` |
| **3. Re-engagement 3/8 Meses** | 🟡 Siguiente Paso | `scheduler.ts`, `whatsapp.ts` |
| **4. Alerta Stock + Proveedor IA** | 🟡 Pendiente | `SystemAlertsPanel.tsx`, `autoFixAgent.ts` |
| **5. POS PWA Offline-First** | 🟡 Pendiente | `dashboard/public/sw.js`, `IndexedDB` |
| **6. Multi-Sede & Multi-Bodega** | 🟡 Especificado | `docs/ARQUITECTURA_MULTI_SEDE_Y_TRASLADO_EMPLEADOS.md` |
| **7. E-Commerce Integration** | 🟡 Pendiente | `src/services/ecommerce.ts` |
