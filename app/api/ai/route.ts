import { openai } from '@ai-sdk/openai';
import { streamText, tool, jsonSchema } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = streamText({
      model: openai('gpt-4o'),
      messages,
      // tools: { ... } removed for debugging
    });
  
    // Use toUIMessageStreamResponse for AI SDK 5.0
    // @ts-expect-error type definition mismatch
    return result.toDataStreamResponse ? result.toDataStreamResponse() : (result as any).toUIMessageStreamResponse();

  } catch (error) {
    console.error('AI API Error:', error);
    return new Response(JSON.stringify({ error: 'Error processing request', details: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
