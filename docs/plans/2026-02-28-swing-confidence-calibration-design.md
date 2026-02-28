# Swing Confidence Calibration - Design Doc

**Fecha:** 2026-02-28  
**Producto:** MyInvestView  
**Objetivo:** Mejorar el análisis técnico para horizonte swing manteniendo cobertura amplia y calibrando mejor la confianza de las señales.

---

## 1) Objetivo y criterio de éxito

Objetivo principal aprobado:
- Optimizar análisis técnico para **swing** con foco en **confidence más confiable** sin reducir cobertura.

Criterios de éxito:
- Cobertura de señales se mantiene dentro de +/-10% del baseline.
- Mejor correlación entre bandas de confianza y resultados reales.
- Las señales de banda alta muestran mayor tasa de acierto que baseline.

---

## 2) Enfoque elegido

Enfoque aprobado: **Calibración estadística sobre señales actuales**.

Por qué este enfoque:
- Menor riesgo de regresión funcional.
- Se apoya en pipeline técnico actual.
- Entrega mejora directa en fiabilidad de confianza con coste controlado.

Alternativas consideradas:
- Ensamble dinámico (más complejidad).
- Meta-modelo supervisado (más dependencia de datos/operación).

---

## 3) Arquitectura propuesta

Flujo:
1. Pipeline actual genera señales crudas (`raw_confidence`).
2. Detector de régimen clasifica contexto de mercado.
3. Capa de calibración ajusta confianza por señal + régimen + consistencia.
4. UI consume `calibrated_confidence` + banda + razón.

Componentes:
- `src/lib/technical-analysis.ts` (ajustes de metadata).
- `src/lib/signalCalibration.ts` (nuevo).
- `src/components/charts/PatternAnalysisLab.tsx` (consumo de confianza calibrada).
- `src/components/charts/PortfolioValueChart.tsx` (priorización con calibrado).

---

## 4) Reglas de calibración (swing)

Reglas iniciales:
- Penalizar reversión en volatilidad alta sin confirmación multi-indicador.
- Bonificar continuidad de tendencia con convergencia de señales.
- Penalizar contradicción con marco temporal superior.
- Aplicar techo dinámico por tipo de señal/régimen para evitar sobreconfianza.
- Degradar confianza cuando hay conflicto entre indicadores clave.

Salida de calibración:
- `calibrated_confidence`
- `confidence_band` (`high`, `medium`, `low`)
- `calibration_reason` (auditable y breve)

---

## 5) Manejo de errores y resiliencia

- Si faltan datos de régimen: fallback conservador (`min(raw_confidence, 55)`).
- Si falta metadata: mantener señal, pero banda `low` + razón explícita.
- Si falla calibración: no eliminar señal; degradar confianza para mantener cobertura.

---

## 6) Testing y validación

Unit tests:
- Cálculo de ajustes por régimen/tipo de señal.
- Límites (`clamp`, techos dinámicos).
- Conflictos de indicadores.

Regression tests:
- Determinismo de salida ante misma entrada.

Backtesting swing:
- Baseline vs calibrado.
- Métricas: hit-rate por banda/decil, calibration error, cobertura.

Gate de aceptación:
- Cobertura dentro de +/-10%.
- Mejora de calidad en banda alta.
- Sin degradación severa en media/baja.

---

## 7) Rollout

1. `shadow mode`: cálculo interno sin mostrar al usuario.
2. `dual mode`: mostrar raw + calibrated en laboratorio.
3. `full mode`: calibrado por defecto en UI.
4. Revisión semanal y ajuste incremental de tablas.

