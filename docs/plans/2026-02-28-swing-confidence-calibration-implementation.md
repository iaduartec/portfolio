# Swing Confidence Calibration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar calibración de confianza para señales técnicas swing, manteniendo cobertura amplia y mejorando la confiabilidad de `confidence` en UI y ranking.

**Architecture:** Se conserva el pipeline actual de señales y se añade una capa de calibración (`signalCalibration`) entre generación y consumo en UI. Se implementa rollout progresivo con modo sombra/dual y validación por tests + backtesting.

**Tech Stack:** Next.js 16, TypeScript, React, módulos `src/lib/*`, componentes charts (`PatternAnalysisLab`, `PortfolioValueChart`), ESLint, `tsc`.

---

### Task 1: Baseline técnico y evidencia inicial

**Files:**
- Test: `/srv/apps/portfolio/src/lib/technical-analysis.ts`
- Test: `/srv/apps/portfolio/src/components/charts/PatternAnalysisLab.tsx`
- Test: `/srv/apps/portfolio/src/components/charts/PortfolioValueChart.tsx`

**Step 1: Write the failing test**

```bash
pnpm lint && pnpm type-check
```

Expected: PASS baseline actual antes de cambios.

**Step 2: Run test to verify it fails**

Run: `pnpm build`
Expected: PASS baseline (si falla, bloquear implementación y corregir primero).

**Step 3: Write minimal implementation**

```bash
git status --short
```

(Confirmar estado limpio para trazabilidad de cambios.)

**Step 4: Run test to verify it passes**

Run: `pnpm lint && pnpm type-check && pnpm build`
Expected: PASS.

**Step 5: Commit**

```bash
git add .
git commit -m "chore: record clean baseline before swing calibration"
```

### Task 2: Definir tipos y contrato de calibración

**Files:**
- Modify: `/srv/apps/portfolio/src/types/portfolio.ts` (si aplica contrato compartido)
- Create: `/srv/apps/portfolio/src/lib/signalCalibration.ts`
- Modify: `/srv/apps/portfolio/src/lib/technical-analysis.ts`

**Step 1: Write the failing test**

```typescript
// signalCalibration.test.ts (nuevo)
it('returns calibrated confidence metadata for swing signal', () => {
  const result = calibrateSignal(mockSignal, mockRegime);
  expect(result).toHaveProperty('calibratedConfidence');
  expect(result).toHaveProperty('confidenceBand');
  expect(result).toHaveProperty('calibrationReason');
});
```

**Step 2: Run test to verify it fails**

Run: test unit dirigido al archivo nuevo.
Expected: FAIL (función no implementada).

**Step 3: Write minimal implementation**

```typescript
export type ConfidenceBand = 'high' | 'medium' | 'low';

export function calibrateSignal(...) {
  return {
    calibratedConfidence: rawConfidence,
    confidenceBand: 'medium',
    calibrationReason: 'Baseline calibration',
  };
}
```

**Step 4: Run test to verify it passes**

Run: tests unit + `pnpm type-check`.
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/signalCalibration.ts src/lib/technical-analysis.ts src/types/portfolio.ts
git commit -m "feat: add signal calibration contract and base calibrator"
```

### Task 3: Implementar detector de régimen (swing)

**Files:**
- Modify: `/srv/apps/portfolio/src/lib/signalCalibration.ts`
- Test: `/srv/apps/portfolio/tests` (o suite TS existente)

**Step 1: Write the failing test**

```typescript
it('classifies high volatility trend regime correctly', () => {
  const regime = detectRegime(mockCandlesHighVolTrend);
  expect(regime.volatility).toBe('high');
  expect(regime.trend).toBe('bullish');
});
```

**Step 2: Run test to verify it fails**

Run: test unit de `detectRegime`.
Expected: FAIL.

**Step 3: Write minimal implementation**

```typescript
export function detectRegime(input) {
  return { trend: 'sideways', volatility: 'medium', noise: 'mixed' };
}
```

(Refinar con reglas reales de tendencia/volatilidad.)

**Step 4: Run test to verify it passes**

Run: test unit + `pnpm type-check`.
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/signalCalibration.ts
git commit -m "feat: add swing regime detection for confidence calibration"
```

### Task 4: Reglas de calibración y límites

**Files:**
- Modify: `/srv/apps/portfolio/src/lib/signalCalibration.ts`
- Modify: `/srv/apps/portfolio/src/lib/technical-analysis.ts`

**Step 1: Write the failing test**

