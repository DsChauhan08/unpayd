import { MODELS, getCerebrasKeys, getOpenRouterKeys, type ModelKey, type ChatMessage } from '@/lib/openrouter';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const runtime = 'edge';
// constant max duration for Vercel
export const maxDuration = 30;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { messages, model = 'general', webSearch = false } = body as {
            messages: any[];
            model: ModelKey;
            webSearch: boolean;
        };

        if (!messages || !Array.isArray(messages)) {
            return new Response(JSON.stringify({ error: 'Messages are required' }), { status: 400 });
        }

        const modelConfig = MODELS[model];
        if (!modelConfig) {
            return new Response(JSON.stringify({ error: 'Invalid model' }), { status: 400 });
        }

        let lastError: Error | null = null;

        // Manual conversion to CoreMessage to avoid import issues
        const coreMessages = messages.map(m => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content
        }));

        // Iterate through configured providers for this model
        for (const provider of modelConfig.providers) {
            if (provider.name === 'cerebras') {
                const keys = getCerebrasKeys();
                if (keys.length === 0) continue;

                // Round-robin/Failover for Cerebras keys
                for (const apiKey of keys) {
                    try {
                        const cerebras = createOpenAI({
                            baseURL: 'https://api.cerebras.ai/v1',
                            apiKey: apiKey,
                        });

                        const result = streamText({
                            model: cerebras(provider.id),
                            messages: coreMessages,
                            system: 'You are a helpful AI assistant.',
                            // Abort if connection takes > 10s
                            abortSignal: AbortSignal.timeout(10000),
                        });

                        return result.toDataStreamResponse();
                    } catch (e) {
                        console.error('Cerebras Error:', e);
                        lastError = e as Error;
                        // Continue to next key
                    }
                }

            } else if (provider.name === 'openrouter') {
                const keys = getOpenRouterKeys();
                if (keys.length === 0) continue;

                for (const apiKey of keys) {
                    try {
                        const openrouter = createOpenAI({
                            baseURL: 'https://openrouter.ai/api/v1',
                            apiKey: apiKey,
                            headers: {
                                'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                                'X-Title': 'Unpayd',
                            }
                        });

                        const result = streamText({
                            model: openrouter(provider.id),
                            messages: coreMessages,
                            system: webSearch
                                ? 'You have access to web search. Use current information when relevant.'
                                : 'You are a helpful AI assistant.',
                            // Abort if connection takes > 10s
                            abortSignal: AbortSignal.timeout(10000),
                        });

                        return result.toDataStreamResponse();
                    } catch (e) {
                        console.error('OpenRouter Error:', e);
                        lastError = e as Error;
                        // Continue to next key
                    }
                }
            }
        }

        // All configured providers/keys failed
        return new Response(
            JSON.stringify({ error: lastError?.message || 'All providers failed' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Route Handler Error:', error);
        return new Response(
            JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
