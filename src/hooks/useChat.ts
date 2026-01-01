'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
import { trackTopic, extractTopics } from '@/lib/userPreferences';

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
    generatedImage: string | null;
    setCurrentModel: (model: ModelKey) => void;
    setWebSearchEnabled: (enabled: boolean) => void;
    sendMessage: (content: string, files?: File[]) => Promise<void>;
    clearMessages: () => void;
    stopStreaming: () => void;
    clearGeneratedImage: () => void;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
    const { initialMessages = [], initialModel = 'general', chatId: initialChatId } = options;
    const { isAuthenticated, user } = useAuth();

    // Generate a stable chat ID upfront if none provided - this prevents hook reinitialization
    const [chatId, setChatId] = useState<string | null>(() => initialChatId || null);
    const [hasCreatedChat, setHasCreatedChat] = useState(!!initialChatId);
    const [currentModel, setCurrentModel] = useState<ModelKey>(initialModel);
    const [webSearchEnabled, setWebSearchEnabled] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    
    // Use a ref to track chatId for callbacks (avoids stale closure issues)
    const chatIdRef = useRef<string | null>(chatId);
    useEffect(() => {
        chatIdRef.current = chatId;
    }, [chatId]);

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

    // Create transport with dynamic body that includes current model/settings and userId
    const transport = useMemo(() => new DefaultChatTransport({
        api: '/api/chat',
        body: () => ({
            model: currentModel,
            webSearch: webSearchEnabled,
            userId: user?.id, // Pass user ID for preferences context
        }),
    }), [currentModel, webSearchEnabled, user?.id]);

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
            // Save Assistant Message - use ref for current chatId
            const currentChatId = chatIdRef.current;
            const message = options.messages[options.messages.length - 1];
            if (currentChatId && message?.role === 'assistant') {
                const textContent = message.parts
                    ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                    .map(p => p.text)
                    .join('') || '';
                
                // Save to localStorage
                saveMessage({
                    id: message.id,
                    chatId: currentChatId,
                    role: 'assistant',
                    content: textContent,
                    createdAt: Date.now()
                });

                // Also try to save to backend if authenticated
                if (isAuthenticated) {
                    await saveMessageToBackend(currentChatId, 'assistant', textContent);
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
        if (!content.trim() && (!files || files.length === 0)) return;

        // Check for /image command
        if (content.trim().toLowerCase().startsWith('/image ')) {
            const imagePrompt = content.trim().slice(7).trim();
            if (!imagePrompt) {
                toast.error('Please provide an image description after /image');
                return;
            }

            // Generate image using Pollinations API
            try {
                toast.info('🎨 Generating image...');
                const response = await fetch('/api/image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: imagePrompt })
                });

                const data = await response.json();
                if (data.success && data.imageUrl) {
                    setGeneratedImage(data.imageUrl);
                    toast.success('Image generated!');
                    
                    // Also add as a message in chat
                    let currentChatId = chatId;
                    if (!currentChatId) {
                        currentChatId = crypto.randomUUID();
                        saveChat({
                            id: currentChatId,
                            title: `Image: ${imagePrompt.slice(0, 30)}...`,
                            model: currentModel,
                            createdAt: Date.now(),
                            updatedAt: Date.now()
                        });
                        setChatId(currentChatId);
                        setHasCreatedChat(true);
                        window.history.pushState({}, '', `/chat/${currentChatId}`);
                    }
                    
                    // Save user's prompt
                    saveMessage({
                        id: crypto.randomUUID(),
                        chatId: currentChatId,
                        role: 'user',
                        content: content,
                        createdAt: Date.now()
                    });
                    
                    // Save the generated image as assistant message
                    saveMessage({
                        id: crypto.randomUUID(),
                        chatId: currentChatId,
                        role: 'assistant',
                        content: `![Generated Image](${data.imageUrl})\n\n*Generated image for: "${imagePrompt}"*`,
                        createdAt: Date.now()
                    });
                    
                    // Force refresh messages
                    window.location.reload();
                } else {
                    toast.error(data.error || 'Failed to generate image');
                }
            } catch (err) {
                console.error('Image generation error:', err);
                toast.error('Failed to generate image');
            }
            return;
        }

        // Create Chat if not exists - generate ID but don't update state until after sending
        let currentChatId = chatId;
        let isNewChat = false;

        if (!currentChatId || !hasCreatedChat) {
            currentChatId = chatId || crypto.randomUUID();
            isNewChat = true;
            const chatTitle = content.slice(0, 50) + (content.length > 50 ? '...' : '');
            
            // Save to localStorage first (always works)
            saveChat({
                id: currentChatId,
                title: chatTitle,
                model: currentModel,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });

            // Update URL immediately
            window.history.pushState({}, '', `/chat/${currentChatId}`);

            // Also try to save to backend if authenticated (non-blocking)
            if (isAuthenticated && user) {
                fetch('/api/chats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: currentChatId,
                        userId: user.id,
                        title: chatTitle,
                        model: currentModel,
                        createdAt: Date.now()
                    })
                }).catch(err => console.error('Failed to create chat in backend:', err));
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

        // Track topics for user context (non-blocking)
        if (user?.id) {
            const topics = extractTopics(content);
            topics.forEach(topic => trackTopic(user.id, topic));
        }

        // Also try to save to backend if authenticated (non-blocking)
        if (isAuthenticated) {
            saveMessageToBackend(currentChatId, 'user', content).catch(() => {});
        }

        // Convert files to FileUIPart format for image attachments
        const attachments: Array<{ type: 'file'; mediaType: string; url: string }> = [];
        if (files && files.length > 0) {
            for (const file of files) {
                if (file.type.startsWith('image/')) {
                    try {
                        const base64 = await fileToBase64(file);
                        attachments.push({
                            type: 'file',
                            mediaType: file.type,
                            url: base64
                        });
                    } catch (err) {
                        console.error('Failed to convert file to base64:', err);
                    }
                }
            }
        }

        // Update chat ID state BEFORE sending (important for hook stability)
        if (isNewChat) {
            setChatId(currentChatId);
            setHasCreatedChat(true);
        }

        // Trigger AI SDK submit with text and optional image attachments
        try {
            if (attachments.length > 0) {
                await sendAiMessage({ 
                    text: content || 'What is in this image?',
                    files: attachments
                });
            } else {
                await sendAiMessage({ text: content });
            }
        } catch (err) {
            console.error('Failed to send message:', err);
            toast.error('Failed to send message. Please try again.');
        }

    }, [chatId, hasCreatedChat, currentModel, isAuthenticated, user, sendAiMessage]);

    // Helper function to convert File to base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    return {
        messages,
        isLoading,
        isStreaming: isLoading,
        error: aiError?.message || null,
        currentModel,
        webSearchEnabled,
        chatId,
        generatedImage,
        setCurrentModel,
        setWebSearchEnabled,
        sendMessage,
        clearMessages: () => {
            setAiMessages([]);
            setChatId(null);
            setGeneratedImage(null);
            window.history.pushState({}, '', '/chat');
        },
        stopStreaming: stop,
        clearGeneratedImage: () => setGeneratedImage(null)
    };
}
