# Lab Capacity + Backtest + Strategy Cards Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar 3 mejoras completas: (1) motor incremental para análisis en Lab, (2) benchmark formal de calibración raw vs calibrated para release gates, (3) Strategy Cards con presets ejecutables.

**Architecture:** Dividir en tres flujos independientes para ejecución con multi-agentes:
- Flujo A (capacidad): engine incremental + integración en PatternAnalysisLab.
- Flujo B (backtest): runner formal, reporte y gates.
- Flujo C (producto): Strategy Cards UI + conexión con Lab.

**Tech Stack:** Next.js 16, TypeScript, React, utilidades técnicas existentes (`technical-analysis`, `signalCalibration`), scripts Node (`tsx`), ESLint + TypeScript + build.

---

## Task A1: Engine incremental para Lab

**Files:**
- Create: `src/lib/incrementalTechnicalEngine.ts`
- Modify: `src/components/charts/PatternAnalysisLab.tsx`

**Steps:**
1. Crear API incremental por clave (`symbol|timeframe`) con cache de velas previas.
2. Detectar caso append-only y recalcular solo ventana reciente (fallback a full compute).
3. Integrar en Lab para reemplazar cálculo directo repetitivo.
4. Exponer métricas (`durationMs`, `mode`: incremental/full).

## Task B1: Benchmark formal raw vs calibrated

**Files:**
- Modify: `scripts/backtest-calibration.ts`
- Modify: `package.json`
- Modify: `docs/plans/2026-02-28-swing-confidence-calibration-metrics.md`

**Steps:**
1. Añadir métricas por preset/escenario y resumen global.
2. Endurecer gates de release (coverage delta, high-band lift, sample floor).
3. Dejar salida JSON + markdown lista para CI.

## Task C1: Strategy Cards presets

**Files:**
- Create: `src/data/strategyPresets.ts`
- Modify: `src/components/charts/PatternAnalysisLab.tsx`

**Steps:**
1. Definir presets iniciales: `Trend Swing`, `Breakout`, `Mean Reversion`.
2. Renderizar tarjetas con objetivo, reglas y CTA de aplicación.
3. Al aplicar preset, actualizar filtros de patrones/indicadores en Lab.

## Task Z1: Verificación y release

**Commands:**
- `pnpm lint`
- `pnpm type-check`
- `pnpm backtest:calibration`
- `pnpm build`

**Done when:**
- Todos los checks pasan.
- Métricas de calibración cumplen gates.
- Presets funcionan en UI sin romper flujo actual.
