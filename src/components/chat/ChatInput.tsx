'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
    ArrowUp,
    Paperclip,
    Globe,
    X,
    Image as ImageIcon,
    FileText,
    Loader2,
    Square,
    FileSearch
} from 'lucide-react';
import { VoiceInput } from './VoiceInput';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Threshold for converting large text to file attachment (characters)
const LARGE_TEXT_THRESHOLD = 3000;

interface FileWithOCR extends File {
    extractedText?: string;
    isProcessing?: boolean;
}

// Helper to create a text file from large input
function createTextFileFromInput(text: string): File {
    const blob = new Blob([text], { type: 'text/plain' });
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    return new File([blob], `pasted-text-${timestamp}.txt`, { type: 'text/plain' });
}

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
    const [files, setFiles] = useState<FileWithOCR[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessingFiles, setIsProcessingFiles] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [message]);

    // Process file with OCR if it's an image or document
    const processFileWithOCR = useCallback(async (file: File): Promise<FileWithOCR> => {
        const enhancedFile = file as FileWithOCR;
        
        // Only process images and certain document types
        if (!file.type.startsWith('image/') && 
            !file.type.includes('pdf') && 
            !file.type.startsWith('text/')) {
            return enhancedFile;
        }
        
        // Skip small images (likely icons)
        if (file.size < 5000) {
            return enhancedFile;
        }
        
        enhancedFile.isProcessing = true;
        
        try {
            // Read file as base64
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            
            // Call OCR API
            const response = await fetch('/api/ocr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file: base64,
                    mimeType: file.type,
                    method: 'auto'
                })
            });
            
            const result = await response.json();
            
            if (result.success && result.text) {
                enhancedFile.extractedText = result.text;
                toast.success(`Extracted text from ${file.name}`);
            }
        } catch (error) {
            console.error('OCR processing failed:', error);
        }
        
        enhancedFile.isProcessing = false;
        return enhancedFile;
    }, []);

    const handleSubmit = useCallback(() => {
        if ((!message.trim() && files.length === 0) || isLoading || isProcessingFiles) return;

        let finalMessage = message.trim();
        let finalFiles = [...files];

        // If message is too large, convert it to a text file attachment
        if (finalMessage.length > LARGE_TEXT_THRESHOLD) {
            const textFile = createTextFileFromInput(finalMessage);
            finalFiles.push(textFile as FileWithOCR);
            
            // Create a summary message instead
            const lineCount = finalMessage.split('\n').length;
            const wordCount = finalMessage.split(/\s+/).length;
            finalMessage = `[Attached large text: ${wordCount} words, ${lineCount} lines - see pasted-text file]\n\nPlease analyze the attached text file.`;
            
            toast.info('Large text converted to file attachment');
        }

        // If files have extracted text, append it to the message
        const extractedTexts = files
            .filter(f => f.extractedText)
            .map(f => `\n\n[Content from ${f.name}]:\n${f.extractedText}`);
        
        if (extractedTexts.length > 0) {
            finalMessage += extractedTexts.join('');
        }

        onSend(finalMessage, finalFiles.length > 0 ? finalFiles : undefined);
        setMessage('');
        setFiles([]);

        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    }, [message, files, isLoading, isProcessingFiles, onSend]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        setIsProcessingFiles(true);
        
        const processedFiles = await Promise.all(
            droppedFiles.slice(0, 5).map(f => processFileWithOCR(f))
        );
        
        setFiles((prev) => [...prev, ...processedFiles].slice(0, 5));
        setIsProcessingFiles(false);
    }, [processFileWithOCR]);

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            setIsProcessingFiles(true);
            
            const processedFiles = await Promise.all(
                selectedFiles.slice(0, 5).map(f => processFileWithOCR(f))
            );
            
            setFiles((prev) => [...prev, ...processedFiles].slice(0, 5));
            setIsProcessingFiles(false);
        }
    }, [processFileWithOCR]);

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleVoiceTranscript = useCallback((text: string) => {
        setMessage(prev => (prev + ' ' + text).trim());
        // Focus textarea after voice input
        textareaRef.current?.focus();
    }, []);

    return (
        <div className="w-full max-w-3xl mx-auto px-4">
            {/* File previews */}
            {files.length > 0 && (
                <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                    {files.map((file, index) => (
                        <div
                            key={index}
                            className="relative flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg border border-border shrink-0"
                        >
                            {file.type.startsWith('image/') ? (
                                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                            ) : (
                                <FileText className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="text-sm text-foreground max-w-32 truncate">{file.name}</span>
                            {file.extractedText && (
                                <span title="Text extracted">
                                    <FileSearch className="w-3 h-3 text-green-500" />
                                </span>
                            )}
                            {file.isProcessing && (
                                <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                            )}
                            <button
                                onClick={() => removeFile(index)}
                                className="p-0.5 hover:bg-muted rounded"
                            >
                                <X className="w-3 h-3 text-muted-foreground" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Main input container */}
            <div
                className={cn(
                    "relative rounded-2xl bg-secondary border transition-all duration-200",
                    isDragging ? "border-blue-500 bg-blue-500/10" : "border-border",
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
                    className="min-h-[52px] max-h-[200px] resize-none border-0 bg-transparent px-4 py-3.5 pr-32 focus-visible:ring-0 placeholder:text-muted-foreground text-foreground"
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
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading || isProcessingFiles}
                        >
                            {isProcessingFiles ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Paperclip className="w-4 h-4" />
                            )}
                        </Button>

                        {/* Voice input */}
                        <VoiceInput 
                            onTranscript={handleVoiceTranscript}
                            disabled={isLoading}
                        />

                        {/* Web search toggle */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-8 gap-1.5 px-2",
                                webSearchEnabled
                                    ? "text-blue-400 hover:text-blue-300 bg-blue-500/10"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                            className="h-8 w-8 rounded-lg bg-muted hover:bg-muted/80"
                            onClick={onStop}
                        >
                            <Square className="w-3 h-3" />
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            size="icon"
                            className="h-8 w-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            onClick={handleSubmit}
                            disabled={(!message.trim() && files.length === 0) || isProcessingFiles}
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
        </div>
    );
}
