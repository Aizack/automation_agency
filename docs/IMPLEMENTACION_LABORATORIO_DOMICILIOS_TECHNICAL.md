# Implementación técnica del flujo de laboratorio y domicilios óptica

## 1. Objetivo

Definir la estructura técnica para soportar el flujo operativo de una óptica con:

- fórmula actual del cliente
- pedidos de monturas a laboratorio
- tareas del domiciliario
- ruta optimizada por cercanía
- confirmación de entrega
- sincronización con la plataforma de despachos

---

## 2. Principios del diseño

### 2.1 Separación de dominios

- CRM / clientes: información del paciente y fórmula actual
- historial médico: fórmulas anteriores
- laboratorio: producción de gafas
- logística: entregas del día
- tareas: trabajo operatorio para empleados

### 2.2 Fuente de verdad

La fórmula actual debe vivir en `crm_customers.lens_prescription`.

El historial de fórmulas debe seguir en `formulas` como registro histórico de comparaciones clínicas.

La operación comercial debe ir en `lab_jobs` e `invoices` / entregas.

---

## 3. Estados recomendados

### 3.1 Estados de laboratorio

```text
pending
assigned
in_lab
received_in_store
ready_for_delivery
delivered
reprogrammed
not_delivered
```

### 3.2 Estados de entrega

```text
pending
assigned_to_delivery
in_route
delivered
not_delivered
reprogrammed
```

### 3.3 Estados de tareas de trabajador

```text
task_open
task_in_progress
task_completed
task_blocked
```

---

## 4. Estructura de datos sugerida

### 4.1 Tabla: lab_jobs

Campos sugeridos:

```sql
id UUID PRIMARY KEY
client_id UUID
customer_id UUID
invoice_id UUID
customer_name TEXT
customer_phone TEXT
customer_document_number TEXT
montura_model TEXT
lens_type TEXT
prescription JSONB
status TEXT DEFAULT 'pending'
assigned_lab_id UUID
assigned_delivery_person_id UUID
pickup_address TEXT
delivery_address TEXT
pickup_date TIMESTAMP
ready_date TIMESTAMP
delivery_date TIMESTAMP
notes TEXT
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

### 4.2 Tabla: deliveries o invoice_delivery

Campos sugeridos:

```sql
id UUID PRIMARY KEY
client_id UUID
invoice_id UUID
customer_id UUID
customer_name TEXT
customer_phone TEXT
delivery_address TEXT
delivery_status TEXT DEFAULT 'pending'
delivery_method TEXT DEFAULT 'domicilio'
delivery_fee NUMERIC(10,2)
delivery_date TIMESTAMP
assigned_user_id UUID
route_order INTEGER
lat NUMERIC(10,7)
lng NUMERIC(10,7)
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

### 4.3 Tabla: employee_tasks

Campos sugeridos:

```sql
id UUID PRIMARY KEY
client_id UUID
employee_id UUID
task_type TEXT -- 'ruta_domicilios', 'recoger_laboratorio', 'otro'
task_title TEXT
related_entity_type TEXT -- 'invoice', 'lab_job', 'delivery'
related_entity_id UUID
priority INTEGER DEFAULT 0
status TEXT DEFAULT 'open'
notes TEXT
assigned_at TIMESTAMP
completed_at TIMESTAMP
```

---

## 5. Flujo operativo recomendado

### Paso 1: venta

Se factura una montura + lente.

### Paso 2: creación de orden de laboratorio

Se crea un `lab_job` con:

- cliente
- factura
- montura
- lente
- fórmula actual
- estado inicial `pending`

### Paso 3: asignación de laboratorio

Al pasar a `assigned`, se agrega el laboratorio y la orden queda lista para ser entregada al domiciliario.

### Paso 4: tarea al domiciliario

Se crea una tarea de tipo `ruta_domicilios` o `recoger_laboratorio` según el caso.

### Paso 5: entrega al laboratorio

El domiciliario lleva la montura con la fórmula al taller.

### Paso 6: recepción del laboratorio

