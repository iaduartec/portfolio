# 📉 MyInvestView

**MyInvestView** es una plataforma avanzada de análisis de inversiones que combina la potencia de **Next.js**, la visualización técnica de **TradingView** y la inteligencia artificial para transformar tus datos de inversión en decisiones estratégicas.

---

## ✨ Características Principales

### 📊 Análisis de Cartera de Alto Nivel

- **Reconstrucción Automática:** Calcula tu posición actual, precio medio y beneficios (P&L) latentes a partir de un simple archivo CSV de transacciones.
- **Visualización Pro-Terminal:** Gráficos dinámicos e indicadores financieros clave con una estética de terminal profesional.
- **Skeleton Loading:** Experiencia de usuario fluida sin saltos de diseño (layout shifts) durante la carga de datos.

### 🤖 Inteligencia Artificial Aplicada

- **Insights con Gemini:** Análisis narrativo de tu cartera detectando concentración de riesgo, diversificación y sectores clave.
- **Proyecciones Inteligentes:** Generación de escenarios basados en el comportamiento de tus activos.

### 🔍 Herramientas Técnicas

- **Integración con TradingView:** Visualización de tickers en tiempo real y análisis técnico integrado.
- **SEO Optimizado:** Metadatos avanzados y estructura semántica para máxima visibilidad.

---

## 🧱 Stack Tecnológico

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS (Estética Dark/Premium)
- **Visualización:** TradingView Widgets & Recharts
- **IA:** Google Gemini API
- **Despliegue:** Vercel

---

## 🚀 Instalación y Configuración

### 1. Requisitos Previos

Asegúrate de tener instalado [Node.js](https://nodejs.org/) y [pnpm](https://pnpm.io/).

### 2. Clonar y Configurar

```bash
git clone https://github.com/iaduartec/portfolio.git
cd portfolio
pnpm install
```

### 3. Variables de Entorno

> Recomendado: define `NEXT_PUBLIC_SITE_URL` para que el SEO (canonical/OG/sitemap/robots) sea correcto en producción.

Crea un archivo `.env.local` con tus claves:

```env
GOOGLE_GEMINI_API_KEY=tu_clave_aqui
NEXT_PUBLIC_EXCHANGERATE_HOST_KEY=tu_clave_exchangerate_host_opcional
```

### 4. Lanzar en Desarrollo

```bash
pnpm dev
```

### 5. Backtest de calibración swing

```bash
pnpm backtest:calibration
```

El comando genera:
- `docs/plans/2026-02-28-swing-confidence-calibration-metrics.md`
- `docs/plans/2026-02-28-swing-confidence-calibration-metrics.json`

Modos de visualización de confianza (`Pattern Lab` / `Portfolio Charts`):
- `NEXT_PUBLIC_SIGNAL_CALIBRATION_MODE=full` (default)
- `NEXT_PUBLIC_SIGNAL_CALIBRATION_MODE=dual`
- `NEXT_PUBLIC_SIGNAL_CALIBRATION_MODE=shadow`

Telemetry opcional de calibración:
- `NEXT_PUBLIC_SIGNAL_CALIBRATION_TELEMETRY=1` o `SIGNAL_CALIBRATION_TELEMETRY=1`

---

## 📁 Estructura del Proyecto

```text
src/
├── app/              # Rutas y páginas (Next.js App Router)
├── components/       # Componentes de UI, Dashboard y Cartera
├── hooks/            # Lógica de datos y sincronización de cartera
├── lib/              # Utilidades de cálculo y formateo
└── types/            # Definiciones de tipos para transacciones y holdings
```

---

## ⚖️ Aviso Legal

Esta herramienta tiene fines exclusivamente **educativos e informativos**. El análisis generado por la IA no constituye asesoramiento financiero profesional. La inversión en mercados financieros conlleva riesgos.

---

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Siéntete libre de abrir un _Issue_ o enviar un _Pull Request_ para mejorar las visualizaciones o los modelos de análisis.

---

**Desarrollado con ❤️ para inversores modernos.**
