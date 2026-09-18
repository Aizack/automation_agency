# Flujos de Trabajo Inter-Agentes

## Flujo 1: Implementación de Nuevo Módulo de Cálculo Nutricional

```mermaid
sequenceDiagram
    participant U as Usuario / PM
    participant O as Orquestador
    participant E as Experto Nutrición
    participant A as Arquitecto BD
    participant F as Fullstack Dev
    participant Q as QA Tester

    U->>O: "Agregar cálculo de pliegues Jackson-Pollock 7"
    O->>E: Definir fórmula matemática y rangos de validez
    E-->>O: Retorna especificación matemática comprobada
    O->>A: Actualizar tabla `anthropometric_evaluations`
    A-->>O: Entrega migración SQL y tipos DTO
    O->>F: Implementar servicio de cálculo y formulario React
    F-->>O: Entrega código funcional
    O->>Q: Ejecutar tests unitarios de precisión matemática
    Q-->>O: Confirmado (100% de tests pasan)
    O-->>U: Módulo desplegado y listo
```

## Flujo 2: Corrección de Bug o Excepción en Runtime
1. **Monitor de Errores** extrae la traza limpia del error y la causa raíz.
2. **Orquestador** redirige al **Fullstack Dev** con la línea exacta y la regla de no parche superficial.
3. **Fullstack Dev** aplica la corrección.
4. **QA Tester** re-ejecuta la prueba de regresión.
