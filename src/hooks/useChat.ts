'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useChat as useAiChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { Message as DbMessage, ModelKey } from '@/types';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { 
    saveChat, 
    saveMessage, 
    updateChatTitle,
    getStoredMessages,
    type StoredChat 
} from '@/lib/chatStorage';

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

    // Load messages from localStorage if we have a chatId
    const storedMessages = useMemo(() => {
        if (!initialChatId) return [];
        return getStoredMessages(initialChatId).map(m => ({
            id: m.id,
            chatId: m.chatId,
            role: m.role,
            content: m.content,
            createdAt: new Date(m.createdAt),
        }));
    }, [initialChatId]);

    const effectiveInitialMessages = initialMessages.length > 0 ? initialMessages : storedMessages;

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
        messages: effectiveInitialMessages.map(m => ({
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
            // Save Assistant Message
            const message = options.messages[options.messages.length - 1];
            if (chatId && message?.role === 'assistant') {
                const textContent = message.parts
                    ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                    .map(p => p.text)
                    .join('') || '';
                
                // Save to localStorage
                saveMessage({
                    id: message.id,
                    chatId: chatId,
                    role: 'assistant',
                    content: textContent,
                    createdAt: Date.now()
                });

                // Also try to save to backend if authenticated
                if (isAuthenticated) {
                    await saveMessageToBackend(chatId, 'assistant', textContent);
                }
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

    const saveMessageToBackend = async (currentChatId: string, role: 'user' | 'assistant', content: string) => {
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
            console.error('Failed to save message to backend:', err);
        }
    };

    const sendMessage = useCallback(async (content: string, files?: File[]) => {
        if (!content.trim()) return;

        let currentChatId = chatId;

        // Create Chat if not exists
        if (!currentChatId) {
            currentChatId = crypto.randomUUID();
            const chatTitle = content.slice(0, 50) + (content.length > 50 ? '...' : '');
            
            // Save to localStorage first (always works)
            saveChat({
                id: currentChatId,
                title: chatTitle,
                model: currentModel,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });

            setChatId(currentChatId);
            window.history.pushState({}, '', `/chat/${currentChatId}`);

            // Also try to save to backend if authenticated
            if (isAuthenticated && user) {
                try {
                    await fetch('/api/chats', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: currentChatId,
                            userId: user.id,
                            title: chatTitle,
                            model: currentModel,
                            createdAt: Date.now()
                        })
                    });
                } catch (err) {
                    console.error('Failed to create chat in backend:', err);
                }
            }
        }

        // Save User Message to localStorage
        const messageId = crypto.randomUUID();
        saveMessage({
            id: messageId,
            chatId: currentChatId,
            role: 'user',
            content,
            createdAt: Date.now()
        });

        // Also try to save to backend if authenticated
        if (isAuthenticated) {
            await saveMessageToBackend(currentChatId, 'user', content);
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
