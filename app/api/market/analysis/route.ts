import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

export const runtime = "nodejs";

const GEMINI_MODEL = "gemini-2.5-flash";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";

const CandleInputSchema = z.object({
  time: z.string().or(z.number()),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
});

const PositionContextSchema = z.object({
  inPortfolio: z.boolean(),
  account: z.string().optional(),
  quantity: z.number().optional(),
  averageEntryPrice: z.number().optional(),
  currentPrice: z.number().optional(),
  pnlPercent: z.number().optional(),
  pnlValue: z.number().optional(),
  currency: z.string().optional(),
});

const RequestSchema = z.object({
  candles: z.array(CandleInputSchema),
  symbol: z.string().optional(),
  name: z.string().optional(),
  positionContext: PositionContextSchema.optional(),
});

const AnalysisSchema = z.object({
  patterns: z.array(
    z.object({
      name: z.string(),
      type: z.enum(["double_top", "double_bottom", "head_shoulders", "resistance", "support", "trendline"]),
      points: z.array(
        z.object({
          time: z.string().or(z.number()),
          price: z.number(),
        }),
      ),
      confidence: z.number(),
      description: z.string(),
    }),
  ),
  macroContext: z
    .string()
    .describe("Lectura geopolítica/macro muy breve en español antes de la valoración técnica."),
  portfolioContext: z
    .string()
    .describe("Cómo afecta al usuario según si ya la tiene en cartera, su precio medio y su P/L."),
  newsImpact: z
    .string()
    .describe("Resumen breve del impacto de las noticias recientes sobre el activo."),
  summary: z.string().describe("Resumen técnico final de 4-5 líneas en español."),
  entry: z.string().optional().describe("Punto de entrada sugerido."),
  target: z.string().optional().describe("Objetivo o salida sugerida."),
  stopLoss: z.string().optional().describe("Nivel de stop-loss sugerido."),
});

type AuditNewsItem = {
  title: string;
  publisher: string;
  link: string;
  publishedAt?: string;
  summary?: string;
  relatedTickers?: string[];
  scope?: "asset" | "macro";
};

type AssetProfile = {
  sector?: string;
  industry?: string;
  country?: string;
};

type MacroSensitivity = {
  key: "autos" | "industrials" | "airlines" | "chemicals" | "defense" | "oil_gas";
  queries: string[];
  explanation: string;
};

const getGeminiModels = () => {
  const keys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY2].filter(Boolean) as string[];
  return keys.map((apiKey) => createGoogleGenerativeAI({ apiKey })(GEMINI_MODEL));
};

const getOpenRouterModels = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return [];
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://portfolio-duartec.vercel.app");
  const openrouter = createOpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    headers: {
      "HTTP-Referer": siteUrl,
      "X-Title": "MyInvestView",
    },
  });
  return [openrouter(OPENROUTER_MODEL)];
};

const buildErrorResponse = (message: string, status = 500) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const fetchNewsByQuery = async (origin: string, query: string, scope: AuditNewsItem["scope"]) => {
  if (!query.trim()) return [] as AuditNewsItem[];

  const response = await fetch(
    `${origin}/api/yahoo?action=news&query=${encodeURIComponent(query)}`,
    { next: { revalidate: 300 } },
  );
  if (!response.ok) return [] as AuditNewsItem[];
  const payload = (await response.json()) as { items?: AuditNewsItem[] };
  return Array.isArray(payload.items)
    ? payload.items.slice(0, 4).map((item) => ({ ...item, scope }))
    : [];
};

const fetchAssetProfile = async (origin: string, symbol?: string) => {
  if (!symbol?.trim()) return null;
  const response = await fetch(
    `${origin}/api/yahoo?action=snapshot&symbol=${encodeURIComponent(symbol)}`,
    { next: { revalidate: 900 } },
  );
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    data?: {
      profile?: AssetProfile | null;
    };
  };
  return payload.data?.profile ?? null;
};

const buildExposureText = (name?: string, profile?: AssetProfile | null) =>
  `${name ?? ""} ${profile?.sector ?? ""} ${profile?.industry ?? ""}`.toLowerCase();

