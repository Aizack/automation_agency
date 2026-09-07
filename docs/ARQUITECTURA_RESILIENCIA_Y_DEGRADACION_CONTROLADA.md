# Arquitectura Oficial de Resiliencia, Degradación Controlada e Idempotencia

> **Documento Oficial de Arquitectura de Sistemas Críticos**  
> *Aplica a:* ERP Multi-Tenant, Sistema POS, Módulo de Domicilios, Facturación DIAN y Automatizaciones IA.

---

## 1. Visión General y Diagnóstico de Fallas

En aplicaciones multi-inquilino de misión crítica, la disponibilidad teórica de **99.9%** (que aún permite **~8.46 horas de caída al año**) es una métrica insuficiente si esas horas caen en momentos clave (ej. un repartidor entregando un pedido, una caja POS cobrando una venta o una emisión de factura).

### El Peligro de las Fallas en Cascada (Cascade Failures)
Una caída del sistema rara vez se debe a un apagado repentino del servidor. Por el contrario, se genera por:
1. **Saturación en Base de Datos**: Bloqueos de transacciones por consultas pesadas.
2. **Tormenta de Reintentos (Retry Storms)**: El cliente o servicios integrados reintentan peticiones ante latencia, multiplicando el tráfico por 10x.
3. **Colapso de Recursos**: Servidores HTTP y bots consumen toda la RAM/CPU intentando procesar peticiones que ya expiraron.

---

## 2. Principios de Diseño para Alta Disponibilidad

```
+-----------------------------------------------------------------------------------+
|                            CLASIFICACIÓN DE TRÁFICO                               |
+---------------------------------------------------+-------------------------------+
| CRÍTICO (Prioridad Máxima - Nunca Interrumpir)   | NO CRÍTICO (Degradable)       |
+---------------------------------------------------+-------------------------------+
| 1. Cobro en Caja POS / Registro de Ventas          | 1. Agente IA (WhatsApp Bot)   |
| 2. Entrega y Cierre de Pedidos (Domiciliarios)     | 2. Sync Google Drive / Vector |
| 3. Actualización de Stock en Inventario Real      | 3. Emisión síncrona DIAN      |
| 4. Registro de Pagos y Abonos de Cartera           | 4. Reportes Gerenciales       |
+---------------------------------------------------+-------------------------------+
```

### A. Recorridos Críticos vs. Degradación Controlada (Controlled Degradation)
Cuando el servidor central o la conexión a internet sufra degradación o caída:
1. **Preservación del Recorrido Crítico**: El usuario (cajero, domiciliario, vendedor) DEBE poder finalizar la transacción en curso.
2. **Modo Resistencia Local (Offline-First)**:
   - Las transacciones críticas se guardan de inmediato en almacenamiento persistente local del navegador (`IndexedDB` / `localStorage`) firmado con `UUID`.
   - La interfaz entra en estado resiliente notificando al usuario:  
     `🟢 Modo Resiliente Activo — 2 transacciones guardadas localmente.`

### B. Colas Durables e Idempotencia (Durable Event Queues & Idempotency)
Para evitar doble facturación o duplicación de inventario cuando retorna la conexión:

1. **Clave de Idempotencia (`idempotency_key`)**:
   - Cada acción crítica genera un identificador único en el cliente antes de ser transmitida:
     ```typescript
     const idempotencyKey = `pos_sale_${clientId}_${storeId}_${uuidv4()}`;
     ```
2. **Verificación en Backend**:
   - Antes de procesar una venta o cobro, el backend ejecuta:
     ```sql
     SELECT id, result_payload FROM transactions WHERE idempotency_key = $1;
     ```
   - Si la clave ya existe, el servidor responde inmediatamente con el resultado guardado previamente, garantizando que la operación se aplique **exactamente una sola vez (Exactly-Once Semantics)**.

### C. Descarte de Carga Selectivo (Load Shedding)
1. **Protección de Procesos Prometidos**: Si la base de datos o la CPU del servidor superan el 80% de utilización:
   - El middleware de la API rechaza peticiones no críticas (ej. generación de reportes PDF pesados, análisis de gráficos, re-indexación de vectores IA) devolviendo HTTP `429` o `503`.
   - **Los recursos liberados se reservan al 100% para procesar ventas POS, cobros y cierres de pedido.**

---

## 3. Plan de Implementación por Fases

| Componente | Mecanismo | Beneficio |
| :--- | :--- | :--- |
| **Caja POS & Domicilios** | `IndexedDB` + Sync Queue | Permite seguir vendiendo y entregando sin internet. |
| **API Endpoints** | `Idempotency-Key` Header | Previene duplicados por reintentos en red inestable. |
| **Base de Datos** | Connection Pool Reserves | Reserva 30% del pool exclusivo para operaciones POS/Ventas. |
| **DIAN / Factus API** | Asynchronous Worker Queue | La facturación electrónica no bloquea la venta en caja. |

---
*Documento aprobado para integración en los repositorios de desarrollo y producción.*
