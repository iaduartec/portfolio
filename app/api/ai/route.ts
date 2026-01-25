import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, convertToModelMessages } from 'ai';

export const maxDuration = 30;

const GEMINI_MODEL = 'gemini-2.5-flash';

const getGeminiModels = () => {
  const keys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY2].filter(Boolean) as string[];
  return keys.map((apiKey) => createGoogleGenerativeAI({ apiKey })(GEMINI_MODEL));
};

const buildErrorResponse = (message: string) =>
  new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });

export async function POST(req: Request) {
  try {
    const { messages, data } = await req.json();
    const portfolio = data?.portfolio;
    const portfolioJson = portfolio ? JSON.stringify(portfolio) : "";
    const baseSystemMessage =
      "Eres un asistente financiero. Responde en Markdown y utiliza los datos de la cartera cuando esten disponibles.";
    const systemMessage = portfolioJson
      ? `${baseSystemMessage}\n\nDatos de la cartera (JSON): ${portfolioJson}\n\nUsa holdings/positions, summary y realizedTrades para responder sobre la cartera.`
      : baseSystemMessage;

    const models = getGeminiModels();
    if (models.length === 0) {
      return buildErrorResponse('GEMINI_API_KEY falta en el servidor.');
    }

    let lastError: unknown;
    for (const model of models) {
      try {
        const result = streamText({
          model,
          system: systemMessage,
          messages: convertToModelMessages(messages ?? []),
          // tools: {
          //   showStock: tool({
          //     description: 'Show stock price and information for a given symbol',
          //     parameters: z.object({
          //         symbol: z.string(),
          //         name: z.string().optional(),
          //         price: z.number(),
          //         change: z.number(),
          //         changePercent: z.number(),
          //     }),
          //     execute: async ({ symbol, price, change, changePercent, name }: { symbol: string, price: number, change: number, changePercent: number, name?: string }) => {
          //         return { symbol, price, change, changePercent, name };
          //     }
          //   })
          // }
        });
      
        return result.toUIMessageStreamResponse();
      } catch (error) {
        lastError = error;
      }
    }

    const detail = lastError instanceof Error ? lastError.message : 'Error desconocido';
    return buildErrorResponse(`Error en Gemini: ${detail}`);
  } catch (error) {
    console.error('AI API Error:', error);
    return new Response(JSON.stringify({ error: 'Error processing request', details: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
