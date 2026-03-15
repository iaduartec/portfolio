import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, convertToModelMessages } from 'ai';
// import { z } from 'zod';

export const maxDuration = 30;

const GEMINI_MODEL = 'gemini-2.5-flash';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';

const getGeminiModels = () => {
  const keys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY2].filter(Boolean) as string[];
  return keys.map((apiKey) => createGoogleGenerativeAI({ apiKey })(GEMINI_MODEL));
};

const getOpenRouterModels = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return [];
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://portfolio-duartec.vercel.app');
  const openrouter = createOpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    headers: {
      'HTTP-Referer': siteUrl,
      'X-Title': 'MyInvestView',
    },
  });
  return [openrouter(OPENROUTER_MODEL)];
};

const buildErrorResponse = (message: string) =>
  new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });

export async function POST(req: Request) {
  const { messages } = await req.json();
  const models = [...getGeminiModels(), ...getOpenRouterModels()];
  if (models.length === 0) {
    return buildErrorResponse('GEMINI_API_KEY y OPENROUTER_API_KEY faltan en el servidor.');
  }

  let lastError: unknown;
  for (const model of models) {
    try {
      const result = streamText({
        model,
        system: 'You are a helpful assistant. Respond to the user in Markdown format.',
        messages: await convertToModelMessages(messages ?? []),
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
  return buildErrorResponse(`Error en Gemini/OpenRouter: ${detail}`);
}
