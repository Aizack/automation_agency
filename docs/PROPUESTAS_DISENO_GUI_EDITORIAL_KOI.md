# Concepto y Propuestas de Diseño GUI: Minimalismo Japonés KOI & Estética Editorial ERP

> **Documento de Investigación, Tipografía y Maquetación Visual**  
> *Inspirado en la filosofía Wabi-Sabi, Minimalismo KOI y Diagramación Editorial de Revistas Contemporáneas.*

---

## 1. Referencias Visuales Inspiracionales

El cliente ha proporcionado 5 imágenes guía que definen el norte estético del sistema:

| Referencia Visual | Concepto Clave | Aplicación en el ERP |
| :--- | :--- | :--- |
| ![KOI Logo](file:///C:/Users/PC/.gemini/antigravity/brain/cc885620-ffb4-41ce-acb9-ae41e04df3c6/media__1788497906335.png) | **Línea Fluida KOI & Tipografía Espaciada** | Trazos finos, fluidez de datos, simplicidad en blanco y negro con acentos orgánicos. |
| ![Magazine Spreads](file:///C:/Users/PC/.gemini/antigravity/brain/cc885620-ffb4-41ce-acb9-ae41e04df3c6/media__1788498026606.png) | **Grilla Editorial y Bloques de Color** | Maquetación limpia en columnas de revista, títulos en negrilla y bloques de acento amarillo/rojo. |
| ![Contents Poster](file:///C:/Users/PC/.gemini/antigravity/brain/cc885620-ffb4-41ce-acb9-ae41e04df3c6/media__1788498076946.png) | **Tipografía Vertical & Numeración Editorial** | Títulos laterales (`CONTENTS`, `01`, `02`), líneas de división nítidas y fondo cálido pastel. |
| ![Branding Poster](file:///C:/Users/PC/.gemini/antigravity/brain/cc885620-ffb4-41ce-acb9-ae41e04df3c6/media__1788498112566.png) | **Alto Contraste Tipográfico en Gran Formato** | Títulos verticales en escala gigante, elegancia minimalista en blanco y negro puro. |
| ![Creative Dept 134](file:///C:/Users/PC/.gemini/antigravity/brain/cc885620-ffb4-41ce-acb9-ae41e04df3c6/media__1788497116924.png) | **Estética Papel Wabi-Sabi y Geometría Zen** | Fondo tono papel natural (`#F4F1EA`), tipografía serif/sans impecable y formas rojas/doradas. |

---

## 2. Pilares de Diseño Exigidos

1. **Estética Minimalista Japonesa (KOI & Wabi-Sabi)**:
   * Espacios en blanco amplios (*Ma* - 間), que permiten la respiración visual y evitan la fatiga del usuario en jornadas largas de trabajo.
   * Uso de líneas ultra finas de `1px` (tinta Sumi) y acentos mínimos en rojo bermellón (*Shinju / Vermilion KOI*).
2. **Tipografía Delineada e Impecable**:
   * Fuentes de alta definición que dibujan cada letra con precisión quirúrgica (ej. *Instrument Serif*, *Plus Jakarta Sans*, *Outfit*, *Space Grotesk*).
3. **Aprovechamiento Completo de Pantalla (Full-Bleed Widescreen)**:
   * Diseños que se extienden a lo ancho de la pantalla sin encajonar artificialmente la información, organizados en grillas editoriales asimétricas.
4. **Diseño que Descansa la Vista**:
   * Tonos de fondo mate o papel natural (`#F7F5F0` o `#0B0C0E`), evitando blancos deslumbrantes o contrastes agresivos no regulados.

---

## 3. Catálogo de Propuestas de Maquetación (HTML Mockups)

Se han creado **3 propuestas de maquetación HTML interactivas** en la carpeta `dashboard/public/proposals/` para ser revisadas y combinadas según la preferencia del usuario:

### 🟢 Propuesta 1: **KOI Wabi-Sabi Paper (Calma Editorial)**
* **Concepto**: Fondo tono papel natural (`#F6F4EE`), tinta japonesa (`#161616`), detalles en rojo bermellón (`#D9381E`).
* **Tipografía**: *Instrument Serif* (Titulares elegantes) + *Plus Jakarta Sans* (Datos exactos).
* **Distribución**: Grilla amplia de revista de 12 columnas con líneas divisoras de `1px`.
* **Archivo Mockup**: `dashboard/public/proposals/propuesta1_wabi_sabi.html`

### 🌑 Propuesta 2: **KOI Kuro (Sumi Ink Dark Editorial)**
* **Concepto**: Fondo carbón profundo mate (`#0D0F12`), tipografía blanco hueso (`#E6E4DF`), acentos en naranja/rojo KOI.
* **Tipografía**: *Outfit* (Titulares modernos) + *JetBrains Mono / Inter* (Valores numéricos).
* **Distribución**: Tarjetas translúcidas flotantes, listones tipográficos verticales y paneles sin bordes pesados.
* **Archivo Mockup**: `dashboard/public/proposals/propuesta3_modern_grid.html`

### 🟡 Propuesta 3: **KOI Modern Grid (Magazine & Bloques de Acento)**
* **Concepto**: Contraste editorial blanco/negro puro (`#FAFAFA` / `#050505`) con bloques de color amarillo/rojo inspirados en revistas de diseño gráfico.
* **Tipografía**: *Syne / Space Grotesk* (Titulares verticales gigantes) + *DM Sans* (Contenido principal).
* **Distribución**: Numeración estilo revista (`01 INVENTARIO`, `02 FACTURACIÓN`), distribución expansiva bordes libres.
* **Archivo Mockup**: `dashboard/public/proposals/propuesta3_modern_grid.html`

---
*Nota: Estas propuestas son maquetas interactivas HTML puras para comparar distribución, fuentes y contraste antes de ser integradas como componentes React reutilizables.*
