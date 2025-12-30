'use client';

import { useState, useCallback, useRef } from 'react';
import { nhost } from '@/lib/nhost';
import { CREATE_CHAT, ADD_MESSAGE } from '@/lib/graphql';
import type { Message, ModelKey } from '@/types';
import { useAuth } from './useAuth';

interface UseChatOptions {
    initialMessages?: Message[];
    initialModel?: ModelKey;
    chatId?: string;
}

interface UseChatReturn {
    messages: Message[];
    isLoading: boolean;
    isStreaming: boolean;
    error: string | null;
    currentModel: ModelKey;
    webSearchEnabled: boolean;
    chatId: string | null;
    setCurrentModel: (model: ModelKey) => void;
    setWebSearchEnabled: (enabled: boolean) => void;
    sendMessage: (content: string, files?: File[]) => Promise<void>;
    clearMessages: () => void;
    stopStreaming: () => void;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
    const { initialMessages = [], initialModel = 'general', chatId: initialChatId } = options;
    const { isAuthenticated } = useAuth();

    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [chatId, setChatId] = useState<string | null>(initialChatId || null);
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentModel, setCurrentModel] = useState<ModelKey>(initialModel);
    const [webSearchEnabled, setWebSearchEnabled] = useState(false);

    const abortControllerRef = useRef<AbortController | null>(null);

    const saveMessageToDb = async (currentChatId: string, role: 'user' | 'assistant', content: string) => {
        if (!isAuthenticated) return;
        try {
            await nhost.graphql.request(ADD_MESSAGE, {
                chatId: currentChatId,
                role,
                content
            });
        } catch (err) {
            console.error('Failed to save message:', err);
        }
    };

    const sendMessage = useCallback(async (content: string, files?: File[]) => {
        if (!content.trim() && (!files || files.length === 0)) return;

        setError(null);
        setIsLoading(true);

        // Initialize ChatDB ID if needed
        let currentChatId = chatId;
        if (!currentChatId && isAuthenticated) {
            try {
                const data: any = await nhost.graphql.request(CREATE_CHAT, {
                    title: content.slice(0, 50), // Simple title from first message
                    model: currentModel
                });
                currentChatId = data.insert_chats_one.id;
                setChatId(currentChatId);
                // Update URL without reload
                window.history.pushState({}, '', `/chat/${currentChatId}`);
            } catch (err) {
                console.error('Failed to create chat:', err);
            }
        }

        // Add user message
        const userMessage: Message = {
            id: crypto.randomUUID(),
            chatId: currentChatId || '',
            role: 'user',
            content: content.trim(),
            files: files?.map((f) => ({
                id: crypto.randomUUID(),
                name: f.name,
                type: f.type,
                url: URL.createObjectURL(f),
                size: f.size,
            })),
            createdAt: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        if (currentChatId) await saveMessageToDb(currentChatId, 'user', userMessage.content);

        // Prepare assistant message placeholder
        const assistantMessageId = crypto.randomUUID();
        const assistantMessage: Message = {
            id: assistantMessageId,
            chatId: currentChatId || '',
            role: 'assistant',
            content: '',
            createdAt: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setIsStreaming(true);

        try {
            abortControllerRef.current = new AbortController();

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                    model: currentModel,
                    webSearch: webSearchEnabled,
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get response');
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

                for (const line of lines) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        const token = parsed.token || '';
                        if (token) {
                            fullText += token;
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantMessageId
                                        ? { ...m, content: fullText }
                                        : m
                                )
                            );
                        }
                    } catch {
                        // Skip unparseable chunks
                    }
                }
            }

            if (currentChatId) await saveMessageToDb(currentChatId, 'assistant', fullText);

        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                setError((err as Error).message);
                setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
            }
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
            abortControllerRef.current = null;
        }
    }, [messages, currentModel, webSearchEnabled, chatId, isAuthenticated]);

    const stopStreaming = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    }, []);

    const clearMessages = useCallback(() => {
        setMessages([]);
        setChatId(null);
        setError(null);
        window.history.pushState({}, '', '/chat');
    }, []);

    return {
        messages,
        isLoading,
        isStreaming,
        error,
        currentModel,
        webSearchEnabled,
        chatId,
        setCurrentModel,
        setWebSearchEnabled,
        sendMessage,
        clearMessages,
        stopStreaming,
    };
}
