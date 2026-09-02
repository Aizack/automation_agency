# Normas Permanentes y Documentación Técnica: Optometría, Historia Clínica e Impresión

Este documento constituye la fuente autoritativa y permanente de reglas, estructuras y comportamientos para el módulo de **Optometría**, **Historia Clínica Optométrica** e **Impresión Institucional** en la aplicación.

---

## 1. Pestaña "Optometría y Diagnósticos" (Formulario de Trabajo Rápido)
* **Objetivo:** Registro rápido de la prescripción de lentes / fórmula óptica para la venta de gafas o envío a laboratorio.
* **Componente:** `SaaSErpFormulas.tsx`
* **Contenido de Pantalla:**
  - Buscador de clientes CRM y panel de paciente seleccionado (`+ Nueva Historia Clínica` y `👁️ Ver Historia Clínica`).
  - Formulario de **Nueva Prescripción Óptica** (Ojo Derecho OD, Ojo Izquierdo OI: Esf, Cil, Eje, Add, Prisma, AV, DP, ALT y Diagnóstico/Indicaciones).
  - Botones de acción al pie del formulario: **`Guardar Examen`** e **`Imprimir Fórmula`**.
* **REGLA DE ORO:** **NO** colocar recuadros de "Examen Anterior" en la pantalla principal externa. Esa pantalla debe mantenerse limpia únicamente para la nueva prescripción.

---

## 2. Modal Emergente "Historia Clínica Optométrica"
* **Objetivo:** Expediente clínico normado (Resolución 1995 de 1999) para la evaluación de la salud visual y comparativa de evolución.
* **Apertura:**
  - **`👁️ Ver Historia Clínica`:** Abre de inmediato en modal emergente (overlay `createPortal`) la historia guardada del paciente sin cambios de pestaña.
  - **`+ Nueva Historia Clínica`:** Abre el formulario de la historia clínica. **Los campos de refracción se autocompletan solos** tomando la fórmula médica ingresada en la pantalla de optometría o la última registrada. **CERO re-digitación manual.**
* **Estructura del Formulario:**
  1. **Información del Paciente:** Nombre, Cédula, Teléfono.
  2. **Anamnesis & Antecedentes:** Motivo de Consulta + Grilla de Checkboxes interactiva (`Estrabismo`, `Carnosidad / Pterigión`, `Cataratas`, `Hipertensión`, `Diabetes`, `Cirugía Ocular`) + Notas de antecedentes médicos y oculares.
  3. **Examen Físico Ocular & Comparativa:**
     - **Recuadro Examen Anterior:** Renderiza automáticamente la fórmula previa del historial (`Fecha`, OD/OI: `Esf | Cil | Eje | AV`).
     - **Recuadro Examen Actual / Consulta de Hoy:** Campos de AV OD/OI, Tonometría PIO OD/OI, Refracción Prescrita OD/OI (autocompletada) y Oftalmoscopía/Biomicroscopía.
  4. **Diagnóstico & Conducta:** Diagnóstico Clínico, Optómetra Tratante (vinculado a Registro/TP) y Plan de Manejo.

---

## 3. Sistema de Impresión Institucional (Membrete Oficial)
* **Puntos de Acceso:**
  - **Módulo de Optometría:** Botón `Imprimir Fórmula` en el formulario y botón `Imprimir` en el detalle de la Historia Clínica.
  - **Módulo de CRM / Recepción (`SaaSErpCRM.tsx`):** Botón `Imprimir Fórmula Óptica` dentro de la ficha del cliente.
* **Encabezado Institucional Requerido:**
  - Nombre del Negocio / Óptica (`company_name`).
  - NIT / Identificación Tributaria (`nit`).
  - Dirección Principal (`address`).
  - Teléfono / Celular (`phone`).
  - Formato limpio tipo recetario con tabla OD/OI, distancia pupilar, altura, observaciones y línea de firma con Registro Profesional.

---

## 4. Reglas Estéticas Universales
* **Curvatura de Botones e Inputs:** **SIEMPRE `rounded-md`** (rectángulos con esquinas suaves de 6px). **NUNCA** usar botones ovalados o píldora (`rounded-full`, `rounded-xl`, `rounded-3xl`).
* **Estilo de Modales:** `createPortal(..., document.body)` con fondo `bg-black/80 backdrop-blur-md z-[99999]`, tarjeta `bg-[#141517] border border-[#2d3036] p-6 rounded-2xl shadow-2xl`.
