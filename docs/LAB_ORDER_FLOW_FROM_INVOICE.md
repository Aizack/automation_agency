# Flujo correcto: factura con lentes => trabajo de laboratorio

## Objetivo

Cuando una factura incluye un producto de la categoría "Lentes", debe generarse automáticamente una orden de laboratorio en el tablero de Trabajos de laboratorio, en el estado "Por Asignar".

La regla no debe depender de texto libre como "lens" o "lente" dentro del nombre del producto.

La fuente de verdad debe ser la categoría real del producto dentro del inventario.

---

## Regla correcta

### Condición

La factura debe crear una orden de laboratorio si al menos uno de los items de la factura pertenece a la categoría "Lentes".

No importa si la factura también incluye:

- monturas
- estuches
- accesorios
- otros productos del inventario

Si existe un producto de categoría "Lentes", se dispara la orden.

---

## Qué está mal en el diseño actual

El flujo actual mezcló dos modelos distintos:

1. productos físicos del inventario
2. lentes formulados / laboratorio bajo demanda

Eso provocó que la lógica buscase palabras como "lens" o "lente" en el nombre del producto, o que hubiera una opción manual de "Lente Formulada" dentro del formulario de facturación.

Eso ya no es correcto porque:

- la categoría "Lentes" ya existe en inventario
- la factura debe depender de la categoría real
- la opción manual de lente ya no debería existir en la facturación

---

## Regla de negocio

### Debe ocurrir así:

1. Se crea la factura.
2. El backend recorre todos los items.
3. Si alguno pertenece a la categoría "Lentes":
   - crea una fila en `lab_jobs`
   - con `status = 'pending'`
   - con `invoice_id` asociado
   - con `customer_id` asociado al cliente real de la factura
   - con los datos del producto: nombre, diseño, material, tratamiento
4. La fila aparece en el tablero en "Por Asignar".
5. El usuario elige el laboratorio desde un dropdown.
6. Se actualiza el registro a `status = 'assigned'`.
7. Luego sigue el flujo normal: `sent`, `received`, `delivered`.

---

## Qué no debe hacerse

No debe hacerse lo siguiente:

- depender de un texto libre en `productName`
- buscar la palabra `lens` como heurística
- mantener la opción manual "Lente Formulada" dentro de la factura
- depender de una receta previa para activar laboratorio
- depender de un CRM match demasiado estricto para crear la orden

---

## Fuente de verdad

La fuente de verdad debe ser el producto real del inventario y su categoría.

Ejemplo:

- Producto: "Lente fotocromático"
- Categoría: "Lentes"

Entonces: factura con ese producto => crear lab order.

---

## Ajuste necesario en el frontend

En la UI de facturación, debe quitarse la opción manual de "Lente Formulada (Laboratorio Bajo Demanda)".

La factura debe quedar reducida a productos del inventario reales y la lógica del backend debe detectar los lentes por categoría, no por un toggle manual.

---

## Ajuste necesario en backend

La lógica debe verificarse así:

```ts
const hasLensProduct = items.some(item => {
  const isLensType = item.productType === 'lens';
  const belongsToLensCategory = item.category === 'Lentes';
  return isLensType || belongsToLensCategory;
});

if (hasLensProduct) {
  // crear lab_jobs con status pending
}
```

O, mejor aún, si el producto ya viene cargado con su categoría real desde la base de datos, usar esa información directamente en lugar de lógica textual.

---

## Resultado esperado

Si una factura incluye una montura y un producto de categoría Lentes, la orden deberá verse en:

- Trabajos de laboratorio
- Por Asignar

con un selector para elegir el laboratorio a donde se enviará.

---

## Conclusión

El error está en mezclar el concepto de "lente manual" con la realidad actual del sistema, donde los lentes ya existen como productos del inventario con categoría reconocible.

La solución correcta es:

- quitar la opción manual de lente en la factura
- detectar lentes por categoría real
- crear un trabajo de laboratorio desde la factura cuando exista al menos un producto de esa categoría
