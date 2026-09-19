# AGENTE VERTICAL 06: CITAS & SALUD VISUAL (OPTOMETRÍA)

## Submódulos Alineados del Menú:
- **Programación de Citas** (Calendario interactivo, horas, buscador CRM)
- **Optometría (Fórmulas)** (Refracción, esfera, cilindro, eje, adición, historia clínica)

## Componentes y Tablas Relacionadas:
- Componentes: `SaaSErpAppointments.tsx`, `SaaSErpFormulas.tsx`
- Tablas SQL: `appointments`, `optometry_records`

## Directrices de Negocio:
1. Husos horarios protegidos en citas (evitar desplazamientos UTC).
2. Cálculo de fórmulas oftálmicas y prescripción autorizada por optómetra.
