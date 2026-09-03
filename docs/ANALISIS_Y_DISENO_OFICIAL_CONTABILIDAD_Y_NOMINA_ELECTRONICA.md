# 📄 ANÁLISIS, DISEÑO ARQUITECTÓNICO Y PLAN OFICIAL: MÓDULO DE CONTABILIDAD Y NÓMINA ELECTRÓNICA UNIFICADA

> **Fecha:** 3 de Septiembre, 2026  
> **Sistema:** ERP Multi-Tenant Multi-Sede (Aizack / Automation Agency)  
> **Estado:** Documento Oficial de Arquitectura & UX  
> **Principio Clave de UX:** **Zero-Fragmentación (Single-Flow Experience)**. *Evitar que el usuario tenga que saltar entre menús, pestañas o herramientas externas para completar una tarea operativa.*

---

## 1. 🔍 DIAGNÓSTICO DEL MÓDULO ACTUAL ("ADMINISTRACIÓN DE PERSONAL")

Actualmente en el archivo [`SaaSErpEmployees.tsx`](file:///d:/Archivos/proyectos/Agencia%20Automatizaci%C3%B3n/Bot%20multi-tenant/dashboard/src/components/SaaSErpEmployees.tsx) ya contamos con una base sólida de gestión de empleados y RRHH:

### ✅ Lo que YA está implementado:
1. **Ficha de Colaboradores:** Registro de empleados por sede, teléfono, cargo/rol, departamento, sueldo base, porcentaje de comisión sobre ventas y PIN de acceso de 4 dígitos para punto de venta.
2. **Control de Asistencia y Turnos (Clock-In / Clock-Out):** Marcación de entradas, salidas a almuerzo, retornos y fin de turno con cálculo de horas trabajadas y reporte de puntualidad.
3. **Gestión de Anticipos y Préstamos:** Solicitud y aprobación de vales/anticipos de nómina descontables.
4. **Portal del Empleado (`/empleados`):** Vista simplificada donde el trabajador registra sus turnos, consulta sus metas de ventas y pide anticipos.
5. **Gestión de Documentos de RRHH:** Carga y descarga de contratos, certificaciones e identificaciones.

### ⚠️ Lo que falta por mejorar en Personal:
* **Falta el cálculo automatizado de devengados complejos:** Horas extras (diurnas, nocturnas, festivas), recargos nocturnos, auxilio de transporte obligatorio (para sueldos menores a 2 SMLV en Colombia/LatAm) y deducciones legales (4% Salud + 4% Pensión).
* **Falta el botón de transmisión directa a la DIAN:** La liquidación actual es solo informativa/administrativa, no genera el XML ni el código **CUNE** de Nómina Electrónica.

---

## 2. 🧱 ARQUITECTURA Y FUNCIONES DEL MÓDULO DE CONTABILIDAD

El módulo de **Contabilidad** actuará como el **Cerebro Financiero Unificado** del ERP, dividido en 4 niveles de visibilidad:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   MÓDULO DE CONTABILIDAD (ERP)                           │
├──────────────────────────┬──────────────────────────┬────────────────────┤
│   1. CAJA Y BANCOS       │ 2. CUENTAS X COBRAR/PAGAR│ 3. PÉRDIDAS Y GAN. │
│  • Arqueo por Sede/Turno │  • Cartera / Abonos      │  • Venta Neta      │
│  • Efectivo, Nequi, etc. │  • Deudas a Proveedores  │  • Ganancia Neta   │
└──────────────────────────┴──────────────────────────┴────────────────────┘
                                   ▲
                                   │ (Asientos Automáticos Invisibles)
┌──────────────────────────────────┴───────────────────────────────────────┐
│  4. PUC & DIAN (Exportable para Contador / Libros Auxiliares / IVA)      │
└──────────────────────────────────────────────────────────────────────────┘
```

### Funciones Principales:
1. **Flujo de Caja Real (Caja & Bancos):**
   * Control de cajas chicas por sede/turno.
   * Conciliación automática de ingresos por canal de pago (Efectivo, Nequi, Daviplata, Tarjetas, Bancos).
   * Registro de Gastos Operativos Fijos (arrendamiento, servicios, licencias) y Ocasionales.
2. **Cuentas por Cobrar (Clientes) y Cuentas por Pagar (Proveedores):**
   * Seguimiento de abonos/señales de clientes (muy común en ópticas y servicios).
   * Programación de pagos de mercancía a proveedores a 30/60 días.
3. **Estado de Resultados (Pérdidas y Ganancias - PyG):**
   * `Ganancia Neta = Ventas Totales - Costo de Inventario Vendido - Gastos Operativos - Nómina Total`.
   * Filtrable en tiempo real por rango de fechas y por Sede/Sucursal.
4. **Capa Fiscal PUC (Plan Único de Cuentas) & DIAN:**
   * Mapeo de cuentas contables (Clase 1 Activos, 2 Pasivos, 3 Patrimonio, 4 Ingresos, 5 Gastos, 6 Costos).
   * Generación de libros auxiliares y descargas de reportes para el contador público de la empresa.

---

## 3. 🧾 NÓMINA ELECTRÓNICA: ¿DÓNDE DEBE ESTAR Y CÓMO DEBE FUNCIONAR?

### ❓ La Gran Pregunta de UX: ¿En Personal o en Contabilidad?
> **Veredicto:** **NÓMINA ELECTRÓNICA DEBE VIVIR EN UN FLUJO UNIFICADO DENTRO DE PERSONAL/RRHH Y CONECTARSE AUTOMÁTICAMENTE CON CONTABILIDAD.**

### 🚫 El error de los ERPs tradicionales (Lo que odia el usuario):
En sistemas obsoletos (como Siigo tradicional o World Office):
1. El administrador entra a **RRHH** a ver cuántas horas trabajó el empleado.
2. Abre otra pestaña de **Nómina** para calcular el sueldo.
3. Abre un tercer menú de **Contabilidad** para hacer el asiento contable a mano.
4. Entra a una cuarta herramienta de la **DIAN** para transmitir la nómina electrónica.

### ✨ La Solución Unificada (Smart-Flow UX):
Todo ocurre en **1 solo lugar en 3 pasos sencillos**:

```
[ Módulo Administración de Personal & Nómina ]
   │
   ├── 1. BOTÓN: "Liquidar Nómina del Mes"
   │      └─► El ERP suma: Sueldo Base + Comisiones de Venta + Horas Extras
   │          y descuenta: Anticipos + Salud (4%) + Pensión (4%).
   │
   ├── 2. BOTÓN: " Emitir Nómina Electrónica (DIAN)"
   │      └─► El ERP genera el XML, aplica la firma digital, calcula el CUNE
   │          y transmite directamente a la DIAN.
   │
   └── 3. AUTOMATIZACIÓN INVISIBLE A CONTABILIDAD ⚡
          └─► Sin que el usuario haga nada más, el ERP:
              • Descuenta el dinero pagado del Flujo de Caja (Contabilidad -> Egresos).
              • Registra el gasto contable en la cuenta PUC correspondiente (5105 - Gastos de Personal).
```

---

## 4. 🛠️ MEJORAS ESPECÍFICAS A IMPLEMENTAR

### A. En el Módulo de Administración de Personal:
1. **Calculadora de Nómina Integrada (Pre-Nómina LatAm):**
   * Integración de comisiones acumuladas automáticamente desde el módulo de POS/Ventas.
   * Descuento automático de anticipos aprobados durante el mes.
   * Deducciones de ley (Salud/Pensión) y Auxilio de Transporte configurable.
2. **Botón de Transmisión DIAN:**
   * Módulo de configuración de credenciales del Proveedor Tecnológico / DIAN (Certificado Digital + Rango de Numeración de Nómina Electrónica).
   * Estado de validación por empleado (`Aprobado por DIAN`, `Pendiente`, `Rechazado`).

### B. En el Módulo de Contabilidad:
1. **Tablero Principal de Flujo de Caja:**
   * Visualización gráfica de Ingresos vs. Egresos en tiempo real por Sede.
2. **Modulo de Gastos Integrado:**
   * Clasificación rápida de gastos recurrentes (Arriendo, Servicios, Insumos) con soporte de factura de compra.
3. **Sincronización Automática:**
   * Todas las ventas del POS ingresan a Contabilidad automáticamente.
   * Todos los pagos de nómina y gastos ingresan a Contabilidad automáticamente.
   * Estado de Resultados (PyG) en tiempo real con 1 clic.

---

## 5. 🎯 CONCLUSIÓN Y PRÓXIMOS PASOS

* **Nómina Electrónica** **NO se enviará a un menú aislado**. Se mantendrá dentro de la pestaña **Nómina** del módulo de **Personal**, permitiendo calcular, pagar y transmitir a la DIAN desde la misma pantalla.
* **Contabilidad** recibirá todos los impactos financieros en segundo plano, evitando que el usuario tenga que digitar doble información.
* Esta documentación queda como **estándar oficial de diseño** para el desarrollo de los módulos de Contabilidad y Nómina Electrónica.
