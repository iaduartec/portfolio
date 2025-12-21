type Agent = {
  id: string;
  name: string;
  summary: string;
  category: string;
  purpose: string;
  samplePrompt: string;
};

export const agents: Agent[] = [
  {
    id: "research",
    name: "Research rápido",
    summary: "Genera ideas y responde dudas de mercado en texto breve.",
    category: "LLM",
    purpose: "Q&A general, research corto, bullets accionables.",
    samplePrompt: "Dame 3 ideas rápidas para evaluar el sector semiconductores esta semana.",
  },
  {
    id: "ideas",
    name: "Ideas de estrategia",
    summary: "Pide reglas de entrada/salida y checklist de validación.",
    category: "LLM",
    purpose: "Plantillas rápidas de estrategia con bullets claros.",
    samplePrompt:
      "Propón una estrategia swing en AAPL con reglas de entrada, salida, gestión de riesgo y checklist en 5 bullets.",
  },
  {
    id: "resumen",
    name: "Resumen diario",
    summary: "Titulares clave y posible impacto en índices.",
    category: "LLM",
    purpose: "Sintetizar noticias y su efecto en el mercado.",
    samplePrompt: "Dame 4 titulares clave de hoy y cómo podrían impactar SPX y NDX en la sesión.",
  },
  {
    id: "cartera",
    name: "Análisis de cartera",
    summary: "Analiza tus posiciones abiertas con IA (OpenAI).",
    category: "LLM",
    purpose: "Pedir insight rápido sobre tickers abiertos, riesgo y sesgos.",
    samplePrompt:
      "Analiza estas posiciones abiertas (símbolo, precio medio, precio actual, P&L %) y dame 3 riesgos y 3 acciones concretas.",
  },
];
