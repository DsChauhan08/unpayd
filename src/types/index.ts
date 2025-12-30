// Type definitions for Unpayd

export interface User {
    id: string;
    email: string;
    name?: string;
    verified: boolean;
    avatar?: string;
    created: string;
    updated: string;
}

export interface Chat {
    id: string;
    userId: string;
    title: string | null;
    model: ModelKey;
    archived: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Message {
    id: string;
    chatId: string;
    role: 'user' | 'assistant';
    content: string;
    files?: UploadedFile[];
    createdAt: Date;
}

export interface UploadedFile {
    id: string;
    name: string;
    type: string;
    url: string;
    size: number;
}

import { type ModelKey } from '@/lib/openrouter';
export type { ModelKey };

export interface ModelInfo {
    id: string;
    name: string;
    icon: string;
    description: string;
}

export interface ChatState {
    messages: Message[];
    isLoading: boolean;
    isStreaming: boolean;
    error: string | null;
    currentModel: ModelKey;
    webSearchEnabled: boolean;
}

export interface UserSettings {
    theme: 'dark' | 'light';
    defaultModel: ModelKey;
    webSearchEnabled: boolean;
}
