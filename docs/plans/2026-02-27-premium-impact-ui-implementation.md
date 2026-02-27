# Premium/Impactante UI Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rediseñar toda la experiencia de MyInvestView (`/`, `/portfolio`, `/lab`, `/upload`) con estética premium/impactante, mayor claridad de navegación y mejoras de accesibilidad/interacción.

**Architecture:** Se aplicará un rediseño incremental por capas: (1) sistema visual global en `globals.css` y layout, (2) navegación/copy, (3) jerarquía por ruta, (4) accesibilidad y motion, (5) verificación final. El estado funcional existente (`usePortfolioData`) se mantiene para evitar regresiones de negocio.

**Tech Stack:** Next.js App Router, React + TypeScript, Tailwind CSS, ESLint, TypeScript compiler (`pnpm type-check`).

---

### Task 1: Baseline y Verificación Inicial

**Files:**
- Modify: `/srv/apps/portfolio/package.json` (si faltan scripts de verificación)
- Test: `/srv/apps/portfolio/app/**/*.tsx`, `/srv/apps/portfolio/src/components/**/*.tsx`

**Step 1: Write the failing test**

```bash
pnpm lint
```

Expected: FAIL si existe deuda actual de lint/accesibilidad.

**Step 2: Run test to verify it fails**

Run: `pnpm lint`
Expected: salida con errores actuales (si ya pasa, registrar baseline como PASS).

**Step 3: Write minimal implementation**

```bash
pnpm type-check
```

(Se valida baseline de tipos antes de cambios visuales.)

**Step 4: Run test to verify it passes**

Run: `pnpm type-check`
Expected: PASS.

**Step 5: Commit**

```bash
git add .
git commit -m "chore: capture baseline checks before premium ui redesign"
```

### Task 2: Sistema Visual Global Premium

**Files:**
- Modify: `/srv/apps/portfolio/app/globals.css`
- Modify: `/srv/apps/portfolio/app/layout.tsx`
- Modify: `/srv/apps/portfolio/src/components/layout/GridBackground.tsx`

**Step 1: Write the failing test**

```bash
pnpm lint app/globals.css app/layout.tsx src/components/layout/GridBackground.tsx
```

Expected: FAIL si aparecen reglas de estilo/clases inválidas.

**Step 2: Run test to verify it fails**

Run: `pnpm lint app/layout.tsx src/components/layout/GridBackground.tsx`
Expected: FAIL o baseline.

**Step 3: Write minimal implementation**

```tsx
// app/layout.tsx (ejemplo)
export const viewport = {
  themeColor: "#070b14",
  width: "device-width",
  initialScale: 1,
};
```

```css
/* app/globals.css (ejemplo) */
:root { color-scheme: dark; }
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm lint && pnpm type-check`
Expected: PASS.

**Step 5: Commit**

```bash
git add app/globals.css app/layout.tsx src/components/layout/GridBackground.tsx
git commit -m "feat: introduce premium global visual system and motion safeguards"
```

### Task 3: Navegación Global y Copy Premium

**Files:**
- Modify: `/srv/apps/portfolio/src/components/layout/Header.tsx`
- Modify: `/srv/apps/portfolio/src/components/layout/Footer.tsx`
- Modify: `/srv/apps/portfolio/src/components/dashboard/DashboardHero.tsx`

**Step 1: Write the failing test**

```bash
pnpm lint src/components/layout/Header.tsx src/components/layout/Footer.tsx src/components/dashboard/DashboardHero.tsx
```

Expected: FAIL si hay issues por nuevos labels/atributos.

**Step 2: Run test to verify it fails**

Run: mismo comando.
Expected: FAIL o baseline.

**Step 3: Write minimal implementation**

```tsx
// Header nav labels
const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/lab", label: "Lab" },
  { href: "/upload", label: "Importar" },
];
```

```tsx
// DashboardHero copy principal
<h1>Convierte datos dispersos en decisiones de inversión con contexto IA.</h1>
```

**Step 4: Run test to verify it passes**

Run: `pnpm lint && pnpm type-check`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/layout/Header.tsx src/components/layout/Footer.tsx src/components/dashboard/DashboardHero.tsx
git commit -m "feat: redesign global navigation and premium conversion copy"
```

### Task 4: Jerarquía por Rutas (`/`, `/portfolio`, `/lab`, `/upload`)

**Files:**
- Modify: `/srv/apps/portfolio/app/page.tsx`
- Modify: `/srv/apps/portfolio/app/(routes)/portfolio/page.tsx`
- Modify: `/srv/apps/portfolio/app/(routes)/lab/page.tsx`
- Modify: `/srv/apps/portfolio/app/(routes)/upload/page.tsx`
- Modify: `/srv/apps/portfolio/src/components/dashboard/DashboardClient.tsx`
- Modify: `/srv/apps/portfolio/src/components/portfolio/PortfolioClient.tsx`

**Step 1: Write the failing test**

```bash
pnpm type-check
```

Expected: FAIL temporal mientras se ajustan props/estructura.

**Step 2: Run test to verify it fails**

Run: `pnpm type-check`
Expected: FAIL durante refactor.

**Step 3: Write minimal implementation**

```tsx
// Ejemplo upload sectioning
<section aria-labelledby="upload-title">
  <h1 id="upload-title">Importar Movimientos</h1>
