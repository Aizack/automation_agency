# Rule: Optometría y Historia Clínica Optométrica

Toda modificación al módulo de Optometría (`SaaSErpFormulas.tsx`), Inventario (`SaaSErpInventory.tsx`), CRM (`SaaSErpCRM.tsx`) o Historias Clínicas DEBE cumplir estrictamente estas reglas permanentes:

1. **Pestaña Externa de Optometría:**
   - Debe mantenerse limpia únicamente para el registro rápido de la nueva prescripción.
   - **NO** colocar recuadros de "Examen Anterior" en la pantalla principal externa.

2. **Modal Emergente de Historia Clínica:**
   - **Comparativa Estructurada en Columnas:** En la Sección 3, tanto el Examen Anterior como el Examen Reciente DEBEN estructurarse en 6 columnas con cabeceras explícitas (`ESF | CIL | EJE | ADD | PRISMA | AV`) para OD y OI.
   - **Autocompletado de Fórmula:** Al hacer clic en `+ Nueva Historia Clínica`, los campos de refracción se cargan automáticamente sin re-digitación manual.
   - **Visualización Directa:** `👁️ Ver Historia Clínica` abre directamente el overlay emergente sin cambiar de pestaña.
   - **Antecedentes Separados:** Checkboxes e inputs independientes de Notas para **Alergias Medicamentosas / Ambientales** y **Antecedentes Familiares**. NUNCA mezclarlos o unificarlos en un solo campo.

3. **Inventario & Impresión de Códigos de Barras por Variante:**
   - **Muestra de Colores (Círculos):** Los círculos de las variantes en la lista e inventario DEBEN renderizar el color hexadecimal correspondiente (`getColorHex`). Si el producto indica "Café", "Carey", "Negro", etc., debe mostrar su color real y no un círculo gris estándar.
   - **Navegación por Dropdown en Modal de Impresión:** El modal `Imprimir Código de Barras` DEBE incluir un selector desplegable (dropdown) con todos los colores/variantes de la referencia para poder cambiar entre ellas e imprimir sin cerrar ni cancelar el cuadro.

4. **Impresión Institucional:**
   - La fórmula debe poder imprimirse desde Optometría y desde el perfil del cliente en Recepción/CRM (`SaaSErpCRM.tsx`).
   - Encabezado institucional obligatorio: Nombre del negocio, NIT, Dirección y Celular/Teléfono.

5. **Estilo Universal:**
   - Todos los botones e inputs deben usar **`rounded-md`** (rectangulares de esquinas suaves). Cero botones u objetos ovalados o píldora (`rounded-full`, `rounded-xl`, `rounded-3xl`).
