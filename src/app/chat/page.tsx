'use client';

import { useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { useChat } from '@/hooks/useChat';
import { Sparkles } from 'lucide-react';

const SUGGESTIONS = [
    "How does AI work?",
    "Write a Python function to sort a list",
    "Explain quantum computing simply",
    "What's the meaning of life?",
];

export default function ChatPage() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
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
    } = useChat();

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSuggestionClick = (suggestion: string) => {
        sendMessage(suggestion);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-3.5rem)] relative">
            {/* Messages area - scrollable */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto pb-4">
                <div className="max-w-4xl mx-auto px-2 sm:px-4">
                    {messages.length === 0 ? (
                        /* Empty state - Grok-like welcome */
                        <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 pt-10 sm:pt-20">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 sm:mb-6">
                                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Unpayd</h1>
                            <p className="text-muted-foreground text-center mb-6 sm:mb-8 max-w-md text-sm sm:text-base">
                                Your free AI assistant. Ask me anything, I&apos;m here to help.
                            </p>

                            {/* Suggestion chips */}
                            <div className="flex flex-wrap gap-2 justify-center max-w-xl px-2">
                                {SUGGESTIONS.map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-secondary border border-border text-xs sm:text-sm text-muted-foreground hover:bg-muted hover:border-muted transition-colors"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Message list */
                        <div className="py-4">
                            {messages.map((message, index) => (
                                <ChatMessage
                                    key={message.id}
                                    role={message.role}
                                    content={message.content}
                                    isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
                                />
                            ))}

                            {/* Error message */}
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
                    {/* Model selector */}
                    <div className="flex items-center justify-center mb-2 sm:mb-3">
                        <ModelSelector
                            value={currentModel}
                            onChange={setCurrentModel}
                            disabled={isLoading || isStreaming}
                        />
                    </div>

                    {/* Chat input */}
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
