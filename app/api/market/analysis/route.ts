import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

export const runtime = "nodejs";

const GEMINI_MODEL = "gemini-2.5-flash";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";

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

const buildErrorResponse = (message: string) =>
  new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });

const AnalysisSchema = z.object({
  patterns: z.array(z.object({
    name: z.string(),
    type: z.enum(["double_top", "double_bottom", "head_shoulders", "resistance", "support", "trendline"]),
    points: z.array(z.object({
      time: z.string().or(z.number()),
      price: z.number()
    })),
    confidence: z.number(),
    description: z.string()
  })),
  summary: z.string().describe("A 4-5 line technical analysis summary."),
  entry: z.string().optional().describe("Suggested entry point."),
  target: z.string().optional().describe("Suggested target/exit point."),
  stopLoss: z.string().optional().describe("Suggested stop-loss point.")
});

export async function POST(req: Request) {
  try {
    const { candles, symbol } = await req.json();

    if (!candles || !Array.isArray(candles)) {
      return new Response(JSON.stringify({ error: "Invalid candles data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Limit data to last 100 candles for the AI to focus
    const recentData = candles.slice(-100);

    const models = [...getGeminiModels(), ...getOpenRouterModels()];
    if (models.length === 0) {
      return buildErrorResponse("GEMINI_API_KEY y OPENROUTER_API_KEY faltan en el servidor.");
    }

    let lastError: unknown;
    for (const model of models) {
      try {
        const { object } = await generateObject({
          model,
          schema: AnalysisSchema,
          prompt: `
        Analyze the following OHLC market data for ${symbol || "the asset"}.
        Identify the most significant technical patterns, support/resistance levels, and trendlines.
        Return only high-confidence patterns that a professional trader would see.
        
        Provide also a concise 4-5 line technical analysis summary in Spanish.
        Include suggested trade levels (entry, target, stop loss) if the current setup warrants it.
        
        Data (last 100 candles):
        ${JSON.stringify(recentData.map((c: any) => ({ t: c.time, o: c.open, h: c.high, l: c.low, c: c.close })))}

        For each pattern, provide the exact time and price coordinates for its key points (e.g., for a Double Top, provide the two peaks and the valley between them).
        Return everything in Spanish.
      `,
        });

        return Response.json(object);
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
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
