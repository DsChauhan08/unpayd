import { MODELS, getCerebrasKeys, getOpenRouterKeys, type ModelKey, type ChatMessage } from '@/lib/openrouter';

export const runtime = 'edge';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { messages, model = 'general', webSearch = false } = body as {
            messages: ChatMessage[];
            model: ModelKey;
            webSearch: boolean;
        };

        if (!messages || !Array.isArray(messages)) {
            return new Response(JSON.stringify({ error: 'Messages are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const modelConfig = MODELS[model];
        if (!modelConfig) {
            return new Response(JSON.stringify({ error: 'Invalid model' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        let lastError: Error | null = null;

        // Iterate through configured providers for this model
        for (const provider of modelConfig.providers) {
            try {
                if (provider.name === 'cerebras') {
                    const keys = getCerebrasKeys();
                    if (keys.length === 0) continue; // Skip if not configured

                    // Cerebras does not support web search plugin currently
                    const systemMessage = { role: 'system' as const, content: 'You are a helpful AI assistant.' };

                    // Round-robin/Failover for Cerebras keys
                    for (const apiKey of keys) {
                        try {
                            // 10s timeout
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 10000);

                            try {
                                const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${apiKey}`,
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        model: provider.id,
                                        messages: [systemMessage, ...messages],
                                        stream: true,
                                    }),
                                    signal: controller.signal
                                });

                                clearTimeout(timeoutId);

                                if (!response.ok) {
                                    const error = await response.json().catch(() => ({}));
                                    throw new Error(error.error?.message || `Cerebras API error: ${response.status}`);
                                }

                                return handleStreamResponse(response);
                            } catch (error) {
                                clearTimeout(timeoutId);
                                throw error;
                            }
                        } catch (e) {
                            lastError = e as Error;
                            // Continue to next key
                        }
                    }

                } else if (provider.name === 'openrouter') {
                    const keys = getOpenRouterKeys();
                    if (keys.length === 0) continue;

                    // Round-robin/Failover for OpenRouter keys
                    // We try all keys before giving up on OpenRouter
                    for (const apiKey of keys) {
                        try {
                            const systemMessage = webSearch
                                ? { role: 'system' as const, content: 'You have access to web search. Use current information when relevant.' }
                                : { role: 'system' as const, content: 'You are a helpful AI assistant.' };

                            // 10s timeout
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 10000);

                            try {
                                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${apiKey}`,
                                        'Content-Type': 'application/json',
                                        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                                        'X-Title': 'Unpayd',
                                    },
                                    body: JSON.stringify({
                                        model: provider.id,
                                        messages: [systemMessage, ...messages],
                                        stream: true,
                                        // Enable web search if supported
                                        ...(webSearch && {
                                            plugins: [{ id: 'web' }]
                                        }),
                                    }),
                                    signal: controller.signal
                                });

                                clearTimeout(timeoutId);

                                if (!response.ok) {
                                    const error = await response.json();
                                    throw new Error(error.error?.message || `OpenRouter API error: ${response.status}`);
                                }

                                return handleStreamResponse(response);
                            } catch (error) {
                                clearTimeout(timeoutId);
                                throw error;
                            }

                        } catch (e) {
                            lastError = e as Error;
                            // Continue to next key
                        }
                    }
                }
            } catch (e) {
                lastError = e as Error;
                // Continue to next provider
            }
        }

        // All configured providers/keys failed
        return new Response(
            JSON.stringify({ error: lastError?.message || 'All providers failed' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

function handleStreamResponse(upstreamResponse: Response) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const transformStream = new TransformStream({
        async transform(chunk, controller) {
            const text = decoder.decode(chunk);
            const lines = text.split('\n').filter(line => line.startsWith('data: '));

            for (const line of lines) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    continue;
                }

                try {
                    const parsed = JSON.parse(data);
                    const token = parsed.choices?.[0]?.delta?.content || '';
                    if (token) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
                    }
                } catch {
                    // Skip unparseable chunks
                }
            }
        },
    });

    return new Response(upstreamResponse.body?.pipeThrough(transformStream), {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

