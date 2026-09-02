# Rule: Optometría y Historia Clínica Optométrica

Toda modificación al módulo de Optometría (`SaaSErpFormulas.tsx`), CRM (`SaaSErpCRM.tsx`) o Historias Clínicas DEBE cumplir estrictamente estas reglas permanentes:

1. **Pestaña Externa de Optometría:**
   - Debe mantenerse limpia únicamente para el registro rápido de la nueva prescripción.
   - **NO** colocar recuadros de "Examen Anterior" en la pantalla principal externa.

2. **Modal Emergente de Historia Clínica:**
   - La comparativa de **Examen Anterior (Fecha previa)** debe ir **DENTRO** de la Sección 3 del modal de Historia Clínica.
   - **Autocompletado de Fórmula:** Al hacer clic en `+ Nueva Historia Clínica`, los campos de refracción se cargan automáticamente sin re-digitación manual.
   - **Visualización Directa:** `👁️ Ver Historia Clínica` abre directamente el overlay emergente sin cambiar de pestaña.
   - **Antecedentes:** Debe incluir la grilla de checkboxes (`Estrabismo`, `Carnosidad / Pterigión`, `Cataratas`, `Hipertensión`, `Diabetes`, `Cirugía Ocular`).

3. **Impresión Institucional:**
   - La fórmula debe poder imprimirse desde Optometría y desde el perfil del cliente en Recepción/CRM (`SaaSErpCRM.tsx`).
   - Encabezado institucional obligatorio: Nombre del negocio, NIT, Dirección y Celular/Teléfono.

4. **Estilo Universal:**
   - Todos los botones e inputs deben usar **`rounded-md`** (rectangulares de esquinas suaves). Cero botones u objetos ovalados o píldora (`rounded-full`, `rounded-xl`, `rounded-3xl`).
