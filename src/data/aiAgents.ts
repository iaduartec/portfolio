type Agent = {
  id: string;
  name: string;
  summary: string;
  category: string;
  purpose: string;
  command: string;
  requirements: string[];
  notes: string[];
};

export const agents: Agent[] = [
  {
    id: "trading",
    name: "Trading Agent",
    summary: "LLM que toma decisiones de trading en modo simple o swarm.",
    category: "Ejecución",
    purpose:
      "Evaluar señales y decidir buy/sell/hold con modelos configurables (Claude/OpenAI/Ollama) y opción swarm.",
    command: "python src/agents/trading_agent.py",
    requirements: [
      "Configura API keys en .env (Claude/OpenAI/Ollama según tu setup)",
      "Revisa config.py para AI_MODEL_TYPE/NAME",
      "Datos/estrategias según tu pipeline",
    ],
    notes: ["Swarm puede tardar ~45-60s por token.", "Úsalo tras backtesting adecuado."],
  },
  {
    id: "risk",
    name: "Risk Agent",
    summary: "Gestor de riesgo para posiciones y exposición.",
    category: "Riesgo",
    purpose: "Analizar exposición, stop-loss y tamaño de posición en tus estrategias.",
    command: "python src/agents/risk_agent.py",
    requirements: ["API keys en .env", "Entradas de posiciones/estrategia definidas"],
    notes: ["Pensado para validar riesgo antes de ejecutar órdenes."],
  },
  {
    id: "strategy",
    name: "Strategy Agent",
    summary: "Genera/valida estrategias y automatiza backtests.",
    category: "Research",
    purpose:
      "Tomar ideas de texto/recursos y convertirlas en estrategias con backtesting automatizado.",
    command: "python src/agents/strategy_agent.py",
    requirements: ["API keys en .env", "Fuentes de datos/backtest configuradas"],
    notes: ["Adecuado para ideación; valida resultados manualmente."],
  },
  {
    id: "copybot",
    name: "CopyBot Agent",
    summary: "Replica señales/estrategias desde fuentes externas.",
    category: "Copy trading",
    purpose: "Escuchar fuentes de señales y replicar lógicas en tu entorno de ejecución.",
    command: "python src/agents/copybot_agent.py",
    requirements: ["API keys en .env", "Fuentes de señal configuradas"],
    notes: ["Asegura manejo de riesgo antes de replicar cualquier señal."],
  },
  {
    id: "sentiment",
    name: "Sentiment Agent",
    summary: "Analiza sentimiento y genera señales contextuales.",
    category: "Sentimiento",
    purpose: "Procesar news/feeds para extraer sesgos de mercado.",
    command: "python src/agents/sentiment_agent.py",
    requirements: ["API keys en .env", "Fuente de noticias/feeds configuradas"],
    notes: ["Úsalo como input, no como señal final de trading."],
  },
  {
    id: "rbi",
    name: "RBI Agent",
    summary: "Research + backtest automático a partir de videos/texto.",
    category: "Research/Backtest",
    purpose: "Recolectar ideas (YouTube/PDF/texto) y generar backtests automáticamente.",
    command: "python src/agents/rbi_agent.py",
    requirements: ["API keys en .env", "Dependencias de scraping/data sources activas"],
    notes: ["Revisa docs de RBI para paralelismo y fuentes de datos."],
  },
];
