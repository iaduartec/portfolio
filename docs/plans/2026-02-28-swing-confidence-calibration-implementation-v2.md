# Swing Confidence Calibration V2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Validar y endurecer la calibración swing ya implementada, con métricas objetivas de mejora (`raw` vs `calibrated`) y rollout controlado.

**Architecture:** Mantener la calibración en `src/lib/signalCalibration.ts` y añadir capa de evaluación (backtest + observabilidad) junto con modos de despliegue (`shadow`/`dual`/`full`) para reducir riesgo de regresión.

**Tech Stack:** Next.js 16, TypeScript, módulos `src/lib/*`, charts en `src/components/charts/*`, scripts Node (`scripts/*`), ESLint + TypeScript + build.

---

### Task 1: Baseline de métricas (pre-ajustes)

**Files:**
- Create: `/srv/apps/portfolio/scripts/backtest-calibration.ts`
- Modify: `/srv/apps/portfolio/package.json`

**Step 1: Write the failing test**

```bash
pnpm backtest:calibration
```

Expected: FAIL (script aún no existe).

**Step 2: Run test to verify it fails**

Run: `pnpm backtest:calibration`
Expected: command not found / script missing.

**Step 3: Write minimal implementation**

- Crear script que calcule por señal:
- `raw_confidence`
- `calibrated_confidence`
- `confidence_band`
- outcome simplificado (acierto/fallo en ventana swing).
- Exportar resumen a stdout y JSON.

**Step 4: Run test to verify it passes**

Run: `pnpm backtest:calibration`
Expected: PASS con reporte generado.

**Step 5: Commit**

```bash
git add scripts/backtest-calibration.ts package.json
git commit -m "feat: add baseline backtest script for confidence calibration"
```

### Task 2: Métricas de calibración y cobertura

**Files:**
- Modify: `/srv/apps/portfolio/scripts/backtest-calibration.ts`
- Create: `/srv/apps/portfolio/docs/plans/2026-02-28-swing-confidence-calibration-metrics.md`

**Step 1: Write the failing test**

- Añadir assertions internas de script para requerir:
- cobertura en rango `+/-10%`
- hit-rate banda `high` > baseline.

**Step 2: Run test to verify it fails**

Run: `pnpm backtest:calibration`
Expected: FAIL si no se cumplen métricas.

**Step 3: Write minimal implementation**

- Implementar cálculo por bandas:
- `coverage_delta`
- `hit_rate_by_band`
- `calibration_error_proxy`.
- Registrar resultados en markdown de métricas.

**Step 4: Run test to verify it passes**

Run: `pnpm backtest:calibration`
Expected: PASS con métricas completas.

**Step 5: Commit**

```bash
git add scripts/backtest-calibration.ts docs/plans/2026-02-28-swing-confidence-calibration-metrics.md
git commit -m "feat: add calibration metrics and coverage gates"
```

### Task 3: Shadow mode

**Files:**
- Modify: `/srv/apps/portfolio/src/components/charts/PatternAnalysisLab.tsx`
- Modify: `/srv/apps/portfolio/src/components/charts/PortfolioValueChart.tsx`
- Modify: `/srv/apps/portfolio/src/lib/signalCalibration.ts`

**Step 1: Write the failing test**

- Test de modo shadow: UI no muestra calibrado, pero cálculo interno existe.

**Step 2: Run test to verify it fails**

Run: tests unit/component.
Expected: FAIL (modo aún no implementado).

**Step 3: Write minimal implementation**

- Añadir flag `NEXT_PUBLIC_SIGNAL_CALIBRATION_MODE` con valores:
- `shadow`
- `dual`
- `full`.
- En `shadow`, usar calibración para logging interno sin exposición visual.

**Step 4: Run test to verify it passes**

Run: tests + `pnpm type-check`.
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/charts/PatternAnalysisLab.tsx src/components/charts/PortfolioValueChart.tsx src/lib/signalCalibration.ts
git commit -m "feat: add shadow mode for swing confidence calibration"
```

### Task 4: Dual mode (raw + calibrated)

**Files:**
- Modify: `/srv/apps/portfolio/src/components/charts/PatternAnalysisLab.tsx`
- Modify: `/srv/apps/portfolio/src/components/charts/PortfolioValueChart.tsx`

**Step 1: Write the failing test**

- Test UI: en `dual` se muestran `raw` y `calibrated` por señal.

**Step 2: Run test to verify it fails**

Run: tests componente.
Expected: FAIL.

**Step 3: Write minimal implementation**

- Mostrar chips/labels comparativos por señal:
- `Raw: xx%`
- `Calibrated: yy%`
- `Band: high|medium|low`.

**Step 4: Run test to verify it passes**

Run: tests + `pnpm lint && pnpm type-check`.
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/charts/PatternAnalysisLab.tsx src/components/charts/PortfolioValueChart.tsx
git commit -m "feat: add dual mode confidence comparison in technical views"
```

### Task 5: Ajuste fino de reglas de calibración

**Files:**
- Modify: `/srv/apps/portfolio/src/lib/signalCalibration.ts`

**Step 1: Write the failing test**

- Casos edge:
- reversión + volatilidad alta + ruido alto => penalización fuerte.
- continuidad + régimen alineado limpio => bonificación controlada.

**Step 2: Run test to verify it fails**

Run: tests unit calibración.
Expected: FAIL.

**Step 3: Write minimal implementation**

- Ajustar pesos/tablas para cumplir métricas del Task 2.
- Mantener cobertura, no filtrar señales.

**Step 4: Run test to verify it passes**

Run: tests calibración + `pnpm backtest:calibration`.
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/signalCalibration.ts
git commit -m "feat: tune swing calibration weights from backtest metrics"
```

### Task 6: Observabilidad mínima

**Files:**
- Modify: `/srv/apps/portfolio/src/lib/signalCalibration.ts`
- Create: `/srv/apps/portfolio/src/lib/signalCalibrationTelemetry.ts`

**Step 1: Write the failing test**

- Test estructura de log: debe incluir `raw`, `calibrated`, `band`, `regime`, `reason`.

**Step 2: Run test to verify it fails**

Run: tests unit.
Expected: FAIL.

**Step 3: Write minimal implementation**

- Emitir eventos de calibración en modo no-productivo o bajo flag.

**Step 4: Run test to verify it passes**

Run: tests + `pnpm type-check`.
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/signalCalibrationTelemetry.ts src/lib/signalCalibration.ts
git commit -m "feat: add calibration telemetry for iterative tuning"
```

### Task 7: Release gate

**Files:**
- Modify: `/srv/apps/portfolio/README.md` (sección técnica breve)
- Modify: `/srv/apps/portfolio/docs/plans/2026-02-28-swing-confidence-calibration-metrics.md`

**Step 1: Write the failing test**

```bash
pnpm lint && pnpm type-check && pnpm build && pnpm backtest:calibration
```

Expected: FAIL si alguna puerta no cumple.

**Step 2: Run test to verify it fails**

Run: comando completo.
Expected: PASS o FAIL con evidencia.

**Step 3: Write minimal implementation**

- Corregir gaps detectados por gates.
- Dejar modo recomendado en producción (`full` o `shadow` según resultado).

**Step 4: Run test to verify it passes**

Run: `pnpm lint && pnpm type-check && pnpm build && pnpm backtest:calibration`
Expected: PASS.

**Step 5: Commit**

```bash
git add README.md docs/plans/2026-02-28-swing-confidence-calibration-metrics.md
git commit -m "chore: finalize release gates for swing confidence calibration"
```
