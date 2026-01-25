import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, convertToModelMessages } from 'ai';
// import { z } from 'zod';

export const maxDuration = 30;

const GEMINI_MODEL = 'gemini-1.5-flash-latest';

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
  const { messages } = await req.json();
  const models = getGeminiModels();
  if (models.length === 0) {
    return buildErrorResponse('GEMINI_API_KEY falta en el servidor.');
  }

  let lastError: unknown;
  for (const model of models) {
    try {
      const result = streamText({
        model,
        system: 'You are a helpful assistant. Respond to the user in Markdown format.',
        messages: convertToModelMessages(messages ?? []),
        // tools: {
        //   showStock: tool({
        //     description: 'Show stock price and information for a given symbol',
        //     parameters: z.object({
        //       symbol: z.string().describe('The stock symbol to show (e.g. AAPL)'),
        //       name: z.string().optional().describe('The name of the company'),
        //       price: z.number().describe('The current price'),
        //       change: z.number().describe('The price change'),
        //       changePercent: z.number().describe('The percentage change'),
        //     }),
        //     // @ts-expect-error AI SDK type mismatch for execute
        //     execute: async ({ symbol, price, change, changePercent, name }: { symbol: string, price: number, change: number, changePercent: number, name?: string }) => {
        //         // In a real app, we might fetch real data here if the LLM didn't provide it provided accurate simulated data
        //         // For now, we trust the LLM to hallucinate realistic data or strictly follow prompts
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
}
