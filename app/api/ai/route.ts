import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = streamText({
      model: openai('gpt-4o'),
      system: 'You are a helpful assistant. Respond to the user in Markdown format.',
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
