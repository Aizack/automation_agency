# Documentación Técnica: Ajuste de Turnos (Cronómetro/Zona Horaria) e Inventario de Lentes

**Fecha:** 17 de Octubre de 2026  
**Sistema:** FRANT ERP  
**Módulos:** Portal de Empleados (Turnos & Asistencia), Nómina, Inventario (Lentes de Contacto y Formulados)

---

## 1. Problema 1: Cronómetro del Turno Inicia con 2 Horas Adelantadas (`02:00:00`)

### Diagnóstico Técnico
* **Causa Raíz:**
  1. El servidor VPS está configurado en la zona horaria física de Alemania: `Europe/Berlin (CEST, UTC+2)`.
  2. La base de datos PostgreSQL dentro de Docker guarda las marcas de tiempo en `UTC`.
  3. La columna `clock_in` de `shift_logs` es de tipo `TIMESTAMP` (sin zona horaria).
  4. Al serializar la fecha en Node.js (que hereda la zona del host `UTC+2`), se producía una distorsión de **2 horas (7.200 segundos)** al comparar contra `Date.now()` en el navegador del cliente.
* **Solución Acordada:**
  1. **Cronómetro en vivo (Texto plano / Numérico entero):**
     * El cronómetro visual en pantalla no debe depender de conversiones complejas de husos horarios.
     * Funcionará como un contador numérico directo de segundos transcurridos (`elapsed_seconds = (now_ms - start_ms) / 1000`), garantizando que siempre inicie estrictamente en **`00:00:00`**.
  2. **Horas de Entrada, Salida y Nómina (Hora Local del Negocio):**
     * Las marcas de tiempo legales para registro de asistencia y cálculo de horas de nómina deben registrarse y presentarse en la zona horaria real de la tienda (`clients.timezone`, por defecto `America/Bogota` UTC-5 para Colombia), asegurando total exactitud frente al reloj local del establecimiento.

---

## 2. Problema 2: Stock de Lentes (Contacto y Formulados) y Mutación a Servicio

### Diagnóstico y Definición de Negocio
* **Comportamiento Previo Erróneo:**
  * En `SaaSErpProductFormModal.tsx`, cualquier producto cuya categoría contuviera la palabra `'lente'` activaba una regla automática que forzaba el ítem a *"Servicio sin stock"* (`stock = 999999` o `0 Uds`), y asignaba marca `"Lentes"` por defecto.
  * Esto afectaba tanto a los **Lentes de Contacto** (que son productos físicos empacados con marca y graduación) como a **Lentes Oftálmicos**.
* **Definición de Negocio Clarificada por el Usuario:**
  1. **En Inventario:**
     * **Todos los lentes (de contacto y oftálmicos con fórmula) DEBEN llevar stock/unidades físicas.**
     * Existen ópticas que manejan stock propio de bloques de cristales terminados o lentes formulados en almacén.
     * Por lo tanto, el formulario de inventario **NUNCA debe forzar ningún lente a servicio**. El usuario tiene control total sobre las unidades, variantes de graduación, marca y costo.
  2. **En Facturación:**
     * Se mantiene el botón rápido *"Agregar Servicio de Lentes"* para cuando se vende una montura y el cristal se manda a elaborar en laboratorio externo sin descontar un bloque físico del inventario.

---

## 3. Plan de Implementación (Primero Local, luego VPS)

1. **Ajuste en `SaaSErpProductFormModal.tsx`:**
   * Eliminar la condición automática `.includes('lente')`.
   * Permitir que el selector de categoría y el de *"Tipo de Ítem"* operen de forma independiente.
   * Permitir que tanto lentes de contacto como cristales oftálmicos se guarden como productos físicos con stock real y variantes.
2. **Ajuste en `src/server.ts` y `SaaSErpEmployeeProfile.tsx`:**
   * Endpoint de turnos entregando la marca de tiempo precisa o segundos transcurridos relativos para que el reloj inicie en `00:00:00`.
   * Guardado y visualización de horas de entrada/salida bajo la zona horaria de la tienda (`America/Bogota`).
3. **Verificación local (`npm run build`) y posterior despliegue a VPS.**
