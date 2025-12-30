'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
    ArrowUp,
    Paperclip,
    Mic,
    MicOff,
    Globe,
    X,
    Image as ImageIcon,
    FileText,
    Loader2,
    Square
} from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoice';
import { cn } from '@/lib/utils';

interface ChatInputProps {
    onSend: (message: string, files?: File[]) => void;
    isLoading?: boolean;
    isStreaming?: boolean;
    onStop?: () => void;
    webSearchEnabled?: boolean;
    onToggleWebSearch?: () => void;
}

export function ChatInput({
    onSend,
    isLoading,
    isStreaming,
    onStop,
    webSearchEnabled = false,
    onToggleWebSearch
}: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { isListening, transcript, isSupported, startListening, stopListening, resetTranscript } = useVoiceInput();

    // Sync voice transcript with message
    useEffect(() => {
        if (transcript) {
            setMessage((prev) => prev + transcript);
            resetTranscript();
        }
    }, [transcript, resetTranscript]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [message]);

    const handleSubmit = useCallback(() => {
        if ((!message.trim() && files.length === 0) || isLoading) return;

        onSend(message.trim(), files.length > 0 ? files : undefined);
        setMessage('');
        setFiles([]);

        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    }, [message, files, isLoading, onSend]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        setFiles((prev) => [...prev, ...droppedFiles].slice(0, 5)); // Max 5 files
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            setFiles((prev) => [...prev, ...selectedFiles].slice(0, 5));
        }
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const toggleVoice = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto px-4">
            {/* File previews */}
            {files.length > 0 && (
                <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                    {files.map((file, index) => (
                        <div
                            key={index}
                            className="relative flex items-center gap-2 px-3 py-2 bg-zinc-900 rounded-lg border border-zinc-800 shrink-0"
                        >
                            {file.type.startsWith('image/') ? (
                                <ImageIcon className="w-4 h-4 text-zinc-400" />
                            ) : (
                                <FileText className="w-4 h-4 text-zinc-400" />
                            )}
                            <span className="text-sm text-zinc-300 max-w-32 truncate">{file.name}</span>
                            <button

                                onClick={() => removeFile(index)}
                                className="p-0.5 hover:bg-zinc-800 rounded"
                            >
                                <X className="w-3 h-3 text-zinc-500" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Main input container */}
            <div
                className={cn(
                    "relative rounded-2xl bg-zinc-900 border transition-all duration-200",
                    isDragging ? "border-blue-500 bg-blue-500/10" : "border-zinc-800",
                    "glow-border"
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
            >
                {/* Textarea */}
                <Textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="What do you want to know?"
                    className="min-h-[52px] max-h-[200px] resize-none border-0 bg-transparent px-4 py-3.5 pr-32 focus-visible:ring-0 placeholder:text-zinc-500"
                    disabled={isLoading}
                />

                {/* Drag overlay */}
                {isDragging && (
                    <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 rounded-2xl border-2 border-dashed border-blue-500">
                        <p className="text-blue-400 font-medium">Drop files here</p>
                    </div>
                )}

                {/* Bottom toolbar */}
                <div className="flex items-center justify-between px-3 pb-3">
                    <div className="flex items-center gap-1">
                        {/* File upload */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*,.pdf,.doc,.docx,.txt,.md"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading}
                        >
                            <Paperclip className="w-4 h-4" />
                        </Button>

                        {/* Voice input */}
                        {isSupported && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-8 w-8",
                                    isListening
                                        ? "text-red-500 hover:text-red-400 bg-red-500/10"
                                        : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                                )}
                                onClick={toggleVoice}
                                disabled={isLoading}
                            >
                                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            </Button>
                        )}

                        {/* Web search toggle */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-8 gap-1.5 px-2",
                                webSearchEnabled
                                    ? "text-blue-400 hover:text-blue-300 bg-blue-500/10"
                                    : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                            )}
                            onClick={onToggleWebSearch}
                            disabled={isLoading}
                        >
                            <Globe className="w-4 h-4" />
                            <span className="text-xs">Search</span>
                        </Button>
                    </div>

                    {/* Send button */}
                    {isStreaming ? (
                        <Button
                            type="button"
                            size="icon"
                            className="h-8 w-8 rounded-lg bg-zinc-700 hover:bg-zinc-600"
                            onClick={onStop}
                        >
                            <Square className="w-3 h-3" />
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            size="icon"
                            className="h-8 w-8 rounded-lg bg-white text-black hover:bg-zinc-200 disabled:opacity-50"
                            onClick={handleSubmit}
                            disabled={!message.trim() && files.length === 0}
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <ArrowUp className="w-4 h-4" />
                            )}
                        </Button>
                    )}
                </div>
            </div>

            {/* Voice indicator */}
            {isListening && (
                <div className="flex items-center justify-center gap-2 mt-2 text-red-400 text-sm">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    Listening...
                </div>
            )}
        </div>
    );
}
