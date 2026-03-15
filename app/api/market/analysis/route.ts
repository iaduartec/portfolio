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
    .describe("Lectura geopolítica/macro muy breve en español basada solo en noticias recientes verificables."),
  portfolioContext: z
    .string()
    .describe("Cómo afecta al usuario según si ya la tiene en cartera, su precio medio y su P/L."),
  newsImpact: z
    .string()
    .describe("Resumen breve del impacto de titulares recientes verificables sobre el activo, con anclaje a fecha o fuente cuando exista."),
  summary: z.string().describe("Resumen técnico final de 4-5 líneas en español."),
  entry: z.string().optional().describe("Punto de entrada sugerido."),
  target: z.string().optional().describe("Objetivo o salida sugerida."),
  stopLoss: z.string().optional().describe("Nivel de stop-loss sugerido."),
});

const ResearchFocusSchema = z.object({
  summary: z.string().describe("Resumen de 1-2 líneas sobre qué hay que mirar antes de valorar el activo."),
  assetQueries: z.array(z.string()).max(4).describe("Búsquedas de noticias directas sobre el activo o la empresa."),
  macroQueries: z.array(z.string()).max(4).describe("Búsquedas macro/geopolíticas relevantes para el sector/país."),
  riskFactors: z.array(z.string()).max(5).describe("Factores de riesgo a vigilar para el activo."),
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

const fetchWorldIndicesNews = async (origin: string) => {
  const response = await fetch(
    `${origin}/api/yahoo?action=world-indices-news`,
    { next: { revalidate: 300 } },
  );
  if (!response.ok) return [] as AuditNewsItem[];
  const payload = (await response.json()) as { items?: AuditNewsItem[] };
  return Array.isArray(payload.items)
    ? payload.items.slice(0, 4).map((item) => ({ ...item, scope: "macro" as const }))
    : [];
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

const normalizeQuery = (value: string) => value.trim().replace(/\s+/g, " ");

const dedupeQueries = (queries: string[]) => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const query of queries.map(normalizeQuery)) {
    if (!query) continue;
    const key = query.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(query);
  }

  return normalized;
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
    const symbolQuery = name?.trim() || symbol?.split(":").pop()?.split(".")[0] || "";

    const models = [...getGeminiModels(), ...getOpenRouterModels()];
    if (models.length === 0) {
      return buildErrorResponse("GEMINI_API_KEY y OPENROUTER_API_KEY faltan en el servidor.");
    }

    const symbolLabel = symbol || "el activo";
    const nameLabel = name?.trim() ? `${name} (${symbolLabel})` : symbolLabel;
    const portfolioContextText = formatPositionContext(positionContext);
    let lastError: unknown;

    for (const model of models) {
      try {
        const { object: researchFocus } = await generateObject({
          model,
          schema: ResearchFocusSchema,
          maxOutputTokens: 400,
          prompt: `
Antes de valorar ${nameLabel}, decide qué información externa merece buscar.

Activo: ${nameLabel}
Sector: ${profile?.sector ?? "N/D"}
Industria: ${profile?.industry ?? "N/D"}
País: ${profile?.country ?? "N/D"}

 Contexto de cartera:
 ${portfolioContextText}

Devuelve:
- búsquedas directas del activo/empresa
- búsquedas macro relevantes para su sector o país
- factores de riesgo concretos

Reglas:
- Nada de boilerplate.
- Si el activo es sensible a energía, logística, petróleo o tipos, refléjalo.
- Usa búsquedas cortas y prácticas.
- Devuelve todo en español salvo los términos de búsqueda, que pueden ir en inglés si mejoran resultados.
`,
        });

        const heuristicMacroQueries = buildMacroQueries(symbol ?? "", name, profile);
        const assetQueries = dedupeQueries([symbolQuery, ...(researchFocus.assetQueries ?? [])]).slice(0, 4);
        const macroQueries = dedupeQueries([
          ...heuristicMacroQueries,
          ...(researchFocus.macroQueries ?? []),
        ]).slice(0, 5);

        const assetNewsGroups = await Promise.all(
          assetQueries.map((query) => fetchNewsByQuery(origin, query, "asset")),
        );
        const macroNewsGroups = await Promise.all(
          macroQueries.map((query) => fetchNewsByQuery(origin, query, "macro")),
        );
        const worldIndicesNews = await fetchWorldIndicesNews(origin);
        const newsItems = dedupeNewsItems([
          ...assetNewsGroups.flat(),
          ...macroNewsGroups.flat(),
          ...worldIndicesNews,
        ]).slice(0, 10);
        const assetNewsText = formatNewsForPrompt(newsItems.filter((item) => item.scope !== "macro"));
        const macroNewsText = formatNewsForPrompt(newsItems.filter((item) => item.scope === "macro"));
        const { object } = await generateObject({
          model,
          schema: AnalysisSchema,
          maxOutputTokens: 1600,
          prompt: `
Analiza ${nameLabel} con este orden y sin saltarte pasos:
1. Primero haz una lectura geopolítica/macro muy rápida. Usa solo titulares recientes del activo, de su sector o macro globales. No inventes datos.
2. Después valora cómo encaja en la cartera del usuario. Si ya está dentro, compara claramente el precio medio de entrada con el precio actual y el P/L.
3. Resume si las noticias recientes del activo y las macro cambian materialmente el sesgo.
4. Solo después da la valoración técnica con patrones, niveles y plan de trading.

Activo: ${nameLabel}
Perfil del activo:
- Sector: ${profile?.sector ?? "N/D"}
- Industria: ${profile?.industry ?? "N/D"}
- País: ${profile?.country ?? "N/D"}

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
 - macroContext debe salir solo de titulares recientes incluidos arriba.
 - No uses la sensibilidad sectorial esperada, factores de riesgo, hipótesis de búsqueda ni conocimiento general como si fueran hechos actuales.
 - No enumeres riesgos latentes, estructurales o inherentes si no están respaldados por titulares recientes.
 - Si hay un driver macro activo como guerra, petróleo, gas, tarifas o disrupción logística y aparece en los titulares, priorízalo sobre boilerplate genérico.
 - Si no hay noticias recientes suficientemente claras para el sector o macro global, di explícitamente que no hay un driver macro reciente confirmado y no rellenes con especulación.
 - newsImpact debe resumir únicamente el impacto de los titulares aportados arriba.
 - newsImpact no puede usar conocimiento general, hipótesis, sensibilidad sectorial ni riesgos estructurales si no aparecen en los titulares listados.
 - Si hay noticias, newsImpact debe mencionar al menos una fecha, medio o hecho concreto de esos titulares.
 - Si no hay noticias claras del activo ni del sector con impacto material, newsImpact debe decirlo de forma explícita y breve.
 - No escribas frases vagas como "persiste la incertidumbre", "se mantiene como riesgo latente" o equivalentes salvo que un titular lo justifique.
 - portfolioContext debe centrarse solo en la posición del usuario, no en noticias.
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
