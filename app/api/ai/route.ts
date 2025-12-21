import { openai } from '@ai-sdk/openai';
import { streamText, tool, jsonSchema } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = streamText({
      model: openai('gpt-4o'),
      messages,
      tools: {
        showStock: tool({
          description: 'Show stock price and information for a given symbol',
          parameters: jsonSchema({
            type: 'object',
            properties: {
              symbol: { type: 'string', description: 'The stock symbol to show (e.g. AAPL)' },
              name: { type: 'string', description: 'The name of the company' },
              price: { type: 'number', description: 'The current price' },
              change: { type: 'number', description: 'The price change' },
              changePercent: { type: 'number', description: 'The percentage change' },
            },
            required: ['symbol', 'price', 'change', 'changePercent'],
          }),
          execute: async ({ symbol, price, change, changePercent, name }: { symbol: string, price: number, change: number, changePercent: number, name?: string }) => {
              return { symbol, price, change, changePercent, name };
          }
        })
      }
    });
  
    // Use toUIMessageStreamResponse for AI SDK 5.0
    // @ts-expect-error type definition mismatch
    return result.toDataStreamResponse ? result.toDataStreamResponse() : (result as any).toUIMessageStreamResponse();

  } catch (error) {
    console.error('AI API Error:', error);
    return new Response(JSON.stringify({ error: 'Error processing request', details: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
