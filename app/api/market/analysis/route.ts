import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

export const runtime = "edge";

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
      return new Response("Invalid candles data", { status: 400 });
    }

    // Limit data to last 100 candles for the AI to focus
    const recentData = candles.slice(-100);

    const { object } = await generateObject({
      model: google("gemini-1.5-pro-latest"),
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
    console.error("AI Analysis Error:", error);
    return new Response("Error during AI analysis", { status: 500 });
  }
}
