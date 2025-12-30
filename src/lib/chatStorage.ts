// Local storage fallback for chat persistence when backend is not available
// This allows the app to work without Nhost/Turso configured

export interface StoredChat {
    id: string;
    title: string | null;
    model: string;
    createdAt: number;
    updatedAt: number;
}

export interface StoredMessage {
    id: string;
    chatId: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: number;
}

const CHATS_KEY = 'unpayd_chats';
const MESSAGES_KEY = 'unpayd_messages';

// Check if we're in browser
const isBrowser = typeof window !== 'undefined';

export function getStoredChats(): StoredChat[] {
    if (!isBrowser) return [];
    try {
        const data = localStorage.getItem(CHATS_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

export function saveChat(chat: StoredChat): void {
    if (!isBrowser) return;
    try {
        const chats = getStoredChats();
        const existingIndex = chats.findIndex(c => c.id === chat.id);
        if (existingIndex >= 0) {
            chats[existingIndex] = chat;
        } else {
            chats.unshift(chat);
        }
        localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
    } catch (err) {
        console.error('Failed to save chat to localStorage:', err);
    }
}

export function updateChatTitle(chatId: string, title: string): void {
    if (!isBrowser) return;
    try {
        const chats = getStoredChats();
        const chat = chats.find(c => c.id === chatId);
        if (chat) {
            chat.title = title;
            chat.updatedAt = Date.now();
            localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
        }
    } catch (err) {
        console.error('Failed to update chat title:', err);
    }
}

export function deleteChat(chatId: string): void {
    if (!isBrowser) return;
    try {
        const chats = getStoredChats().filter(c => c.id !== chatId);
        localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
        // Also delete messages
        const messages = getStoredMessages().filter(m => m.chatId !== chatId);
        localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    } catch (err) {
        console.error('Failed to delete chat:', err);
    }
}

export function getStoredMessages(chatId?: string): StoredMessage[] {
    if (!isBrowser) return [];
    try {
        const data = localStorage.getItem(MESSAGES_KEY);
        const messages: StoredMessage[] = data ? JSON.parse(data) : [];
        return chatId ? messages.filter(m => m.chatId === chatId) : messages;
    } catch {
        return [];
    }
}

export function saveMessage(message: StoredMessage): void {
    if (!isBrowser) return;
    try {
        const messages = getStoredMessages();
        messages.push(message);
        localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
        
        // Update chat's updatedAt
        const chats = getStoredChats();
        const chat = chats.find(c => c.id === message.chatId);
        if (chat) {
            chat.updatedAt = Date.now();
            localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
        }
    } catch (err) {
        console.error('Failed to save message to localStorage:', err);
    }
}

export function getChatById(chatId: string): StoredChat | null {
    const chats = getStoredChats();
    return chats.find(c => c.id === chatId) || null;
}