</section>
```

(Agregar subtítulos con propósito explícito: operar vs investigar; CTAs cruzadas entre rutas.)

**Step 4: Run test to verify it passes**

Run: `pnpm lint && pnpm type-check`
Expected: PASS.

**Step 5: Commit**

```bash
git add app/page.tsx 'app/(routes)/portfolio/page.tsx' 'app/(routes)/lab/page.tsx' 'app/(routes)/upload/page.tsx' src/components/dashboard/DashboardClient.tsx src/components/portfolio/PortfolioClient.tsx
git commit -m "feat: apply premium hierarchy and route-level information architecture"
```

### Task 5: Accesibilidad de Formularios e Interacción

**Files:**
- Modify: `/srv/apps/portfolio/src/components/upload/CsvDropzone.tsx`
- Modify: `/srv/apps/portfolio/src/components/charts/LabGlobalAnalyzer.tsx`
- Modify: `/srv/apps/portfolio/src/components/dashboard/DashboardSkillIntel.tsx`
- Modify: `/srv/apps/portfolio/src/components/ai/AIChat.tsx`

**Step 1: Write the failing test**

```bash
pnpm lint src/components/upload/CsvDropzone.tsx src/components/charts/LabGlobalAnalyzer.tsx src/components/dashboard/DashboardSkillIntel.tsx src/components/ai/AIChat.tsx
```

Expected: FAIL si faltan labels/focus states o hay reglas de accesibilidad.

**Step 2: Run test to verify it fails**

Run: mismo comando.
Expected: FAIL o baseline.

**Step 3: Write minimal implementation**

```tsx
<label htmlFor="ticker-input" className="sr-only">Ticker</label>
<input id="ticker-input" name="ticker" aria-label="Ticker" />
```

```tsx
<button className="focus-visible:ring-2 focus-visible:ring-accent">Acción</button>
```

(Eliminar `transition-all` en controles principales y reemplazar por propiedades explícitas.)

**Step 4: Run test to verify it passes**

Run: `pnpm lint && pnpm type-check`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/upload/CsvDropzone.tsx src/components/charts/LabGlobalAnalyzer.tsx src/components/dashboard/DashboardSkillIntel.tsx src/components/ai/AIChat.tsx
git commit -m "feat: improve form accessibility focus states and interaction quality"
```

### Task 6: Pulido de Estados y Resiliencia de Contenido

**Files:**
- Modify: `/srv/apps/portfolio/src/components/dashboard/DashboardTradingView.tsx`
- Modify: `/srv/apps/portfolio/src/components/portfolio/HoldingsTable.tsx`
- Modify: `/srv/apps/portfolio/src/components/portfolio/RealizedTradesTable.tsx`
- Modify: `/srv/apps/portfolio/src/components/upload/TransactionsTable.tsx`

**Step 1: Write the failing test**

```bash
pnpm type-check
```

Expected: FAIL temporal al introducir nuevos estados/props.

**Step 2: Run test to verify it fails**

Run: `pnpm type-check`
Expected: FAIL temporal.

**Step 3: Write minimal implementation**

```tsx
if (!rows.length) {
  return <p className="text-sm text-muted">No hay datos para mostrar…</p>;
}
```

(Agregar handling consistente para empty/error/loading y truncado seguro de texto largo.)

**Step 4: Run test to verify it passes**

Run: `pnpm lint && pnpm type-check`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/dashboard/DashboardTradingView.tsx src/components/portfolio/HoldingsTable.tsx src/components/portfolio/RealizedTradesTable.tsx src/components/upload/TransactionsTable.tsx
git commit -m "feat: standardize empty error and loading states across core data panels"
```

### Task 7: Verificación Final y Evidencia

**Files:**
- Modify: `/srv/apps/portfolio/docs/plans/2026-02-27-premium-impact-design.md` (checklist final opcional)
- Modify: `/srv/apps/portfolio/README.md` (si se documentan cambios UX)

**Step 1: Write the failing test**

```bash
pnpm lint && pnpm type-check
```

Expected: FAIL si quedó deuda tras refactor.

**Step 2: Run test to verify it fails**

Run: `pnpm lint && pnpm type-check`
Expected: FAIL o PASS.

**Step 3: Write minimal implementation**

```bash
# manual smoke
pnpm dev
# verificar /, /portfolio, /lab, /upload en desktop y mobile
```

(Registrar incidencias detectadas y aplicar fixes mínimos.)

**Step 4: Run test to verify it passes**

Run: `pnpm lint && pnpm type-check`
Expected: PASS.

**Step 5: Commit**

```bash
git add README.md docs/plans/2026-02-27-premium-impact-design.md
git commit -m "chore: finalize premium ui redesign verification and docs"
```
