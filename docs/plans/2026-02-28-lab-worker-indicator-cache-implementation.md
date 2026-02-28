# Lab Worker Indicator Cache Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ejecutar indicadores técnicos en Web Worker con cache para mejorar capacidad de cálculo y fluidez del Lab.

**Architecture:** Extender payload/response del worker con filtros e indicadores; cachear resultados de indicadores por firma de dataset+filtros; UI consume resultado precomputado con fallback local.

**Tech Stack:** Next.js 16, React + TypeScript, Web Worker nativo, lightweight-charts, ESLint/tsc/build.

---

### Task 1: Extraer cálculo de indicadores a módulo compartido

**Files:**
- Create: `/srv/apps/portfolio/src/lib/indicatorAnalysis.ts`
- Modify: `/srv/apps/portfolio/src/components/charts/PatternAnalysisLab.tsx`

**Step 1: Write the failing test**
- Referenciar `computeIndicatorBundle` desde el componente antes de crear módulo.

**Step 2: Run test to verify it fails**
- Run: `pnpm type-check`

**Step 3: Write minimal implementation**
- Crear `computeIndicatorBundle(...)` con la lógica actual del `useMemo`.
- Definir tipos de filtros y salida (`lines`, `pivotLines`, `summary`).

**Step 4: Run test to verify it passes**
- Run: `pnpm type-check`

**Step 5: Commit**
- `feat: extract indicator bundle computation to shared module`

### Task 2: Extender contrato worker para indicadores

**Files:**
- Modify: `/srv/apps/portfolio/src/types/technicalWorker.ts`
- Modify: `/srv/apps/portfolio/src/lib/technicalAnalysisWorkerClient.ts`

**Step 1: Write the failing test**
- Exigir `indicatorFilters` en `AnalysisRunPayload` y consumir `indicatorBundle` en respuesta.

**Step 2: Run test to verify it fails**
- Run: `pnpm type-check`

**Step 3: Write minimal implementation**
- Actualizar tipos de entrada/salida y cliente.

**Step 4: Run test to verify it passes**
- Run: `pnpm type-check`

**Step 5: Commit**
- `feat: extend worker protocol with indicator payloads`

### Task 3: Calcular y cachear indicadores dentro del worker

**Files:**
- Modify: `/srv/apps/portfolio/src/workers/technicalAnalysis.worker.ts`

**Step 1: Write the failing test**
- Worker debe incluir `indicatorBundle` y `indicatorMetrics` en `ANALYSIS_RESULT`.

**Step 2: Run test to verify it fails**
- Run: `pnpm type-check`

**Step 3: Write minimal implementation**
- Integrar `computeIndicatorBundle` en worker.
- Añadir cache por firma `symbol|timeframe|lastTime|len|filters`.

**Step 4: Run test to verify it passes**
- Run: `pnpm type-check`

**Step 5: Commit**
- `feat: add worker-side indicator computation cache`

### Task 4: Integración final en PatternAnalysisLab

**Files:**
- Modify: `/srv/apps/portfolio/src/components/charts/PatternAnalysisLab.tsx`

**Step 1: Write the failing test**
- La UI debe compilar y renderizar usando bundle del worker.

**Step 2: Run test to verify it fails**
- Run: `pnpm type-check`

**Step 3: Write minimal implementation**
- Reemplazar `useMemo` local pesado por respuesta worker.
- Fallback local: análisis incremental + `computeIndicatorBundle` local.
- Mostrar métricas separadas de engine e indicadores.

**Step 4: Run test to verify it passes**
- Run: `pnpm lint && pnpm type-check`

**Step 5: Commit**
- `feat: consume worker-computed indicators in pattern lab`

### Task 5: Verificación final y push

**Files:**
- Optional Modify: `/srv/apps/portfolio/docs/plans/2026-02-28-lab-worker-indicator-cache-design.md`

**Step 1: Write the failing test**
- Ejecutar batería completa de validación.

**Step 2: Run test to verify it fails**
- Run: `pnpm lint && pnpm type-check && pnpm backtest:calibration && pnpm build`

**Step 3: Write minimal implementation**
- Corregir cualquier regresión.

**Step 4: Run test to verify it passes**
- Repetir batería completa con PASS.

**Step 5: Commit**
- `chore: finalize worker indicator cache rollout`