El laboratorio confirma la finalización. El trabajo pasa a `in_lab` o `ready_for_delivery`.

### Paso 7: entrega a cliente

- si es local, se marca como `ready_for_pickup`
- si es domicilio, se genera una entrega con `delivery_status = pending`

### Paso 8: ruta del día

Se ordena la lista por cercanía desde la tienda o desde la ubicación del domiciliario.

### Paso 9: confirmación

Cada item de la ruta tiene:

- Copiar dirección
- Confirmar entregado
- Reprogramar / no entregado

---

## 6. Dato clave: “laboratorio asignado”

El estado intermedio `assigned` debe existir explícitamente.

Esto permite:

- organizar las monturas por laboratorio
- dividir la logística por taller
- dejar una cola de trabajo que el domiciliario pueda recoger por grupos
- evitar que la operación quede atomizada en un trabajo individual sin coordinación

---

## 7. Estructura del item de ruta del domiciliario

```json
{
  "id": "delivery_001",
  "customerName": "Pedro Perez",
  "address": "Calle 45 #12-34, Barrio Los Pinos",
  "reference": "Frente a la escuela",
  "phone": "3012345678",
  "deliveryStatus": "pending",
  "routeOrder": 1,
  "distanceKm": 2.6,
  "copyLabel": "Copiar dirección",
  "confirmAction": "Confirmar entrega"
}
```

---

## 8. Tarea del domiciliario en la UI

La UI debería mostrar algo como:

```text
Ruta de domicilios del día

1. Pedro Perez
   Calle 45 #12-34, Barrio Los Pinos
   [Copiar] [Confirmar]

2. María Gómez
   Cra 10 #15-22, El Campin
   [Copiar] [Confirmar]
```

### Botones recomendados

- Copiar dirección
- Confirmar entrega
- No entregado
- Reprogramar

---

## 9. Lógica de distancia y ordenación

Usar Haversine para ordenar entregas por cercanía:

```ts
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
```

Con eso, la ruta se genera localmente y se ordena sin depender de Google Maps.

---

## 10. Cómo se usa el GPS

El GPS debe ser una herramienta de navegación, no la lógica principal.

### Funciones útiles del GPS:

- orientar al domiciliario
- confirmar que está cerca
- abrir navegación a la dirección
- reportar ubicación si algo falla

### No debe hacer:

- decidir el orden principal de la ruta
- reemplazar la lógica de backend
- mantener la fuente de verdad de entregas

---

## 11. Relación con la sección de despachos y domicilios

La sección de despachos debe leer el mismo estado de entregas.

Cuando el domiciliario confirma entrega:

- `delivery_status` cambia a `delivered`
- la entrega sale de la ruta activa
- aumenta en “entregados”
- se actualiza visualmente sin recarga manual

Esto debe ser sincronizado y centralizado.

---

## 12. Recomendación final

La solución correcta es combinar:

- CRM para fórmula actual
- historial para evolución clínica
- `lab_jobs` para producción
- `employee_tasks` para tareas de empleados
- `deliveries` para rutas de domicilio

Esto ofrece:

- claridad operativa
- trazabilidad
- orden por cercanía
- mejor experiencia para el domiciliario
- sincronización directa con despachos

---

## 13. Resumen ejecutivo

- Fórmula actual = perfil del cliente
- Historial = comparación clínica
- Laboratorio = flujo operativo de producción
- Domiciliario = tarea de ruta operativa
- GPS = apoyo para navegación
- Ruta = ordenada por cercanía, no por “escritura manual”
- Confirmación = actualiza la plataforma en tiempo real

---

## 14. Siguiente implementación recomendada

1. Crear tabla `lab_jobs` si no existe con estados adecuados
2. Crear `employee_tasks` para la ruta del domiciliario
3. Reutilizar la lógica de `SaaSErpDomicilios` para ordenar por distancia
4. Añadir `laboratorio_asignado` al flujo de laboratorio
5. Añadir botón Copiar + Confirmar en cada entrega
6. Conectar confirmación con `delivery_status`
7. Mantener la fórmula actual vinculada al perfil del cliente

