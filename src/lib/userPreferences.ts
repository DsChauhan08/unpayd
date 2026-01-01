// User Preferences and Context System
// Stores and retrieves user preferences for personalized AI responses
// Uses localStorage as primary store with optional backend sync

export interface UserPreference {
    id: string;
    userId: string;
    category: 'personal' | 'work' | 'interests' | 'communication' | 'custom';
    key: string;
    value: string;
    createdAt: number;
    updatedAt: number;
}

export interface UserContext {
    userId: string;
    name?: string;
    timezone?: string;
    language?: string;
    profession?: string;
    interests?: string[];
    communicationStyle?: 'formal' | 'casual' | 'technical' | 'simple';
    customPreferences: Record<string, string>;
    topTopics?: string[]; // Most frequently discussed topics
    updatedAt: number;
}

const PREFERENCES_KEY = 'unpayd_user_preferences';
const CONTEXT_KEY = 'unpayd_user_context';
const TOPIC_HISTORY_KEY = 'unpayd_topic_history';

// Browser check
const isBrowser = typeof window !== 'undefined';

// Get user preferences from localStorage
export function getUserPreferences(userId: string): UserContext {
    if (!isBrowser) {
        return createDefaultContext(userId);
    }

    try {
        const data = localStorage.getItem(`${CONTEXT_KEY}_${userId}`);
        if (data) {
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Failed to load user preferences:', error);
    }

    return createDefaultContext(userId);
}

function createDefaultContext(userId: string): UserContext {
    return {
        userId,
        customPreferences: {},
        updatedAt: Date.now(),
    };
}

// Save user preferences (localStorage + optional backend sync)
export function saveUserPreferences(context: UserContext): void {
    if (!isBrowser) return;

    try {
        context.updatedAt = Date.now();
        localStorage.setItem(`${CONTEXT_KEY}_${context.userId}`, JSON.stringify(context));
        
        // Sync to backend (non-blocking)
        syncPreferencesToBackend(context).catch(err => {
            console.warn('Failed to sync preferences to backend:', err);
        });
    } catch (error) {
        console.error('Failed to save user preferences:', error);
    }
}

// Sync preferences to backend API
async function syncPreferencesToBackend(context: UserContext): Promise<void> {
    try {
        await fetch('/api/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: context.userId,
                name: context.name,
                profession: context.profession,
                timezone: context.timezone,
                language: context.language,
                communicationStyle: context.communicationStyle,
                interests: context.interests,
                customPreferences: context.customPreferences,
            }),
        });
    } catch (error) {
        // Silently fail - localStorage is the primary store
        console.warn('Backend sync failed:', error);
    }
}

// Load preferences from backend (for cross-device sync)
export async function loadPreferencesFromBackend(userId: string): Promise<UserContext | null> {
    try {
        const response = await fetch(`/api/preferences?userId=${encodeURIComponent(userId)}`);
        const data = await response.json();
        
        if (data.preferences) {
            // Merge with local storage (backend takes precedence if newer)
            const local = getUserPreferences(userId);
            if (data.preferences.updatedAt > local.updatedAt) {
                saveUserPreferences(data.preferences);
                return data.preferences;
            }
        }
        
        return null;
    } catch (error) {
        console.warn('Failed to load preferences from backend:', error);
        return null;
    }
}

// Update a specific preference
export function updatePreference(
    userId: string, 
    key: keyof UserContext | string, 
    value: any
): UserContext {
    const context = getUserPreferences(userId);
    
    if (key in context && key !== 'customPreferences') {
        (context as any)[key] = value;
    } else {
        context.customPreferences[key] = String(value);
    }
    
    saveUserPreferences(context);
    return context;
}

// Add an interest
export function addInterest(userId: string, interest: string): void {
    const context = getUserPreferences(userId);
    if (!context.interests) {
        context.interests = [];
    }
    if (!context.interests.includes(interest)) {
        context.interests.push(interest);
        saveUserPreferences(context);
    }
}

// Track discussed topics to build context over time
export function trackTopic(userId: string, topic: string): void {
    if (!isBrowser) return;

    try {
        const key = `${TOPIC_HISTORY_KEY}_${userId}`;
        const data = localStorage.getItem(key);
        const topics: Record<string, number> = data ? JSON.parse(data) : {};
        
        // Normalize topic
        const normalizedTopic = topic.toLowerCase().trim();
        topics[normalizedTopic] = (topics[normalizedTopic] || 0) + 1;
        
        localStorage.setItem(key, JSON.stringify(topics));
        
        // Update top topics in context
        const sortedTopics = Object.entries(topics)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([t]) => t);
        
        const context = getUserPreferences(userId);
        context.topTopics = sortedTopics;
        localStorage.setItem(`${CONTEXT_KEY}_${userId}`, JSON.stringify(context));
        
        // Sync topic to backend (non-blocking)
        fetch('/api/preferences', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, topic: normalizedTopic }),
        }).catch(() => {});
    } catch (error) {
        console.error('Failed to track topic:', error);
    }
}

// Extract potential topics from a message (simple keyword extraction)
export function extractTopics(message: string): string[] {
    const stopWords = new Set([
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
        'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
        'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
        'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here',
        'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more',
        'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
        'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or',
        'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with',
        'about', 'against', 'between', 'into', 'through', 'during', 'before',
        'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out',
        'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
        'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you',
        'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself',
        'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them',
        'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this',
        'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been',
        'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
        'want', 'know', 'think', 'make', 'like', 'help', 'please', 'thanks'
    ]);

    const words = message
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word));

    // Get unique words with higher frequency
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
    });

    return Object.entries(wordCount)
        .filter(([_, count]) => count >= 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);
}

// Format preferences for LLM context injection
export function formatPreferencesForContext(context: UserContext): string {
    const parts: string[] = [];

    if (context.name) {
        parts.push(`User's name: ${context.name}`);
    }

    if (context.profession) {
        parts.push(`Profession: ${context.profession}`);
    }

    if (context.timezone) {
        parts.push(`Timezone: ${context.timezone}`);
    }

    if (context.language) {
        parts.push(`Preferred language: ${context.language}`);
    }

    if (context.communicationStyle) {
        const styles: Record<string, string> = {
            formal: 'Prefers formal, professional communication',
            casual: 'Prefers casual, friendly communication',
            technical: 'Prefers detailed technical explanations',
            simple: 'Prefers simple, easy-to-understand explanations',
        };
        parts.push(styles[context.communicationStyle]);
    }

    if (context.interests && context.interests.length > 0) {
        parts.push(`Interests: ${context.interests.join(', ')}`);
    }

    if (context.topTopics && context.topTopics.length > 0) {
        parts.push(`Frequently discussed topics: ${context.topTopics.slice(0, 5).join(', ')}`);
    }

    const customEntries = Object.entries(context.customPreferences);
    if (customEntries.length > 0) {
        parts.push('Custom preferences:');
        customEntries.forEach(([key, value]) => {
            parts.push(`  - ${key}: ${value}`);
        });
    }

    if (parts.length === 0) {
        return '';
    }

    return parts.join('\n');
}

// Clear all preferences for a user
export function clearUserPreferences(userId: string): void {
    if (!isBrowser) return;

    try {
        localStorage.removeItem(`${CONTEXT_KEY}_${userId}`);
        localStorage.removeItem(`${TOPIC_HISTORY_KEY}_${userId}`);
    } catch (error) {
        console.error('Failed to clear preferences:', error);
    }
}
