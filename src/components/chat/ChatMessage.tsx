'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { User, Sparkles, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ChatMessageProps {
    role: 'user' | 'assistant';
    content: string;
    isStreaming?: boolean;
}

export const ChatMessage = memo(function ChatMessage({
    role,
    content,
    isStreaming
}: ChatMessageProps) {
    const [copied, setCopied] = useState(false);

    const isUser = role === 'user';

    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Simple markdown-like rendering
    const renderContent = (text: string) => {
        // Split by code blocks
        const parts = text.split(/(```[\s\S]*?```)/g);

        return parts.map((part, i) => {
            if (part.startsWith('```')) {
                // Code block
                const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
                if (match) {
                    const language = match[1] || '';
                    const code = match[2] || '';
                    return (
                        <div key={i} className="my-3 rounded-lg overflow-hidden bg-muted border border-border">
                            {language && (
                                <div className="px-3 py-1.5 text-xs text-muted-foreground bg-secondary border-b border-border">
                                    {language}
                                </div>
                            )}
                            <pre className="p-3 overflow-x-auto">
                                <code className="text-sm text-foreground font-mono">{code}</code>
                            </pre>
                        </div>
                    );
                }
            }

            // Regular text with inline formatting
            return (
                <span key={i}>
                    {part.split('\n').map((line, j) => (
                        <span key={j}>
                            {j > 0 && <br />}
                            {renderInlineFormatting(line)}
                        </span>
                    ))}
                </span>
            );
        });
    };

    const renderInlineFormatting = (text: string) => {
        // Images first (before links to avoid conflicts)
        let formatted = text.replace(
            /!\[([^\]]*)\]\(([^)]+)\)/g, 
            '<img src="$2" alt="$1" class="max-w-full rounded-lg my-2 max-h-96 object-contain" />'
        );
        // Bold
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Italic
        formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        // Inline code
        formatted = formatted.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-muted text-foreground text-sm font-mono">$1</code>');
        // Links
        formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-blue-500 dark:text-blue-400 hover:underline">$1</a>');

        return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
    };

    return (
        <div className={cn(
            "group flex gap-4 px-4 py-6 animate-fade-in",
            isUser ? "justify-end" : "justify-start"
        )}>
            {/* Avatar for assistant */}
            {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                </div>
            )}

            {/* Message content */}
            <div className={cn(
                "max-w-2xl",
                isUser ? "order-first" : ""
            )}>
                <div className={cn(
                    "rounded-2xl px-4 py-3",
                    isUser
                        ? "bg-secondary text-foreground"
                        : "bg-transparent text-foreground"
                )}>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                        {content ? renderContent(content) : isStreaming && (
                            <div className="flex items-center space-x-2 text-muted-foreground italic">
                                <Sparkles className="w-3 h-3 animate-spin" />
                                <span>Thinking...</span>
                            </div>
                        )}
                        {isStreaming && content && (
                            <span className="inline-block w-2 h-4 ml-1 bg-foreground/80 cursor-blink" />
                        )}
                    </div>
                </div>

                {/* Actions for assistant messages */}
                {!isUser && content && !isStreaming && (
                    <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={copyToClipboard}
                        >
                            {copied ? (
                                <>
                                    <Check className="w-3 h-3 mr-1" />
                                    Copied
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3 h-3 mr-1" />
                                    Copy
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </div>

            {/* Avatar for user */}
            {isUser && (
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-muted-foreground" />
                </div>
            )}
        </div>
    );
});