```typescript
it('penalizes reversal signal in high volatility without confirmation', () => {
  const out = calibrateSignal(reversalSignal, highVolRegime);
  expect(out.calibratedConfidence).toBeLessThan(reversalSignal.rawConfidence);
});

it('caps confidence by dynamic ceiling', () => {
  const out = calibrateSignal(overconfidentSignal, trendRegime);
  expect(out.calibratedConfidence).toBeLessThanOrEqual(expectedCeiling);
});
```

**Step 2: Run test to verify it fails**

Run: tests unit calibración.
Expected: FAIL.

**Step 3: Write minimal implementation**

```typescript
const DYNAMIC_CEILINGS = { ... };
const REGIME_ADJUSTMENTS = { ... };
// apply clamp + adjustments + conflict degradation
```

**Step 4: Run test to verify it passes**

Run: tests calibración + `pnpm lint && pnpm type-check`.
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/signalCalibration.ts src/lib/technical-analysis.ts
git commit -m "feat: implement swing confidence calibration rules and ceilings"
```

### Task 5: Integración en PatternAnalysisLab

**Files:**
- Modify: `/srv/apps/portfolio/src/components/charts/PatternAnalysisLab.tsx`

**Step 1: Write the failing test**

```typescript
it('renders calibrated confidence band and reason for active signal', () => {
  render(<PatternAnalysisLab ... />);
  expect(screen.getByText(/high|medium|low/i)).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: test componente.
Expected: FAIL.

**Step 3: Write minimal implementation**

```tsx
<span>{signal.confidenceBand}</span>
<p>{signal.calibrationReason}</p>
```

**Step 4: Run test to verify it passes**

Run: test componente + `pnpm type-check`.
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/charts/PatternAnalysisLab.tsx
git commit -m "feat: surface calibrated confidence and reasons in pattern lab"
```

### Task 6: Integración en PortfolioValueChart (ranking/priorización)

**Files:**
- Modify: `/srv/apps/portfolio/src/components/charts/PortfolioValueChart.tsx`

**Step 1: Write the failing test**

```typescript
it('prioritizes signals by calibrated confidence over raw confidence', () => {
  const ranked = rankSignals(mockSignals);
  expect(ranked[0].calibratedConfidence).toBeGreaterThanOrEqual(ranked[1].calibratedConfidence);
});
```

**Step 2: Run test to verify it fails**

Run: test unit/componente asociado.
Expected: FAIL.

**Step 3: Write minimal implementation**

```typescript
signals.sort((a, b) => b.calibratedConfidence - a.calibratedConfidence);
```

**Step 4: Run test to verify it passes**

Run: tests + `pnpm lint && pnpm type-check`.
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/charts/PortfolioValueChart.tsx
git commit -m "feat: rank technical signals using calibrated confidence"
```

### Task 7: Fallbacks y resiliencia

**Files:**
- Modify: `/srv/apps/portfolio/src/lib/signalCalibration.ts`
- Modify: `/srv/apps/portfolio/src/components/charts/PatternAnalysisLab.tsx`

**Step 1: Write the failing test**

```typescript
it('falls back to conservative confidence when regime data is missing', () => {
  const out = calibrateSignal(signalWithoutRegime, null);
  expect(out.calibratedConfidence).toBeLessThanOrEqual(55);
  expect(out.confidenceBand).toBe('low');
});
```

**Step 2: Run test to verify it fails**

Run: tests fallback.
Expected: FAIL.

**Step 3: Write minimal implementation**

```typescript
if (!regimeData) return { calibratedConfidence: Math.min(raw, 55), confidenceBand: 'low', ... };
```

**Step 4: Run test to verify it passes**

Run: tests + `pnpm type-check`.
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/signalCalibration.ts src/components/charts/PatternAnalysisLab.tsx
git commit -m "feat: add conservative fallback behavior for calibration failures"
```

### Task 8: Validación final y métricas de cobertura

**Files:**
- Modify: `/srv/apps/portfolio/docs/plans/2026-02-28-swing-confidence-calibration-design.md` (si se anota resultado)
- Optional: crear script de evaluación en `/srv/apps/portfolio/scripts/`

**Step 1: Write the failing test**

```bash
pnpm build
```

Expected: PASS obligatorio.

**Step 2: Run test to verify it fails**

Run: `pnpm lint && pnpm type-check && pnpm build`
Expected: PASS.

**Step 3: Write minimal implementation**

```bash
# ejecutar comparación baseline vs calibrado en dataset disponible
# registrar cobertura y hit-rate por banda
```

**Step 4: Run test to verify it passes**

Run: `pnpm lint && pnpm type-check && pnpm build`
Expected: PASS final.

**Step 5: Commit**

```bash
git add docs/plans/2026-02-28-swing-confidence-calibration-design.md scripts/
git commit -m "chore: finalize swing confidence calibration validation"
```
