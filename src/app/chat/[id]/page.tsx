'use client';

import { useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { useChat } from '@/hooks/useChat';
import { getChatById } from '@/lib/chatStorage';
import type { ModelKey } from '@/types';

export default function ChatPage() {
    const params = useParams();
    const chatId = params.id as string;
    const scrollRef = useRef<HTMLDivElement>(null);
    
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
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="flex flex-col h-full">
            {/* Messages area */}
            <ScrollArea ref={scrollRef} className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 pt-20">
                            <p className="text-zinc-500">Loading chat...</p>
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
                                <div className="px-4 py-3 mx-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Input area */}
            <div className="border-t border-zinc-800/50 pt-4 pb-6">
                <div className="max-w-3xl mx-auto px-4">
                    <div className="flex items-center justify-center mb-3">
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

                    <p className="text-xs text-zinc-600 text-center mt-3">
                        Unpayd can make mistakes. Consider checking important information.
                    </p>
                </div>
            </div>
        </div>
    );
}
