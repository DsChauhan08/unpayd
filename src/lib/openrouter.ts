// OpenRouter and Cerebras API client
// Models: General, Coding, Deep Think, Quick + New Cerebras Models

export interface ModelProvider {
    name: 'cerebras' | 'openrouter';
    id: string;
}

export interface ModelConfig {
    name: string;
    description: string;
    icon: string;
    providers: ModelProvider[];
}

export const MODELS = {
    // Legacy/Functional Mappings (Updated to use best available)
    quick: {
        name: 'Quick (Llama 3.1 8B)',
        icon: '⚡',
        description: 'Fast responses for simple tasks',
        providers: [
            { name: 'cerebras', id: 'llama3.1-8b' },
            { name: 'openrouter', id: 'meta-llama/llama-3.1-8b-instruct:free' }
        ]
    },
    general: {
        name: 'General (Llama 3.3 70B)',
        icon: '💬',
        description: 'Versatile AI for everyday conversations',
        providers: [
            { name: 'cerebras', id: 'llama-3.3-70b' },
            { name: 'openrouter', id: 'meta-llama/llama-3.3-70b-instruct:free' }
        ]
    },
    code: {
        name: 'Coding (Qwen 3 32B)',
        icon: '💻',
        description: 'Specialized for programming tasks',
        providers: [
            { name: 'cerebras', id: 'qwen-3-32b' },
            { name: 'openrouter', id: 'qwen/qwen3-32b:free' }
        ]
    },
    deepthink: {
        name: 'Deep Think (DeepSeek R1)',
        icon: '🧠',
        description: 'Complex reasoning and analysis',
        providers: [
            { name: 'openrouter', id: 'deepseek/deepseek-r1:free' },
            { name: 'cerebras', id: 'llama-3.3-70b' }
        ]
    },
    // Explicit Models
    'llama-3.1-8b': {
        name: 'Llama 3.1 8B',
        icon: '🦙',
        description: '8B Parameters - Fast',
        providers: [
            { name: 'cerebras', id: 'llama3.1-8b' },
            { name: 'openrouter', id: 'meta-llama/llama-3.1-8b-instruct:free' }
        ]
    },
    'llama-3.3-70b': {
        name: 'Llama 3.3 70B',
        icon: '🦙',
        description: '70B Parameters - High Performance',
        providers: [
            { name: 'cerebras', id: 'llama-3.3-70b' },
            { name: 'openrouter', id: 'meta-llama/llama-3.3-70b-instruct:free' }
        ]
    },
    'qwen-3-32b': {
        name: 'Qwen 3 32B',
        icon: '🤖',
        description: '32B Parameters',
        providers: [
            { name: 'cerebras', id: 'qwen-3-32b' },
            { name: 'openrouter', id: 'qwen/qwen3-32b:free' }
        ]
    },
    'gpt-oss-120b': {
        name: 'GPT OSS 120B',
        icon: '🤖',
        description: '120B Parameters - Cerebras Only',
        providers: [
            { name: 'cerebras', id: 'gpt-oss-120b' }
        ]
    },
    // Preview Models (Cerebras only)
    'qwen-3-235b': {
        name: 'Qwen 3 235B',
        icon: '🧪',
        description: '235B Parameters - Preview',
        providers: [
            { name: 'cerebras', id: 'qwen-3-235b-a22b-instruct-2507' }
        ]
    },
    'zai-glm-4.6': {
        name: 'Z.ai GLM 4.6',
        icon: '🧪',
        description: '357B Parameters - Preview',
        providers: [
            { name: 'cerebras', id: 'zai-glm-4.6' }
        ]
    }
} as const;

export type ModelKey = keyof typeof MODELS;

// OpenRouter API Keys with dynamic loading
export const getOpenRouterKeys = () => {
    const keys: string[] = [];
    let i = 1;
    while (true) {
        // Accessing via bracket notation to allow dynamic lookup while respecting some bundlers
        // Note: In Next.js Edge, process.env is usually just an object.
        const key = process.env[`OPENROUTER_KEY_${i}`];
        if (!key) break;
        keys.push(key);
        i++;
    }

    // Fallback if no numbered keys, check OPENROUTER_API_KEY
    if (keys.length === 0 && process.env.OPENROUTER_API_KEY) {
        keys.push(process.env.OPENROUTER_API_KEY);
    }

    return keys;
};

// Cerebras API Keys with dynamic loading
export const getCerebrasKeys = () => {
    const keys: string[] = [];
    let i = 1;
    while (true) {
        const key = process.env[`CEREBRAS_API_KEY_${i}`];
        if (!key) break;
        keys.push(key);
        i++;
    }

    // Fallback if no numbered keys, check CEREBRAS_API_KEY
    if (keys.length === 0 && process.env.CEREBRAS_API_KEY) {
        keys.push(process.env.CEREBRAS_API_KEY);
    }

    return keys;
};

// Helper to get next OpenRouter key (round-robin state management)
// Helper to get next OpenRouter key (round-robin state management)
let currentOpenRouterKeyIndex = 0;
export const getNextOpenRouterKey = () => {
    const keys = getOpenRouterKeys();
    if (keys.length === 0) return null;
    const key = keys[currentOpenRouterKeyIndex];
    currentOpenRouterKeyIndex = (currentOpenRouterKeyIndex + 1) % keys.length;
    return key;
};

// Helper to get next Cerebras key (round-robin state management)
let currentCerebrasKeyIndex = 0;
export const getNextCerebrasKey = () => {
    const keys = getCerebrasKeys();
    if (keys.length === 0) return null;
    const key = keys[currentCerebrasKeyIndex];
    currentCerebrasKeyIndex = (currentCerebrasKeyIndex + 1) % keys.length;
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

// NOTE: streamChat implementation below is for client-side or legacy usage.
// The main logic is now in /src/app/api/chat/route.ts
export async function streamChat(
    messages: ChatMessage[],
    modelKey: ModelKey = 'general',
    webSearchEnabled: boolean = false,
    callbacks: StreamCallbacks
) {
    const modelConfig = MODELS[modelKey];
    if (!modelConfig) {
        callbacks.onError(new Error('Invalid model'));
        return;
    }

    // Simple implementation: Try providers in order
    for (const provider of modelConfig.providers) {
        try {
            if (provider.name === 'cerebras') {
                const apiKey = getNextCerebrasKey();
                if (!apiKey) continue; // Skip if no key

                // Cerebras fetch logic
                const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: provider.id,
                        messages,
                        stream: true,
                    }),
                });

                if (!response.ok) throw new Error('Cerebras error');

                await handleStream(response, callbacks);
                return; // Success
            } else if (provider.name === 'openrouter') {
                const apiKey = getNextOpenRouterKey();
                if (!apiKey) continue;

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
                        messages,
                        stream: true,
                    }),
                });

                if (!response.ok) throw new Error('OpenRouter error');

                await handleStream(response, callbacks);
                return; // Success
            }
        } catch (e) {
            console.error(`Provider ${provider.name} failed:`, e);
            // Continue to next provider
        }
    }

    callbacks.onError(new Error('All providers failed'));
}

async function handleStream(response: Response, callbacks: StreamCallbacks) {
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
            } catch { }
        }
    }
    callbacks.onComplete(fullText);
}

