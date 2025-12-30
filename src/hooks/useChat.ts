'use client';

import { useState, useCallback, useEffect } from 'react';
import { useChat as useAiChat } from '@ai-sdk/react';
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
    isStreaming: boolean; // Alias for isLoading in ai/react
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

    // Use standard AI SDK hook
    const {
        messages: aiMessages,
        status,
        stop,
        setMessages: setAiMessages,
        error: aiError,
        sendMessage: sendAiMessage
    } = useAiChat({
        initialMessages: initialMessages as any,
        body: {
            model: currentModel,
            webSearch: webSearchEnabled,
        },
        onError: (err) => {
            console.error('AI Chat Error:', err);
            toast.error(err.message || 'Failed to send message');
        },
        onFinish: async ({ message }) => {
            // Save Assistant Message to Turso
            if (chatId && isAuthenticated) {
                await saveMessageToDb(chatId, 'assistant', message.content);
            }
        }
    });

    const isLoading = status === 'streaming' || status === 'submitted';

    // We must manually cast AI SDK messages to our DB Message type for consumption
    const messages = aiMessages as unknown as DbMessage[];

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

        // Trigger AI SDK submit using sendMessage
        // content is string, SDK manages the rest
        await sendAiMessage(content);

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
