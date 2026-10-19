# Documentación de Diagnóstico y Rediseño: Códigos de Barras y SKUs (Parte 2)

**Fecha:** 16 de Octubre de 2026  
**Sistema:** FRANT ERP  
**Módulos afectados:** Inventario, Facturación POS, Impresión de Etiquetas Térmicas (2 Columnas - Óptica / Joyería)

---

## 1. Problemas Identificados con el Sistema Anterior

### A. Fallo de Lectura en Pistola de Código de Barras (Omitiendo Guiones)
* **Síntoma:** Al escanear una etiqueta con la pistola en Facturación o Inventario, el lector introduce `MONTNEG177` en lugar de `MONT-NEG-177`. A veces, incluso introduciendo los guiones manualmente, el producto no se encuentra.
* **Causa Raíz:**
  1. **Discrepancia de distribución de teclado (HID Keyboard):** La gran mayoría de pistolas lectoras emulan teclados físicos con distribución **US English** de fábrica. En los sistemas operativos con teclado en **Español (Latinoamérica/Colombia)**, el código de tecla para el carácter `-` (guion) no coincide, provocando que Windows lo ignore, lo trague o inserte un apóstrofe/carácter nulo.
  2. **Búsqueda estricta en Base de Datos y Frontend:** Tanto en el endpoint `/api/clients/:clientId/products/sku/:sku` como en el frontend de Inventario y Facturación, se realizaban comparaciones exactas con guiones (`LOWER(sku) = LOWER($2)`). Al recibir `MONTNEG177` sin guiones, la coincidencia fallaba de inmediato.

### B. Deformación y Fusión de Barras en la Impresión Térmica
* **Síntoma:** En la pantalla del sistema el código de barras se visualiza nítido y con espacios, pero al invocar el diálogo de impresión del navegador (`window.print()`), las barras negras del extremo derecho se pegan entre sí, eliminando los espacios en blanco y formando bloques negros gruesos que la pistola no puede decodificar.
* **Causa Raíz:**
  1. **Exceso de densidad de módulos en espacio reducido:** En etiquetas térmicas dobles (31.5 mm de ancho útil total por sticker), el espacio máximo para el código de barras es de aproximadamente **28 mm**.
  2. Un SKU como `MONT-NEG-177` consta de 12 caracteres alfanuméricos y símbolos. En **Code 128 (Juego B)**, cada carácter requiere 11 módulos elementales (barras y espacios), sumando más de **165 módulos**.
  3. En un cabezal térmico estándar de 203 DPI (8 puntos por milímetro), 28 mm equivalen a ~224 puntos físicos. Dividir 224 puntos entre 165 módulos da **~1.3 puntos por módulo**. Como una impresora térmica no puede imprimir fracciones de punto, el rasterizador del navegador aplica *anti-aliasing* (difuminado de grises), y el controlador térmico satura los grises a negro puro, eliminando los espacios blancos de 1 módulo.

---

## 2. Solución Estratégica: Adopción de SKUs Numéricos Puros (Code 128C)

### Por qué el formato numérico es superior:
1. **Compresión Automática en Code 128C:**
   * Cuando un código de barras en Code 128 está compuesto **únicamente por dígitos numéricos pares**, el estándar conmuta automáticamente a **Code 128 Modo C**.
   * En Modo C, **cada símbolo codifica 2 números simultáneamente**.
   * Un código de **6 dígitos** (ej. `100001`) requiere apenas **3 pares = 3 símbolos** (+ inicio, verificación y fin), reduciendo el código a menos de **60 módulos** (casi un 65% menos de barras y espacios que `MONT-NEG-177`).
   * Un código de **8 dígitos** (ej. `10000001`) requiere solo **4 pares = 4 símbolos** (~70 módulos), garantizando 90 millones de combinaciones posibles.
2. **Barras Físicamente Anchas y Espacios Claros:** Al haber menos barras en los 28 mm, cada barra y espacio adquiere un ancho de 3 a 4 puntos térmicos íntegros, eliminando cualquier posibilidad de que se peguen en la impresión.
3. **Inmunidad a Idiomas de Teclado:** Los números del `0` al `9` transmiten exactamente los mismos *scancodes* tanto en teclados en inglés como en español. La pistola jamás perderá un número.

---

## 3. Plan de Pruebas y Migración Automática

### Fase 1: Prueba de Concepto en Referencia de Ejemplo (`95921`)
1. Probar en la referencia de montura `95921` (variante Negro):
   * Probar con formato de **8 dígitos** (ej: `10000001` a `10000002`).
   * Probar con formato de **6 dígitos** (ej: `100001` a `100002`).
2. Imprimir en la impresora térmica de 2 columnas (31.5 mm).
3. Validar con la pistola física que:
   - Las barras salgan perfectamente separadas sin manchas negras.
   - La pistola lea el código a la primera pasada.
   - El producto se agregue automáticamente en Facturación y se localice en Inventario.

### Fase 2: Script de Migración Automática para Todo el Stock de la Óptica
* Una vez validada la referencia piloto, se ejecutará una migración automática por script en la base de datos (PostgreSQL):
  1. Asignará una secuencia numérica consecutiva única (de 6 u 8 dígitos, según el resultado de la prueba) a cada producto y variante activa del cliente (`client_id`).
  2. Preservará la referencia comercial y el nombre del producto intactos (ej: `95921 - Negro`).
  3. No requerirá que el empleado edite producto por producto manualmente: el stock quedará listo directamente para imprimir las nuevas etiquetas en lote y colocarlas en las monturas.
