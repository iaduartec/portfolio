# Premium/Impactante UI Redesign - Design Doc

**Fecha:** 2026-02-27  
**Producto:** MyInvestView (Next.js App Router)  
**Objetivo:** Elevar toda la experiencia visual y de uso hacia un estilo premium/impactante, mejorando claridad operativa, accesibilidad y consistencia en todas las rutas principales.

---

## 1) Objetivo del rediseño

Crear una interfaz de nivel profesional para inversión que se perciba más sólida, confiable y diferencial, sin perder legibilidad en flujos densos de datos.

Éxito esperado:
- Mejor jerarquía visual entre información crítica y secundaria.
- Navegación más intuitiva entre operación (`/portfolio`) e investigación (`/lab`).
- Menor fricción de onboarding en carga de transacciones (`/upload`).
- Cumplimiento reforzado de buenas prácticas de foco/accesibilidad/interacción.

---

## 2) Dirección visual aprobada

### Estilo
- Dirección: `Premium Glass Trading Desk`.
- Fondo profundo con capas translúcidas controladas y acentos financieros (cian/emerald).
- Tarjetas con profundidad consistente y contraste alto.

### Tipografía
- Mantener `Sora` + `IBM Plex Mono`.
- Escala tipográfica más marcada para encabezados y lectura más rápida.
- Números en tablas/comparativas con alineación visual robusta (tabular-nums).

### Sistema de superficies
- Unificar niveles:
- `surface/base`
- `surface/elevated`
- `surface/interactive`

### Estados e interacción
- Focus visible consistente (`focus-visible`) en toda UI interactiva.
- Hover más informativo en acciones clave.
- Eliminar uso indiscriminado de `transition-all`; limitar animaciones a `transform` y `opacity`.
- Respetar `prefers-reduced-motion`.

---

## 3) Arquitectura de navegación y jerarquía

### Navegación global
- Header fijo con: `Inicio`, `Portfolio`, `Lab`, `Importar`, selector de moneda y CTA principal.
- Subnavegación contextual por ruta para secciones largas.
- Quick actions globales (`Importar CSV`, `Abrir Lab`) cuando aplique.
- Footer utilitario con legal + estado de datos + última actualización.

### Estructura por rutas
- `/` (Inicio ejecutivo): Hero de valor + KPIs + Pulse IA + resumen cartera + CTA doble.
- `/portfolio` (operación): snapshot de cartera + holdings/trades + asignación/rendimiento + bloque accionable.
- `/lab` (investigación): buscador protagonista + técnico IA + comparativas/escenarios.
- `/upload` (onboarding): flujo en 3 pasos (subir, validar, combinar), preview de errores e impacto.

### Copy y CTA
- Renombrar navegación:
- `Panel` -> `Inicio`
- `Lab Tecnico` -> `Lab`
- `Cargar CSV` -> `Importar`
- Mensaje de valor base: "Convierte datos dispersos en decisiones de inversión con contexto IA."
- CTAs cruzadas para conectar rutas y reducir rebote.

---

## 4) Flujo de datos y manejo de estados

- Mantener `usePortfolioData` como fuente central de estado en dashboard/portfolio/upload.
- Sincronizar estado en URL solo donde agrega valor real (tabs/filtros del Lab).
- Estándar para estados UI críticos: `loading`, `empty`, `error` con mensajes accionables.
- Upload reforzado con validaciones previas (columnas, tipos, fechas) + resumen de errores + confirmación antes de combinar.

---

## 5) Hallazgos de guía UI (alto nivel)

Áreas principales detectadas en revisión del frontend:
- Uso extendido de `transition-all` en componentes interactivos.
- Inputs/selects sin etiquetado explícito en algunos flujos.
- Inconsistencia de estilos de foco (`focus` vs `focus-visible`) en ciertos controles.
- Copy con oportunidades de mejorar claridad, consistencia y tono premium.
- Necesidad de robustecer estados vacíos/error en secciones de alto impacto.

---

## 6) Riesgos y mitigaciones

- Saturación visual por exceso de bloques: jerarquía estricta y progressive disclosure.
- Confusión entre rutas de operación/investigación: propósito explícito por pantalla + CTAs cruzadas.
- Riesgo de degradar accesibilidad por estética: contraste AA, foco visible y motion reducido.
- Fricción en importación: validación previa, errores accionables y rollback de sesión.

---

## 7) Criterios de aceptación

- Navegación y jerarquía actualizadas en `/`, `/portfolio`, `/lab`, `/upload`.
- Estilo premium coherente en layout, cards y estados interactivos.
- Focus visible y accesibilidad básica consistente en controles.
- Motion y transiciones optimizadas (sin `transition-all` en acciones críticas).
- Flujos de carga CSV más claros y con feedback útil.