const inferMacroSensitivities = (symbol: string, name?: string, profile?: AssetProfile | null) => {
  const exposureText = buildExposureText(name, profile);
  const sensitivities: MacroSensitivity[] = [];
  const isEurope = isEuropeanExposure(symbol, profile);

  if (/auto|automotive|vehicle|car|auto parts|autoparts/.test(exposureText)) {
    sensitivities.push({
      key: "autos",
      queries: [
        "Strait of Hormuz automotive supply chain Europe",
        "Iran war oil Europe automotive",
        "oil spike Europe auto suppliers margins",
      ],
      explanation:
        "Automoción: sensible a petróleo, energía, logística y coste de componentes. Ormuz y una subida del crudo son bajistas para márgenes europeos.",
    });
  }

  if (/industrial|machinery|manufacturing|capital goods|metal|components|supplier/.test(exposureText)) {
    sensitivities.push({
      key: "industrials",
      queries: [
        "Strait of Hormuz Europe industrials shipping costs",
        "Iran war Europe manufacturing energy costs",
      ],
      explanation:
        "Industriales: sensibles a energía, transporte marítimo y presión sobre costes. Un estrechamiento de Ormuz endurece márgenes y demanda.",
    });
  }

  if (/airline|airlines|aviation|travel/.test(exposureText)) {
    sensitivities.push({
      key: "airlines",
      queries: [
        "Strait of Hormuz airlines jet fuel prices",
        "Iran war air travel fuel costs Europe",
      ],
      explanation:
        "Aerolíneas: el combustible y el riesgo geopolítico suelen ser el principal driver. Ormuz más estrecho implica queroseno más caro y mayor presión en márgenes.",
    });
  }

  if (/chemical|chemicals|materials|fertilizer|plastics/.test(exposureText)) {
    sensitivities.push({
      key: "chemicals",
      queries: [
        "Strait of Hormuz chemicals Europe feedstock costs",
        "Iran war oil gas chemicals margins Europe",
      ],
      explanation:
        "Químicas/materiales: muy sensibles a feedstocks energéticos y gas. Un shock en Ormuz suele ser bajista si no pueden repercutir precios.",
    });
  }

  if (/defense|defence|aerospace/.test(exposureText)) {
    sensitivities.push({
      key: "defense",
      queries: [
        "Middle East conflict defense stocks Europe",
        "Iran war defense spending Europe",
      ],
      explanation:
        "Defensa: el sesgo puede ser alcista por mayor gasto y demanda, así que la guerra no se interpreta igual que en autos o industriales.",
    });
  }

  if (/oil|gas|energy|exploration|midstream|upstream|integrated/.test(exposureText)) {
    sensitivities.push({
      key: "oil_gas",
      queries: [
        "Strait of Hormuz oil gas producers prices",
        "Iran war crude spike integrated oil Europe",
      ],
      explanation:
        "Oil & gas: el shock geopolítico puede ser alcista por precio del crudo y del gas, salvo riesgo operativo directo.",
    });
  }

  if (isEurope && sensitivities.length === 0) {
    sensitivities.push({
      key: "industrials",
      queries: [
        "Iran war Europe oil gas inflation",
        "Strait of Hormuz Europe shipping disruption",
      ],
      explanation:
        "Europa: incluso sin sector claro, Ormuz y el crudo afectan más a Europa por energía importada, inflación y transporte.",
    });
  }

  return sensitivities;
};

const isEuropeanExposure = (symbol?: string, profile?: AssetProfile | null) => {
  const normalizedSymbol = (symbol ?? "").toUpperCase();
  const country = (profile?.country ?? "").toLowerCase();
  return (
    ["BME:", "XETR:", "MIL:", "PAR:", "AMS:", "LSE:"].some((prefix) => normalizedSymbol.startsWith(prefix)) ||
    /spain|germany|france|italy|netherlands|united kingdom|europe/.test(country)
  );
};

