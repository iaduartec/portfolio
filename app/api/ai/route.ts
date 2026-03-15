import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, convertToModelMessages } from 'ai';
import { z } from 'zod';

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
  try {
    const { messages, data } = await req.json();
    const portfolio = data?.portfolio;
    const portfolioJson = portfolio ? JSON.stringify(portfolio) : "";
    const baseSystemMessage =
      "Eres un consultor financiero de élite. Responde en Markdown de forma profesional y concisa. " +
      "Utiliza los datos de la cartera proporcionados para dar consejos personalizados. " +
      "Si te piden un valor específico, usa la herramienta showStock.";

    const systemMessage = portfolioJson
      ? `${baseSystemMessage}\n\nDATOS DE LA CARTERA (Sincronizados):\n${portfolioJson}`
      : baseSystemMessage;

    const showStockTool = {
      description: 'Muestra información detallada y gráfica de un activo financiero por su ticker (ej: AAPL, TSLA, BTC-USD)',
      parameters: z.object({
        symbol: z.string().describe('El símbolo del activo (tickers de Yahoo Finance)'),
        name: z.string().optional().describe('Nombre de la empresa'),
        analysis: z.string().optional().describe('Un breve análisis técnico o fundamental hecho por ti')
      }),
      execute: async (args: any) => args
    } as any;

    const suggestTradeTool = {
      description: 'Sugiere una operación basada en análisis técnico o fundamental',
      parameters: z.object({
        symbol: z.string(),
        action: z.enum(['BUY', 'SELL', 'HOLD']),
        reason: z.string(),
        targetPrice: z.number().optional()
      }),
      execute: async (args: any) => args
    } as any;

    const models = [...getGeminiModels(), ...getOpenRouterModels()];
    if (models.length === 0) {
      return buildErrorResponse('GEMINI_API_KEY y OPENROUTER_API_KEY faltan en el servidor.');
    }

    let lastError: unknown;
    for (const model of models) {
      try {
        const result = streamText({
          model,
          system: systemMessage,
          messages: await convertToModelMessages(messages ?? []),
          tools: {
            showStock: showStockTool,
            suggestTrade: suggestTradeTool
          }
        });

        return result.toUIMessageStreamResponse();
      } catch (error) {
        lastError = error;
      }
    }

    const detail = lastError instanceof Error ? lastError.message : 'Error desconocido';
    return buildErrorResponse(`Error en Gemini/OpenRouter: ${detail}`);
  } catch (error) {
    console.error('AI API Error:', error);
    return new Response(JSON.stringify({ error: 'Error processing request', details: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
