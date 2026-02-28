# Lab Native Worker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrar el análisis técnico incremental de Lab a Web Worker nativo para aumentar capacidad de cálculo y robustez bajo carga.

**Architecture:** Worker dedicado de Lab con protocolo `ANALYSIS_RUN/RESULT/ERROR/CANCEL`; cliente tipado con `requestId`; fallback a main thread en timeout/error.

**Tech Stack:** Next.js 16, React/TypeScript, Web Worker nativo, engine incremental existente (`incrementalTechnicalEngine`), ESLint + tsc + build.

---

### Task 1: Infraestructura de mensajes worker

**Files:**
- Create: `/srv/apps/portfolio/src/types/technicalWorker.ts`
- Create: `/srv/apps/portfolio/src/workers/technicalAnalysis.worker.ts`

**Step 1: Write the failing test**
- Crear test unitario simple de shape de mensajes (o compilación de tipos).

**Step 2: Run test to verify it fails**
- Ejecutar `pnpm type-check` y confirmar faltan tipos/archivos.

**Step 3: Write minimal implementation**
- Definir tipos `WorkerRequest`, `WorkerResponse`, payloads y estados.
- Implementar listener en worker para `ANALYSIS_RUN` y retorno básico.

**Step 4: Run test to verify it passes**
- `pnpm type-check`

**Step 5: Commit**
- `feat: add native technical analysis worker protocol`

### Task 2: Conectar engine incremental dentro del worker

**Files:**
- Modify: `/srv/apps/portfolio/src/workers/technicalAnalysis.worker.ts`
- Modify: `/srv/apps/portfolio/src/lib/incrementalTechnicalEngine.ts` (si necesita APIs auxiliares)

**Step 1: Write the failing test**
- Caso `ANALYSIS_RUN` debe devolver `analysis + metrics`.

**Step 2: Run test to verify it fails**
- Ejecutar tests/type-check.

**Step 3: Write minimal implementation**
- Llamar `computeIncrementalTechnicalAnalysis(...)` desde worker.
- Enviar `ANALYSIS_RESULT` con `requestId`.

**Step 4: Run test to verify it passes**
- `pnpm type-check`

**Step 5: Commit**
- `feat: run incremental engine inside native worker`

### Task 3: Cliente worker tipado con requestId/timeout

**Files:**
- Create: `/srv/apps/portfolio/src/lib/technicalAnalysisWorkerClient.ts`

**Step 1: Write the failing test**
- Test de cliente: requestId incrementa y descarta respuestas stale.

**Step 2: Run test to verify it fails**
- Ejecutar tests/tsc.

**Step 3: Write minimal implementation**
- Crear/gestionar instancia worker.
- API `runAnalysis(request)` + timeout.
- Resolver solo `requestId` vigente.

**Step 4: Run test to verify it passes**
- `pnpm type-check`

**Step 5: Commit**
- `feat: add worker client with request tracking and timeout`

### Task 4: Integración en PatternAnalysisLab

**Files:**
- Modify: `/srv/apps/portfolio/src/components/charts/PatternAnalysisLab.tsx`

**Step 1: Write the failing test**
- Integración: cambios rápidos no deben renderizar resultado obsoleto.

**Step 2: Run test to verify it fails**
- Ejecutar tests/tsc.

**Step 3: Write minimal implementation**
- Reemplazar llamada directa por cliente worker.
- Implementar fallback a cálculo local en error/timeout.
- Mostrar `mode` (`worker`/`fallback`) y `durationMs`.

**Step 4: Run test to verify it passes**
- `pnpm lint && pnpm type-check`

**Step 5: Commit**
- `feat: integrate native worker analysis into pattern lab with fallback`

### Task 5: Cancelación best-effort y limpieza

**Files:**
- Modify: `/srv/apps/portfolio/src/lib/technicalAnalysisWorkerClient.ts`
- Modify: `/srv/apps/portfolio/src/workers/technicalAnalysis.worker.ts`
- Modify: `/srv/apps/portfolio/src/components/charts/PatternAnalysisLab.tsx`

**Step 1: Write the failing test**
- Test de cancelación: response cancelada no debe aplicarse.

**Step 2: Run test to verify it fails**
- Ejecutar tests.

**Step 3: Write minimal implementation**
- Mensaje `ANALYSIS_CANCEL` best-effort.
- UI ignora stale por `requestId`.
- Cleanup de worker en unmount.

**Step 4: Run test to verify it passes**
- `pnpm lint && pnpm type-check`

**Step 5: Commit**
- `feat: add cancellation path and stale response guard`

### Task 6: Gate final y documentación

**Files:**
- Modify: `/srv/apps/portfolio/README.md` (sección worker opcional)
- Optional: `/srv/apps/portfolio/docs/plans/2026-02-28-lab-native-worker-design.md`

**Step 1: Write the failing test**
- Ejecutar battery completa.

**Step 2: Run test to verify it fails**
- `pnpm lint && pnpm type-check && pnpm backtest:calibration && pnpm build`

**Step 3: Write minimal implementation**
- Corregir gaps detectados.

**Step 4: Run test to verify it passes**
- Repetir battery completa con PASS.

**Step 5: Commit**
- `chore: finalize native worker rollout verification`
