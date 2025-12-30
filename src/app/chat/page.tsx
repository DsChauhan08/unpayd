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
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSuggestionClick = (suggestion: string) => {
        sendMessage(suggestion);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Messages area */}
            <ScrollArea ref={scrollRef} className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                    {messages.length === 0 ? (
                        /* Empty state - Grok-like welcome */
                        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 pt-20">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold text-white mb-2">Unpayd</h1>
                            <p className="text-zinc-400 text-center mb-8 max-w-md">
                                Your free AI assistant. Ask me anything, I&apos;m here to help.
                            </p>

                            {/* Suggestion chips */}
                            <div className="flex flex-wrap gap-2 justify-center max-w-xl">
                                {SUGGESTIONS.map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className="px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700 transition-colors"
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
                    {/* Model selector */}
                    <div className="flex items-center justify-center mb-3">
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

                    {/* Disclaimer */}
                    <p className="text-xs text-zinc-600 text-center mt-3">
                        Unpayd can make mistakes. Consider checking important information.
                    </p>
                </div>
            </div>
        </div>
    );
}
