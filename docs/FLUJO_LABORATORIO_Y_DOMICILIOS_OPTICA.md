# Flujo operativo de laboratorio y domicilios para óptica

## Objetivo

Documentar la lógica correcta del negocio para la operación óptica, separando claramente:

- fórmula oftálmica y diagnóstico del optometrista
- flujo de laboratorio y producción de gafas
- logística de domicilios y rutas del domiciliario
- tareas del trabajador dentro del perfil de empleado

Esta documentación sirve como fuente de referencia para futuras decisiones de implementación y para evitar mezclar el historial clínico con la operación comercial.

---

## 1. Regla de negocio principal

La fórmula actual debe reflejar el estado actual del paciente y debe vivir en el perfil del cliente en el CRM.

El historial de fórmulas debe quedar como registro de evolución clínica, para comparar:

- mejora: la fórmula disminuye o se corrige
- deterioro: la fórmula aumenta o empeora

No debe confundirse la referencia actual con el historial técnico.

---

## 2. Separación de responsabilidades

### A. Fórmulas oftálmicas

Responsable: optometrista.

Funciones:

- registrar la refracción actual
- guardar la fórmula vigente del paciente
- mantener el historial clínico previo
- no debe ser el centro de la operación de laboratorio ni de logística

### B. Laboratorio

Responsable: operación comercial / taller.

Funciones:

- recibir la montura y formula para fabricar las gafas
- asignar el trabajo al laboratorio correcto
- confirmar cuando las gafas ya están listas
- pasar a etapa de recepción en tienda

### C. Domicilios

Responsable: domiciliario.

Funciones:

- recibir la ruta del día
- ir en orden optimizado por cercanía
- copiar la dirección del cliente y dirigirse a la casa
- confirmar la entrega
- reflejar el estado en la plataforma para la administración

---

## 3. Flujo correcto del negocio

1. El cliente escoge el modelo de la montura, el tipo de lente y se factura.
2. Se genera una orden de laboratorio para montar los lentes.
3. La montura se manda con un domiciliario al laboratorio con la fórmula.
4. Se genera una tarea para el domiciliario para llevar la montura.
5. El laboratorio confirma que las gafas ya están listas.
6. Se genera otra tarea de recogida para que el domiciliario recoja todas las monturas del día.
7. Se recogen las gafas en el laboratorio.
8. Se recibe la mercadería en la tienda.
9. Se avisa al cliente.
10. El cliente confirma si retira en local o desea domicilio.
11. Si es domicilio, se genera la ruta operativa del día.
12. El domiciliario sigue la ruta optimizada y confirma cada entrega.
13. La entrega se marca como completada en la plataforma.

---

## 4. Estado recomendado para laboratorio

El flujo de laboratorio debería tener estos estados, mínimo:

- por_asignar
- laboratorio_asignado
- en_laboratorio
- recibido_en_tienda
- entregado
- no_entregado
- reprogramado

### Importancia del estado `laboratorio_asignado`

Este estado es crucial porque permite:

- separar la operación de montaje del pedido desde el momento en que ya tiene laboratorio destino
- agrupar varias monturas por laboratorio
- entregar al domiciliario un bloque de tareas por taller
- evitar que la operación se vuelva una tarea unitaria y manual

Es decir, el domiciliario puede preparar una ruta por laboratorio y no una por pieza individual.

---

## 5. Qué debe ir en la pantalla de “Por asignar”

En la cola de laboratorio no debe aparecer solo una receta.

Debe aparecer información comercial del pedido, como:

- número de factura
- nombre del cliente
- teléfono
- montura seleccionada
- tipo de lente
- fórmula actual
- laboratorio destino
- fecha de pedido
- responsable del envío
- estado actual

Esto es la información operativa que necesita el negocio para programar el taller.

---

## 6. Qué debe ir en la tarea del domiciliario

La tarea del domiciliario debe ser una ruta diaria estructurada, no una nota.

Cada item debería tener:

- cliente
- dirección completa
- barrio / referencia
- teléfono
- horario sugerido
- orden de visita
- botón Copiar dirección
- botón Confirmar entrega
- estado

La lista debe llegar ya ordenada por cercanía, no como listado aleatorio.

---

## 7. Optimización de ruta

La ruta debe calcularse por backend con lógica local, no por una API costosa desde el inicio.

### Método recomendado

- usar Haversine para calcular distancia
- geocodificar cada dirección si hace falta
- ordenar por cercanía desde la tienda o desde la ubicación del domiciliario
- entregar la lista ordenada al trabajador

Esto es suficiente para este tipo de operación y evita pagar por Google Maps en una etapa temprana.

### Cuándo sí usar Google Maps

- cuando el negocio mida demasiadas entregas diarias
- cuando haya varios domiciliarios, tráfico y rutas dinámicas
- cuando se requiera ETA en tiempo real

Para la etapa actual, la ruta por cercanía con cálculo local es más rentable y mantenible.

---

## 8. Copiar dirección en la tarea

La idea de copiar la dirección es muy útil porque reduce errores y fricción.

Cada entrega debería tener:

- dirección visible
- botón Copiar
- botón Abrir Maps si desea navegar
- botón Confirmar entrega

Esto permite que el domiciliario:

1. abra la tarea
2. copie la dirección
3. vaya a la casa
4. confirme la entrega

sin escribir manualmente ni perder tiempo en el proceso operativo.

---

## 9. Confirmación de entrega

Cuando el domiciliario confirma una entrega, el sistema debe:

- actualizar el status de la entrega a entregado
- reflejar el cambio en la sección de despachos y domicilios
- ocultar la entrega de la ruta activa
- dejarla registrada en historial de entregas

Esto debe ser un cambio global e inmediato, no solo local al perfil del trabajador.

---

## 10. Cómo usa el domiciliario el GPS

La mejor práctica es usar el GPS como apoyo de navegación, no como motor de decisión principal.

El flujo correcto es:

- la plataforma genera la ruta optimizada
- el domiciliario sigue la lista en orden
- usa el GPS para orientarse y confirmar ubicación
- confirma la entrega desde la tarea

Por lo tanto:

- la ruta la decide la app interna
- el GPS ayuda a llegar a la dirección exacta
- la confirmación final se hace dentro del sistema

---

## 11. Diseño funcional recomendado

### Cronograma de trabajo

1. Crear la cola operativa de órdenes de laboratorio
2. Añadir `laboratorio_asignado` entre estados
3. Generar tarea de ruta para el domiciliario
4. Ordenar entregas por cercanía
5. Añadir botón Copiar dirección por cada domicilio
6. Añadir confirmación de entrega por cada item
7. Reflejarlo en despachos y domicilios
8. Añadir geolocalización/GPS solo como ayuda

---

## 12. Conclusión

La propuesta es correcta y encaja con la arquitectura actual del ERP.

La clave es no mezclar:

- historia clínica del paciente
- producción de lentes
- logística de entregas

Cada uno debe tener su flujo y su estado, pero todos deben estar conectados a la misma operación comercial.

La receta actual debe ser la fórmula viva del cliente.

El historial de fórmulas debe ser el diagnóstico evolutivo.

La tarea del laboratorio debe ser la operación de producción.

La tarea del domiciliario debe ser la ruta de entregas del día.

Este es el flujo más limpio, operativo y escalable para este negocio.
