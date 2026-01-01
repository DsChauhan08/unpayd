'use client';

import { useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { useChat } from '@/hooks/useChat';
import { getChatById } from '@/lib/chatStorage';
import type { ModelKey } from '@/types';

export default function ChatPage() {
    const params = useParams();
    const chatId = params.id as string;
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // Get chat info from storage
    const chatInfo = getChatById(chatId);
    
    const {
        messages,
        isLoading,
        isStreaming,
        error,
        currentModel,
        webSearchEnabled,
        setCurrentModel,
        setWebSearchEnabled,
        sendMessage,
        stopStreaming,
    } = useChat({
        chatId,
        initialModel: (chatInfo?.model as ModelKey) || 'general',
    });

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="flex flex-col h-[calc(100vh-3.5rem)] relative">
            {/* Messages area - scrollable */}
            <div className="flex-1 overflow-y-auto pb-4">
                <div className="max-w-4xl mx-auto px-2 sm:px-4">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 pt-10 sm:pt-20">
                            <p className="text-muted-foreground">Loading chat...</p>
                        </div>
                    ) : (
                        <div className="py-4">
                            {messages.map((message, index) => (
                                <ChatMessage
                                    key={message.id}
                                    role={message.role}
                                    content={message.content}
                                    isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
                                />
                            ))}

                            {error && (
                                <div className="px-4 py-3 mx-2 sm:mx-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>
            </div>

            {/* Input area - FIXED at bottom */}
            <div className="sticky bottom-0 left-0 right-0 bg-background border-t border-border pt-2 sm:pt-4 pb-4 sm:pb-6 z-10">
                <div className="max-w-3xl mx-auto px-2 sm:px-4">
                    <div className="flex items-center justify-center mb-2 sm:mb-3">
                        <ModelSelector
                            value={currentModel}
                            onChange={setCurrentModel}
                            disabled={isLoading || isStreaming}
                        />
                    </div>

                    <ChatInput
                        onSend={sendMessage}
                        isLoading={isLoading}
                        isStreaming={isStreaming}
                        onStop={stopStreaming}
                        webSearchEnabled={webSearchEnabled}
                        onToggleWebSearch={() => setWebSearchEnabled(!webSearchEnabled)}
                    />

                    {/* Disclaimer - hidden on mobile */}
                    <p className="hidden sm:block text-xs text-muted-foreground text-center mt-3">
                        Unpayd can make mistakes. Consider checking important information.
                    </p>
                </div>
            </div>
        </div>
    );
}
