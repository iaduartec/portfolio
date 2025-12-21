import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req: Request) {
//   const { messages } = await req.json();

  try {
    const { messages } = await req.json();

    const result = streamText({
      model: openai('gpt-4o'),
      messages,
      tools: {
        showStock: tool({
          description: 'Show stock price and information for a given symbol',
          parameters: z.object({
              symbol: z.string().describe('The stock symbol to show (e.g. AAPL)'),
              name: z.string().optional().describe('The name of the company'),
              price: z.number().describe('The current price'),
              change: z.number().describe('The price change'),
              changePercent: z.number().describe('The percentage change'),
          }),
          // @ts-expect-error AI SDK type mismatch for execute
          execute: async ({ symbol, price, change, changePercent, name }: { symbol: string, price: number, change: number, changePercent: number, name?: string }) => {
              // In a real app, we might fetch real data here if the LLM didn't provide it provided accurate simulated data
              // For now, we trust the LLM to hallucinate realistic data or strictly follow prompts
              return { symbol, price, change, changePercent, name };
          }
        })
      }
    });
  
    // @ts-expect-error AI SDK 5.0 type definition mismatch
    return result.toDataStreamResponse();
  } catch (error) {
    console.error('AI API Error:', error);
    return new Response(JSON.stringify({ error: 'Error processing request', details: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
