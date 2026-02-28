# Lab Worker Indicator Cache Design

## Objetivo
Aumentar la capacidad de cálculo del Pattern Analysis Lab moviendo también el cálculo de indicadores al Web Worker nativo, reduciendo carga en main thread y evitando recomputaciones idénticas.

## Arquitectura propuesta
- Reutilizar `technicalAnalysis.worker.ts` para ejecutar dos etapas por request:
  1) `computeIncrementalTechnicalAnalysis` (análisis base)
  2) `computeIndicatorBundle` (indicadores + pivots + resumen)
- Extender el protocolo worker para incluir `indicatorFilters` en `ANALYSIS_RUN` y devolver `indicatorBundle` + `indicatorMetrics` en `ANALYSIS_RESULT`.
- Introducir cache en worker para indicadores con clave derivada de:
  - `symbol|timeframe`
  - último timestamp de vela
  - longitud de velas
  - firma de filtros activos

## Flujo de datos
- UI envía `candles`, `volumes`, `indicatorFilters` al worker.
- Worker responde una carga completa lista para render.
- Si worker falla/timeout, la UI aplica fallback local manteniendo consistencia funcional.

## Robustez
- Mantener cancelación best-effort por `requestId`.
- Ignorar respuestas stale en UI con la guarda existente.
- Mantener timeout y `dispose` para evitar fugas.

## Testing y verificación
- `pnpm lint`
- `pnpm type-check`
- `pnpm backtest:calibration`
- `pnpm build`

## Impacto esperado
- Menor trabajo de CPU en main thread.
- Menor latencia percibida en cambios de ticker/intervalo/filtros.
- Mayor estabilidad bajo ráfagas de interacción.
