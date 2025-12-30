'use client';

import { useState, useCallback, useMemo } from 'react';
import { useChat as useAiChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { Message as DbMessage, ModelKey } from '@/types';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface UseChatOptions {
    initialMessages?: DbMessage[];
    initialModel?: ModelKey;
    chatId?: string;
}

interface UseChatReturn {
    messages: DbMessage[];
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
    const { isAuthenticated, user } = useAuth();

    const [chatId, setChatId] = useState<string | null>(initialChatId || null);
    const [currentModel, setCurrentModel] = useState<ModelKey>(initialModel);
    const [webSearchEnabled, setWebSearchEnabled] = useState(false);

    // Create transport with dynamic body that includes current model/settings
    const transport = useMemo(() => new DefaultChatTransport({
        api: '/api/chat',
        body: () => ({
            model: currentModel,
            webSearch: webSearchEnabled,
        }),
    }), [currentModel, webSearchEnabled]);

    // Use AI SDK v3 hook with transport
    const {
        messages: aiMessages,
        status,
        stop,
        setMessages: setAiMessages,
        error: aiError,
        sendMessage: sendAiMessage
    } = useAiChat({
        id: chatId || undefined,
        transport,
        messages: initialMessages.map(m => ({
            id: m.id,
            role: m.role,
            parts: [{ type: 'text' as const, text: m.content }],
            createdAt: m.createdAt,
        })),
        onError: (err) => {
            console.error('AI Chat Error:', err);
            toast.error(err.message || 'Failed to send message');
        },
        onFinish: async (options) => {
            // Save Assistant Message to Turso
            const message = options.messages[options.messages.length - 1];
            if (chatId && isAuthenticated && message?.role === 'assistant') {
                const textContent = message.parts
                    ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                    .map(p => p.text)
                    .join('') || '';
                await saveMessageToDb(chatId, 'assistant', textContent);
            }
        }
    });

    const isLoading = status === 'streaming' || status === 'submitted';

    // Convert AI SDK messages to our DB Message type
    const messages: DbMessage[] = useMemo(() => 
        aiMessages.map(m => ({
            id: m.id,
            chatId: chatId || '',
            role: m.role as 'user' | 'assistant',
            content: m.parts
                ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                .map(p => p.text)
                .join('') || '',
            createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
        })),
    [aiMessages, chatId]);

    const saveMessageToDb = async (currentChatId: string, role: 'user' | 'assistant', content: string) => {
        if (!isAuthenticated) return;
        try {
            await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: crypto.randomUUID(),
                    chatId: currentChatId,
                    role,
                    content,
                    createdAt: Date.now()
                })
            });
        } catch (err) {
            console.error('Failed to save message:', err);
        }
    };

    const sendMessage = useCallback(async (content: string, files?: File[]) => {
        if (!content.trim()) return;

        let currentChatId = chatId;

        // Create Chat if not exists
        if (!currentChatId && isAuthenticated && user) {
            try {
                currentChatId = crypto.randomUUID();
                await fetch('/api/chats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: currentChatId,
                        userId: user.id,
                        title: content.slice(0, 50),
                        model: currentModel,
                        createdAt: Date.now()
                    })
                });

                setChatId(currentChatId);
                window.history.pushState({}, '', `/chat/${currentChatId}`);
            } catch (err) {
                console.error('Failed to create chat:', err);
            }
        }

        // Save User Message to DB immediately
        if (currentChatId && isAuthenticated) {
            await saveMessageToDb(currentChatId, 'user', content);
        }

        // Trigger AI SDK submit
        await sendAiMessage({ text: content });

    }, [chatId, currentModel, isAuthenticated, user, sendAiMessage]);

    return {
        messages,
        isLoading,
        isStreaming: isLoading,
        error: aiError?.message || null,
        currentModel,
        webSearchEnabled,
        chatId,
        setCurrentModel,
        setWebSearchEnabled,
        sendMessage,
        clearMessages: () => {
            setAiMessages([]);
            setChatId(null);
            window.history.pushState({}, '', '/chat');
        },
        stopStreaming: stop
    };
}
