import { MODELS, getCerebrasKeys, getOpenRouterKeys, type ModelKey, type ChatMessage } from '@/lib/openrouter';
import { performWebSearch, formatSearchResultsForLLM } from '@/lib/websearch';
import { getUserPreferences, formatPreferencesForContext } from '@/lib/userPreferences';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, createUIMessageStreamResponse } from 'ai';

// Use nodejs runtime for better compatibility
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        let { messages, model = 'general', webSearch = false, userId } = body as {
            messages: any[];
            model: ModelKey;
            webSearch: boolean;
            userId?: string;
        };

        if (!messages || !Array.isArray(messages)) {
            return new Response(JSON.stringify({ error: 'Messages are required' }), { status: 400 });
        }

        // Check if any message has image content
        const hasImages = messages.some(m => 
            m.parts?.some((p: any) => 
                p.type === 'file' && p.mimeType?.startsWith('image/')
            )
        );

        // Auto-switch to vision model if images are present
        if (hasImages) {
            console.log('[Chat API] Images detected, switching to vision model');
            model = 'vision' as ModelKey;
        }

        const modelConfig = MODELS[model];
        if (!modelConfig) {
            return new Response(JSON.stringify({ error: 'Invalid model' }), { status: 400 });
        }

        let lastError: Error | null = null;
        const errors: string[] = [];

        // Perform web search if enabled
        let searchContext = '';
        if (webSearch) {
            // Get the last user message for the search query
            const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
            if (lastUserMessage) {
                const query = lastUserMessage.parts
                    ?.filter((p: any) => p.type === 'text')
                    .map((p: any) => p.text)
                    .join(' ') || lastUserMessage.content || '';
                
                if (query) {
                    console.log(`[Chat API] Performing web search for: "${query}"`);
                    const searchResults = await performWebSearch(query);
                    searchContext = formatSearchResultsForLLM(searchResults);
                    console.log(`[Chat API] Web search completed, got ${searchResults.results.length} results`);
                }
            }
        }

        // Get user preferences for context
        let preferencesContext = '';
        if (userId) {
            const preferences = getUserPreferences(userId);
            preferencesContext = formatPreferencesForContext(preferences);
        }

        // Convert UI messages to core messages format with image support
        const coreMessages = messages.map(m => {
            // Handle AI SDK v3 UIMessage format with parts
            if (m.parts && Array.isArray(m.parts)) {
                const content: Array<{ type: 'text'; text: string } | { type: 'image'; image: string }> = [];
                
                for (const p of m.parts) {
                    if (p.type === 'text' && p.text) {
                        content.push({ type: 'text', text: p.text });
                    } else if (p.type === 'file' && p.mimeType?.startsWith('image/')) {
                        // Handle file attachments (images)
                        content.push({ type: 'image', image: p.url || p.data });
                    }
                }
                
                // If only text, return simple format
                if (content.length === 1 && content[0].type === 'text') {
                    return {
                        role: m.role as 'user' | 'assistant' | 'system',
                        content: content[0].text
                    };
                }
                
                // If has images, return multi-part content
                if (content.length > 0) {
                    return {
                        role: m.role as 'user' | 'assistant' | 'system',
                        content: content
                    };
                }
                
                return {
                    role: m.role as 'user' | 'assistant' | 'system',
                    content: ''
                };
            }
            // Handle legacy format with content string
            return {
                role: m.role as 'user' | 'assistant' | 'system',
                content: m.content || ''
            };
        });

        console.log(`[Chat API] Model: ${model}, Providers: ${modelConfig.providers.map(p => p.name).join(', ')}`);

        // Build system prompt with search results and user preferences
        let systemPrompt = 'You are a helpful AI assistant.';
        
        if (preferencesContext) {
            systemPrompt += `\n\nUser Context:\n${preferencesContext}`;
        }
        
        if (webSearch && searchContext) {
            systemPrompt = `You have access to real-time web search results. Use the following search results to provide accurate, up-to-date information. Always cite your sources when using web search results.\n${searchContext}\n\nBased on the search results above, provide a comprehensive answer.`;
            if (preferencesContext) {
                systemPrompt += `\n\nUser Context:\n${preferencesContext}`;
            }
        }

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
                            // Use .chat() to force chat completions endpoint
                            model: cerebras.chat(provider.id),
                            messages: coreMessages,
                            system: systemPrompt,
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

                        // Build provider config with optional web search
                        const providerConfig: Record<string, any> = {};
                        if (webSearch) {
                            // OpenRouter web search plugin
                            providerConfig.openrouter = {
                                plugins: [{ id: 'web' }]
                            };
                        }

                        const result = await streamText({
                            // Use .chat() to force chat completions endpoint
                            model: openrouter.chat(provider.id),
                            messages: coreMessages,
                            system: systemPrompt,
                            ...(webSearch ? { experimental_providerMetadata: providerConfig } : {})
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
