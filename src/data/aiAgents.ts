type Agent = {
  id: string;
  name: string;
  summary: string;
  category: string;
  purpose: string;
  samplePrompt: string;
  requirements: string[];
  command: string;
  notes: string[];
};

export const agents: Agent[] = [
  {
    id: "research",
    name: "Research rápido",
    summary: "Genera ideas y responde dudas de mercado en texto breve.",
    category: "LLM",
    purpose: "Q&A general, research corto, bullets accionables.",
    samplePrompt: "Dame 3 ideas rápidas para evaluar el sector semiconductores esta semana.",
    requirements: ["API key configurada", "Acceso a internet para la LLM"],
    command: "pnpm ai-agent run research --prompt \"...\"",
    notes: ["Orientado a respuestas rápidas", "No valida datos en tiempo real"],
  },
  {
    id: "ideas",
    name: "Ideas de estrategia",
    summary: "Pide reglas de entrada/salida y checklist de validación.",
    category: "LLM",
    purpose: "Plantillas rápidas de estrategia con bullets claros.",
    samplePrompt:
      "Propón una estrategia swing en AAPL con reglas de entrada, salida, gestión de riesgo y checklist en 5 bullets.",
    requirements: ["API key configurada", "Define ticker y timeframe"],
    command: "pnpm ai-agent run ideas --prompt \"...\"",
    notes: ["No ejecuta backtests", "Usar como punto de partida, no como señal"],
  },
  {
    id: "resumen",
    name: "Resumen diario",
    summary: "Titulares clave y posible impacto en índices.",
    category: "LLM",
    purpose: "Sintetizar noticias y su efecto en el mercado.",
    samplePrompt: "Dame 4 titulares clave de hoy y cómo podrían impactar SPX y NDX en la sesión.",
    requirements: ["API key configurada", "Contexto temporal (fecha/hora)"],
    command: "pnpm ai-agent run resumen --prompt \"...\"",
    notes: ["Verifica titulares críticos antes de operar"],
  },
  {
    id: "cartera",
    name: "Análisis de cartera",
    summary: "Analiza tus posiciones abiertas con IA (Gemini).",
    category: "LLM",
    purpose: "Pedir insight rápido sobre tickers abiertos, riesgo y sesgos.",
    samplePrompt:
      "Analiza estas posiciones abiertas (símbolo, precio medio, precio actual, P&L %) y dame 3 riesgos y 3 acciones concretas.",
    requirements: ["API key de Gemini", "Datos de cartera actualizados"],
    command: "pnpm ai-agent run cartera --prompt \"...\"",
    notes: ["No es recomendación financiera", "Revisa los datos antes de enviar"],
  },
];
