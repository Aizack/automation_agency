# Especificación 03: Módulo de Antropometría y Fórmulas

## Funcionalidades
1. **Formulario de Captura de Medidas**:
   - Peso (kg), Talla (cm), Perímetros (cintura, cadera, brazo flexionado/relajado, muslo, pantorrilla).
   - Pliegues Cutáneos (Tríceps, Subescapular, Suprailíaco, Abdominal, Muslo, Pantorrilla).
2. **Motor de Cálculo Automático**:
   - Al ingresar los datos, calcular instantáneamente: IMC, TMB (Mifflin-St Jeor), GET según PAL seleccionado, % Grasa (Jackson-Pollock 3/7 pliegues), Kg de Masa Grasa y Kg de Masa Magra.
3. **Gráficos de Comparación Temporal**:
   - Componente React con gráfico de líneas evolutivo (Evolución de Peso vs. % Grasa en las últimas N consultas).
