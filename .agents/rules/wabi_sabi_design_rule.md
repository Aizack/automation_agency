# Wabi-Sabi Paper Design System Rule

## STRICT DIRECTIVE: DO NOT ALTER THE WABI-SABI DESIGN SYSTEM

1. **Design System & Theme Enforcement**:
   - The UI MUST 100% follow the **Wabi-Sabi Paper Editorial Design** system (`#F6F4EE` paper background, `#FFFFFF` cards with 4px border radius, `#D9381E` vermilion accent, `Instrument Serif` serif headings).
   - IT IS STRICTLY FORBIDDEN to alter, revert, or replace the Wabi-Sabi paper design system with old themes (e.g. Obsidia Gold, dark mode defaults, or generic Bootstrap styling).

2. **Sidebar Component Structure**:
   - The expandable sidebar MUST strictly adhere to the HTML/CSS contract defined in `propuesta_principal_wabi_sabi_koi.html`.
   - Collapsed state (64px width) MUST render ONLY icons cleanly centered with `display: none !important` on text and section wrappers (`.brand-info`, `.nav-section-title`, `.nav-text`, `.sidebar-footer`).
   - Expanded state (hover 290px width) MUST display category dropdown buttons with `sub-menu` lists and SVG icons.

3. **Backend & Functionality Preservation**:
   - Only structural ordering and data/permission binding may be updated.
   - Never remove permissions, module hooks, state handlers (`setActiveTab`), or backend functionality when updating visual views.
