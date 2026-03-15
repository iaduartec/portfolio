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

const fetchRelatedNews = async (origin: string, symbol: string, name?: string) => {
  const fallbackQuery = symbol.split(":").pop()?.split(".")[0] ?? symbol;
  const query = name?.trim() || fallbackQuery.trim();
  if (!query) return [] as AuditNewsItem[];

  const response = await fetch(
    `${origin}/api/yahoo?action=news&query=${encodeURIComponent(query)}`,
    { next: { revalidate: 300 } },
  );
  if (!response.ok) return [] as AuditNewsItem[];
  const payload = (await response.json()) as { items?: AuditNewsItem[] };
  return Array.isArray(payload.items) ? payload.items.slice(0, 4) : [];
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
    const newsItems = await fetchRelatedNews(origin, symbol ?? "", name);

    const models = [...getGeminiModels(), ...getOpenRouterModels()];
    if (models.length === 0) {
      return buildErrorResponse("GEMINI_API_KEY y OPENROUTER_API_KEY faltan en el servidor.");
    }

    const symbolLabel = symbol || "el activo";
    const nameLabel = name?.trim() ? `${name} (${symbolLabel})` : symbolLabel;
    const portfolioContextText = formatPositionContext(positionContext);
    const newsContextText = formatNewsForPrompt(newsItems);
    let lastError: unknown;

    for (const model of models) {
      try {
        const { object } = await generateObject({
          model,
          schema: AnalysisSchema,
          maxOutputTokens: 1600,
          prompt: `
Analiza ${nameLabel} con este orden y sin saltarte pasos:
1. Primero haz una lectura geopolítica/macro muy rápida. Usa solo el contexto general del activo y los titulares recientes. No inventes datos.
2. Después valora cómo encaja en la cartera del usuario. Si ya está dentro, compara claramente el precio medio de entrada con el precio actual y el P/L.
3. Resume si las noticias recientes cambian materialmente el sesgo.
4. Solo después da la valoración técnica con patrones, niveles y plan de trading.

Activo: ${nameLabel}

Contexto de cartera del usuario:
${portfolioContextText}

Titulares recientes:
${newsContextText}

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
