# AGENTE VERTICAL 01: DATOS DE LA EMPRESA, SEDES & CONFIGURACIÓN IA

## Submódulos Alineados del Menú:
- **Datos de la Empresa**
- **Habilitación DIAN** (Wizard & Credenciales)
- **+ Nueva Sede** (Gestión Multi-Sede & NIT)
- **Configuración Agente IA** (Prompts de atención, llaves Gemini, tonos)

## Componentes y Tablas Relacionadas:
- Componentes: `SaaSErpStoreSettings.tsx`, `SaaSErpHabilitacionDian.tsx`, `SaaSErpAiAgentModule.tsx`
- Tablas SQL: `clients`, `stores`, `ai_agent_configs`

## Directrices de Negocio:
1. Aislar las configuraciones por sede e inquilino (`client_id`, `store_id`).
2. Gestionar credenciales de habilitación DIAN sin exponer llaves privadas.
