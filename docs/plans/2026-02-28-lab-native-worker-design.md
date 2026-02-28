# Lab Native Worker Design

**Fecha:** 2026-02-28  
**Producto:** MyInvestView (Lab técnico)  
**Objetivo:** Migrar el cálculo técnico incremental de Lab a Web Worker nativo para aumentar capacidad de cálculo y mantener UI fluida.

---

## 1) Decisiones aprobadas

- **Tecnología:** Web Worker nativo (sin Comlink).
- **Arquitectura:** Worker dedicado por pantalla Lab (no singleton global).
- **Prioridad:** aumentar capacidad de cálculo (más velas/indicadores sin degradación).

---

## 2) Arquitectura

Módulos propuestos:
- `src/workers/technicalAnalysis.worker.ts`
- `src/lib/technicalAnalysisWorkerClient.ts`
- `src/components/charts/PatternAnalysisLab.tsx`
- Reusar `src/lib/incrementalTechnicalEngine.ts` dentro del worker.

Pipeline:
1. UI envía snapshot de velas/volumen al worker.
2. Worker ejecuta engine incremental por clave `symbol|timeframe`.
3. Worker responde análisis + métricas.
4. UI renderiza última respuesta válida.

---

## 3) Protocolo de mensajes

Mensajes:
- `ANALYSIS_RUN`:
  - input: `requestId`, `symbol`, `timeframe`, `candles`, `volumes`
- `ANALYSIS_RESULT`:
  - output: `requestId`, `analysis`, `metrics`
- `ANALYSIS_ERROR`:
  - output: `requestId`, `message`
- `ANALYSIS_CANCEL`:
  - input: `requestId` (best-effort)

Regla de consistencia:
- Solo se acepta en UI el resultado con `requestId` más reciente.
- Resultados tardíos se descartan.

---

## 4) Concurrencia y cancelación

- Cada cambio de `ticker/timeframe/range` crea un nuevo `requestId`.
- La UI emite cancelación best-effort del request previo.
- Si llega respuesta de request antiguo, no se aplica.

---

## 5) Manejo de errores y fallback

- Si worker falla o timeout, fallback al cálculo en hilo principal.
- Modo de observabilidad por request:
  - `mode`: `worker` | `fallback-main-thread`
  - `durationMs`
  - `requestId`
  - `status`: `ok` | `cancelled` | `error`

---

## 6) Testing

- Unit worker-client:
  - serialización de mensajes
  - descarte por requestId
  - timeout y fallback
- Unit worker:
  - `ANALYSIS_RUN` -> `ANALYSIS_RESULT`
  - errores controlados
- Integración Lab:
  - cambios rápidos de ticker sin estados viejos
  - métricas visibles correctas

---

## 7) Rollout

1. `shadow`: worker calcula, UI mantiene pipeline actual (comparar métricas).
2. `dual`: UI usa worker con fallback activo.
3. `full`: worker por defecto en Lab.

Gate de salida:
- `pnpm lint`
- `pnpm type-check`
- `pnpm backtest:calibration`
- `pnpm build`