const dedupeNewsItems = (items: AuditNewsItem[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.title}|${item.publisher}|${item.scope ?? ""}`.toLowerCase();
    if (!item.title || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const buildMacroQueries = (symbol: string, name?: string, profile?: AssetProfile | null) => {
  const fallbackQuery = symbol.split(":").pop()?.split(".")[0] ?? symbol;
  const queries = new Set<string>();
  const sensitivities = inferMacroSensitivities(symbol, name, profile);

  for (const sensitivity of sensitivities) {
    for (const query of sensitivity.queries) {
      queries.add(query);
    }
  }

  if (fallbackQuery.trim()) {
    queries.add(fallbackQuery.trim());
  }

  return Array.from(queries).slice(0, 3);
};

const formatMacroSensitivityContext = (sensitivities: MacroSensitivity[]) => {
  if (sensitivities.length === 0) {
    return "No se detectó una sensibilidad sectorial macro especial aparte del contexto general de mercado.";
  }

  return sensitivities.map((item) => `- ${item.explanation}`).join("\n");
};

const formatPositionContext = (positionContext?: z.infer<typeof PositionContextSchema>) => {
  if (!positionContext?.inPortfolio) {
    return "El usuario no tiene actualmente este valor en cartera.";
  }

  const parts = [
    `El usuario ya tiene esta posición en cartera${positionContext.account ? ` (${positionContext.account})` : ""}.`,
  ];

  if (positionContext.quantity !== undefined) {
    parts.push(`Cantidad abierta: ${positionContext.quantity}.`);
  }
  if (positionContext.averageEntryPrice !== undefined) {
    parts.push(
      `Precio medio de entrada: ${positionContext.averageEntryPrice.toFixed(2)} ${positionContext.currency ?? ""}`.trim(),
    );
  }
  if (positionContext.currentPrice !== undefined) {
    parts.push(`Precio actual aprox.: ${positionContext.currentPrice.toFixed(2)} ${positionContext.currency ?? ""}`.trim());
  }
  if (positionContext.pnlPercent !== undefined) {
    parts.push(`Rentabilidad actual: ${positionContext.pnlPercent.toFixed(2)}%.`);
  }
  if (positionContext.pnlValue !== undefined) {
    parts.push(`P/L actual: ${positionContext.pnlValue.toFixed(2)} ${positionContext.currency ?? ""}`.trim());
  }

  return parts.join(" ");
};

const formatNewsForPrompt = (newsItems: AuditNewsItem[]) => {
  if (newsItems.length === 0) {
    return "No se encontraron titulares recientes en la fuente consultada.";
  }

  return newsItems
    .map((item) => {
      const dateLabel = item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : "sin fecha";
      return `- ${dateLabel} | ${item.publisher || "Fuente desconocida"} | ${item.title}`;
    })
    .join("\n");
};

export async function POST(req: Request) {
  try {
    const parsed = RequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return buildErrorResponse("Invalid analysis payload", 400);
    }

    const { candles, symbol, name, positionContext } = parsed.data;
    if (candles.length === 0) {
      return buildErrorResponse("Invalid candles data", 400);
    }

    const recentData = candles.slice(-100);
    const origin = new URL(req.url).origin;
    const profile = await fetchAssetProfile(origin, symbol);
    const sensitivities = inferMacroSensitivities(symbol ?? "", name, profile);
    const symbolQuery = name?.trim() || symbol?.split(":").pop()?.split(".")[0] || "";
    const assetNews = symbolQuery ? await fetchNewsByQuery(origin, symbolQuery, "asset") : [];
    const macroQueries = buildMacroQueries(symbol ?? "", name, profile);
    const macroNewsGroups = await Promise.all(
      macroQueries.map((query) => fetchNewsByQuery(origin, query, query === symbolQuery ? "asset" : "macro")),
    );
    const newsItems = dedupeNewsItems([...assetNews, ...macroNewsGroups.flat()]).slice(0, 6);

    const models = [...getGeminiModels(), ...getOpenRouterModels()];
    if (models.length === 0) {
      return buildErrorResponse("GEMINI_API_KEY y OPENROUTER_API_KEY faltan en el servidor.");
    }

    const symbolLabel = symbol || "el activo";
    const nameLabel = name?.trim() ? `${name} (${symbolLabel})` : symbolLabel;
    const portfolioContextText = formatPositionContext(positionContext);
    const assetNewsText = formatNewsForPrompt(newsItems.filter((item) => item.scope !== "macro"));
    const macroNewsText = formatNewsForPrompt(newsItems.filter((item) => item.scope === "macro"));
    const macroSensitivityText = formatMacroSensitivityContext(sensitivities);
    let lastError: unknown;

    for (const model of models) {
      try {
        const { object } = await generateObject({
          model,
          schema: AnalysisSchema,
          maxOutputTokens: 1600,
          prompt: `
Analiza ${nameLabel} con este orden y sin saltarte pasos:
1. Primero haz una lectura geopolítica/macro muy rápida. Usa el perfil del activo y los titulares macro recientes. No inventes datos.
2. Después valora cómo encaja en la cartera del usuario. Si ya está dentro, compara claramente el precio medio de entrada con el precio actual y el P/L.
3. Resume si las noticias recientes del activo y las macro cambian materialmente el sesgo.
4. Solo después da la valoración técnica con patrones, niveles y plan de trading.

Activo: ${nameLabel}
Perfil del activo:
- Sector: ${profile?.sector ?? "N/D"}
- Industria: ${profile?.industry ?? "N/D"}
- País: ${profile?.country ?? "N/D"}

Sensibilidad macro sectorial esperada:
${macroSensitivityText}

Contexto de cartera del usuario:
${portfolioContextText}

Titulares recientes del activo:
${assetNewsText}

Titulares macro/geopolíticos relevantes:
${macroNewsText}

Datos OHLC recientes (últimas 100 velas):
${JSON.stringify(recentData.map((candle) => ({
  t: candle.time,
  o: candle.open,
  h: candle.high,
  l: candle.low,
  c: candle.close,
})))}

Reglas:
- Devuelve todo en español.
- Sé concreto y breve.
- No uses TWR, IRR ni métricas que no se han pedido.
- Si hay un driver macro activo como guerra, petróleo, gas, tarifas o disrupción logística y afecta al sector/país del activo, priorízalo sobre boilerplate genérico.
- Si el activo es automoción, industriales, aerolíneas o químicas europeas, considera el estrechamiento/cierre de Ormuz y el shock del crudo como driver bajista principal salvo evidencia en contra.
- Si el activo es defensa u oil & gas, revisa si el mismo evento cambia a sesgo neutral/alcista.
- No digas "no hay noticias relevantes" si sí hay titulares macro relevantes para el sector.
- Si faltan noticias claras, dilo explícitamente y apóyate en el gráfico.
- Para cada patrón, devuelve coordenadas reales de tiempo y precio.
`,
        });

        return Response.json({
          ...object,
          news: newsItems,
        });
      } catch (error) {
        lastError = error;
      }
    }

    const detail = lastError instanceof Error ? lastError.message : "Error desconocido";
    return buildErrorResponse(`Error en Gemini/OpenRouter: ${detail}`);
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return new Response(
      JSON.stringify({
        error: "Error during AI analysis",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
