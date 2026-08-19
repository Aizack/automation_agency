# Calibración de impresión térmica - rollo de 2 stickers por fila

## Medidas físicas reales

- Ancho total del papel: 70.5 mm
- Ancho útil del bloque de stickers: 65.5 mm
- Alto del sticker: 15.0 mm
- Margen izquierdo (liner expuesto): 3.0 mm
- Margen derecho (liner expuesto): 1.0 mm
- Gap vertical entre filas: 2.5 mm
- Estructura: 2 stickers por fila
- Ancho útil por sticker: aproximadamente 31.5 mm
- Gap central entre stickers: aproximadamente 2.5 mm

## Regla funcional

El driver no interpreta la impresión como una hoja normal con páginas separadas. Interpreta el papel como un bloque físico de stickers troquelados, con 2 stickers por fila y un gap real entre filas.

Por eso la lógica de render debe ser:

- Agrupar la cantidad total en filas de 2 stickers
- `const totalFilas = Math.ceil(N / 2)`
- Cada fila es un bloque independiente dentro del mismo flujo continuo
- Si `N` es impar, la última celda se deja vacía/oculta
- El contenido dentro del sticker debe quedar dentro del bloque real del sticker, no al borde del papel

## Layout recomendado para CSS de impresión

```css
@media print {
  @page {
    size: 70.5mm 17.5mm; /* 15mm de etiqueta + 2.5mm de gap vertical */
    margin: 0;
  }

  body {
    margin: 0;
    padding: 0;
  }

  .fila-etiquetas {
    width: 70.5mm;
    height: 15mm;
    display: flex;
    justify-content: flex-start;
    padding-left: 3mm;
    padding-right: 1mm;
    box-sizing: border-box;
    page-break-after: always;
    break-after: page;
    overflow: hidden;
  }

  .sticker-individual {
    width: 31.5mm;
    height: 15mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-evenly;
    padding: 1mm 1.5mm;
    box-sizing: border-box;
    overflow: hidden;
  }

  .sticker-individual:first-child {
    margin-right: 2.5mm;
  }

  .sticker-titulo {
    font-size: 7px;
    font-weight: 700;
    line-height: 1;
    max-width: 28mm;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
  }

  .sticker-barcode {
    max-width: 28mm;
    height: 6mm !important;
    display: block;
  }

  .sticker-detalle {
    font-size: 7px;
    font-weight: 700;
    line-height: 1;
    text-align: center;
  }
}
```

## Observación clave

El papel completo no es la etiqueta; el papel completo tiene margen de lona y el bloque útil de sticker está centrado dentro de ese papel. El contenido debe respetar el bloque útil del sticker y no debe empezar desde el borde exterior del papel.

La información debe ir dentro del bloque interno del sticker con un margen de seguridad de aproximadamente 1 mm.

## Conclusión

La corrección debe hacerse pensando en un troquel real de 2 stickers por fila, no como una página normal ni como una hoja separada. El driver interpreta el espacio físico entre stickers como parte del patrón, por eso el gap vertical y los márgenes laterales deben respetarse exactamente.

## Checklist de validación

- Imprimir 4 etiquetas
- Verificar que salen 2 filas x 2 stickers
- Verificar que no haya hueco blanco entre filas
- Verificar que la segunda fila quede alineada con la primera
- Verificar que el contenido quede dentro del bloque del sticker y no pegado al borde
- Repetir con 6 etiquetas para validar continuidad
