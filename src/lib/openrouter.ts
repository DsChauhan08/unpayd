// OpenRouter API client with dual key failover
// Models: General, Coding, Deep Think, Quick

export const MODELS = {
    quick: {
        id: 'xiaomi/mimo-v2-flash:free',
        name: 'Quick',
        icon: '⚡',
        description: 'Fast responses for simple tasks',
    },
    general: {
        id: 'nousresearch/hermes-3-llama-3.1-405b:free',
        name: 'General',
        icon: '💬',
        description: 'Versatile AI for everyday conversations',
    },
    code: {
        id: 'qwen/qwen3-coder:free',
        name: 'Coding',
        icon: '💻',
        description: 'Specialized for programming tasks',
    },
    deepthink: {
        id: 'moonshotai/kimi-k2:free',
        name: 'Deep Think',
        icon: '🧠',
        description: 'Complex reasoning and analysis',
    },
} as const;

export type ModelKey = keyof typeof MODELS;

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

export const getNextApiKey = () => {
    const keys = getApiKeys();
    const key = keys[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % keys.length;
    return key;
};

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface StreamCallbacks {
    onToken: (token: string) => void;
    onComplete: (fullText: string) => void;
    onError: (error: Error) => void;
}

export async function streamChat(
    messages: ChatMessage[],
    modelKey: ModelKey = 'general',
    webSearchEnabled: boolean = false,
    callbacks: StreamCallbacks
) {
    const model = MODELS[modelKey];
    let apiKey = getNextApiKey();
    let attempts = 0;
    const maxAttempts = getApiKeys().length;

    while (attempts < maxAttempts) {
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
                    model: model.id,
                    messages: webSearchEnabled
                        ? [
                            { role: 'system', content: 'You have access to web search. Use current information when relevant.' },
                            ...messages
                        ]
                        : messages,
                    stream: true,
                    // Enable web search if supported
                    ...(webSearchEnabled && {
                        plugins: [{ id: 'web' }]
                    }),
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                if (response.status === 429) {
                    // Rate limited, try next key
                    apiKey = getNextApiKey();
                    attempts++;
                    continue;
                }
                throw new Error(error.error?.message || 'OpenRouter API error');
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

                for (const line of lines) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        const token = parsed.choices?.[0]?.delta?.content || '';
                        if (token) {
                            fullText += token;
                            callbacks.onToken(token);
                        }
                    } catch {
                        // Skip unparseable chunks
                    }
                }
            }

            callbacks.onComplete(fullText);
            return;
        } catch (error) {
            attempts++;
            if (attempts >= maxAttempts) {
                callbacks.onError(error as Error);
                return;
            }
            apiKey = getNextApiKey();
        }
    }
}
