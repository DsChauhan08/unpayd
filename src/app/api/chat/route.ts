import { MODELS, getCerebrasKeys, getOpenRouterKeys, type ModelKey, type ChatMessage } from '@/lib/openrouter';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, createUIMessageStreamResponse } from 'ai';

export const runtime = 'edge';
// constant max duration for Vercel
export const maxDuration = 60;

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
        const errors: string[] = [];

        // Convert UI messages to core messages format
        const coreMessages = messages.map(m => {
            // Handle AI SDK v3 UIMessage format with parts
            if (m.parts && Array.isArray(m.parts)) {
                const textContent = m.parts
                    .filter((p: any) => p.type === 'text')
                    .map((p: any) => p.text)
                    .join('');
                return {
                    role: m.role as 'user' | 'assistant' | 'system',
                    content: textContent
                };
            }
            // Handle legacy format with content string
            return {
                role: m.role as 'user' | 'assistant' | 'system',
                content: m.content || ''
            };
        });

        console.log(`[Chat API] Model: ${model}, Providers: ${modelConfig.providers.map(p => p.name).join(', ')}`);

        // Iterate through configured providers for this model
        for (const provider of modelConfig.providers) {
            if (provider.name === 'cerebras') {
                const keys = getCerebrasKeys();
                console.log(`[Chat API] Cerebras keys available: ${keys.length}`);
                if (keys.length === 0) {
                    errors.push('No Cerebras API keys configured');
                    continue;
                }

                // Round-robin/Failover for Cerebras keys
                for (let i = 0; i < keys.length; i++) {
                    const apiKey = keys[i];
                    try {
                        console.log(`[Chat API] Trying Cerebras key ${i + 1}/${keys.length} with model ${provider.id}`);
                        const cerebras = createOpenAI({
                            baseURL: 'https://api.cerebras.ai/v1',
                            apiKey: apiKey,
                        });

                        const result = await streamText({
                            model: cerebras(provider.id),
                            messages: coreMessages,
                            system: 'You are a helpful AI assistant.',
                        });

                        console.log(`[Chat API] Cerebras success with model ${provider.id}`);
                        return createUIMessageStreamResponse({
                            stream: result.toUIMessageStream(),
                        });
                    } catch (e: any) {
                        const errMsg = `Cerebras key ${i + 1}: ${e?.message || 'Unknown error'}`;
                        console.error(`[Chat API] ${errMsg}`, e);
                        errors.push(errMsg);
                        lastError = e as Error;
                    }
                }

            } else if (provider.name === 'openrouter') {
                const keys = getOpenRouterKeys();
                console.log(`[Chat API] OpenRouter keys available: ${keys.length}`);
                if (keys.length === 0) {
                    errors.push('No OpenRouter API keys configured');
                    continue;
                }

                for (let i = 0; i < keys.length; i++) {
                    const apiKey = keys[i];
                    try {
                        console.log(`[Chat API] Trying OpenRouter key ${i + 1}/${keys.length} with model ${provider.id}`);
                        const openrouter = createOpenAI({
                            baseURL: 'https://openrouter.ai/api/v1',
                            apiKey: apiKey,
                            headers: {
                                'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://unpayd.vercel.app',
                                'X-Title': 'Unpayd',
                            }
                        });

                        const result = await streamText({
                            model: openrouter(provider.id),
                            messages: coreMessages,
                            system: webSearch
                                ? 'You have access to web search. Use current information when relevant.'
                                : 'You are a helpful AI assistant.',
                        });

                        console.log(`[Chat API] OpenRouter success with model ${provider.id}`);
                        return createUIMessageStreamResponse({
                            stream: result.toUIMessageStream(),
                        });
                    } catch (e: any) {
                        const errMsg = `OpenRouter key ${i + 1}: ${e?.message || 'Unknown error'}`;
                        console.error(`[Chat API] ${errMsg}`, e);
                        errors.push(errMsg);
                        lastError = e as Error;
                    }
                }
            }
        }

        // All configured providers/keys failed
        console.error('[Chat API] All providers failed:', errors);
        return new Response(
            JSON.stringify({ 
                error: lastError?.message || 'All providers failed',
                details: errors
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('[Chat API] Route Handler Error:', error);
        return new Response(
            JSON.stringify({ error: error?.message || 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
