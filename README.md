# 📉 MyInvestView

**MyInvestView** es una plataforma avanzada de análisis de inversiones que combina la potencia de **Next.js**, la visualización técnica de **TradingView** y la inteligencia artificial de **Google Gemini** para transformar tus datos de inversión en decisiones estratégicas.

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

Crea un archivo `.env.local` con tus claves:

```env
GOOGLE_GEMINI_API_KEY=tu_clave_aqui
```

### 4. Lanzar en Desarrollo

```bash
pnpm dev
```

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
