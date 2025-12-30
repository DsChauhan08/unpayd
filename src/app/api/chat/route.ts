import { MODELS, type ModelKey } from '@/lib/openrouter';
import type { ChatMessage } from '@/lib/openrouter';

export const runtime = 'edge';

// API Keys with round-robin failover
const getApiKeys = () => {
    const keys = [
        process.env.OPENROUTER_KEY_1,
        process.env.OPENROUTER_KEY_2,
    ].filter(Boolean) as string[];

    if (keys.length === 0) {
        throw new Error('No OpenRouter API keys configured');
    }

    return keys;
};

let currentKeyIndex = 0;

const getNextApiKey = () => {
    const keys = getApiKeys();
    const key = keys[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % keys.length;
    return key;
};

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

        let apiKey = getNextApiKey();
        let attempts = 0;
        const maxAttempts = getApiKeys().length;
        let lastError: Error | null = null;

        while (attempts < maxAttempts) {
            try {
                const systemMessage = webSearch
                    ? { role: 'system' as const, content: 'You are a helpful AI assistant. When answering questions, provide accurate and up-to-date information. If you are unsure about something, say so.' }
                    : { role: 'system' as const, content: 'You are a helpful AI assistant.' };

                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                        'X-Title': 'Unpayd',
                    },
                    body: JSON.stringify({
                        model: modelConfig.id,
                        messages: [systemMessage, ...messages],
                        stream: true,
                    }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    if (response.status === 429) {
                        // Rate limited, try next key
                        apiKey = getNextApiKey();
                        attempts++;
                        lastError = new Error('Rate limited');
                        continue;
                    }
                    throw new Error(error.error?.message || 'OpenRouter API error');
                }

                // Create a TransformStream to convert OpenRouter's SSE format
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

                return new Response(response.body?.pipeThrough(transformStream), {
                    headers: {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                    },
                });
            } catch (error) {
                attempts++;
                lastError = error as Error;
                if (attempts < maxAttempts) {
                    apiKey = getNextApiKey();
                }
            }
        }

        // All keys failed
        return new Response(
            JSON.stringify({ error: lastError?.message || 'All API keys exhausted' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
