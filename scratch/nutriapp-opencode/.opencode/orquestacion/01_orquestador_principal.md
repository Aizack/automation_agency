# Orquestador Principal de NutriApp

## Misión
El Orquestador es la inteligencia directiva que evalúa los prompts o tareas del usuario, analiza el estado actual del código y delega la ejecución al Agente adecuado o coordina flujos multi-agente en la secuencia correcta.

## Matriz de Enrutamiento

| Tipo de Solicitud | Agente Asignado | Secuencia de Coordinación |
|---|---|---|
| **Diseño / Modificación de Tablas de BD** | `01_arquitecto_software` | Arquitecto -> Fullstack -> Auditor HIPAA |
| **Fórmulas Calóricas o Composición Corporal** | `02_experto_dominio_nutricion` | Experto Nutrición -> QA Tester -> Fullstack |
| **Creación de Pantallas o Dashboards React** | `04_disenador_uiux_salud` | Diseñador UI/UX -> Fullstack Dev |
| **Fugas de Memoria, Excepciones, Lags de API** | `06_monitor_errores_eventos` | Monitor Errores -> Fullstack Dev |
| **Pruebas de Calidad / Tests de Algoritmos** | `07_qa_tester` | QA Tester -> Experto Nutrición |
