# Especificación 01: Protocolo de Desarrollo Paso a Paso (Directrices IA)

Cualquier IA que trabaje en esta base de código debe seguir rigurosamente estos 5 pasos en cada ticket o tarea:

## Paso 1: Sincronización de Memoria Persistente
- Leer `.opencode/contexto/` y `context.md`.
- No asumir rutas ni esquemas sin inspeccionar los archivos fuente con `view_file`.

## Paso 2: Análisis de Impacto y Tipo de Tarea
- Clasificar la tarea en `.opencode/clasificaciones/taxonomia_tareas.md`.
- Asumir el agente correspondiente en `.opencode/agentes/`.

## Paso 3: Código Limpio y Tipado Estricto
- En TypeScript, no usar `any`.
- Mantener funciones pequeñas (< 50 líneas) y con responsabilidad única.
- Preservar comentarios y docstrings existentes.

## Paso 4: Verificación Obligatoria
- Nunca declarar la tarea por terminada sin ejecutar build (`npm run build`), linter o tests (`npm test`).
- Ante cualquier error de consola, leer la traza completa antes de proponer solución.

## Paso 5: Registro de Contexto (Memory Sync)
- Al finalizar la función o módulo, actualizar `context.md` con las nuevas interfaces o endpoints creados.
