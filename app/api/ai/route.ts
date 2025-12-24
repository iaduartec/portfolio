import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, data } = await req.json();
    const portfolio = data?.portfolio;
    const portfolioJson = portfolio ? JSON.stringify(portfolio) : "";
    const baseSystemMessage =
      "Eres un asistente financiero. Responde en Markdown y usa los datos de la cartera cuando esten disponibles.";
    const systemMessage =
      data?.system ??
      (portfolioJson
        ? `${baseSystemMessage}\n\nDatos de la cartera (JSON): ${portfolioJson}`
        : baseSystemMessage);

    const result = streamText({
      model: openai('gpt-4o'),
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
    console.error('AI API Error:', error);
    return new Response(JSON.stringify({ error: 'Error processing request', details: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
