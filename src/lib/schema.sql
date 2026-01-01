-- =====================================================
-- UNPAYD DATABASE SCHEMA
-- =====================================================
-- This schema is designed for separation of concerns:
-- - User data (auth) is managed by Nhost (separate PostgreSQL database)
-- - Chat data (messages, preferences) is managed by Turso (SQLite)
-- =====================================================

-- =====================================================
-- CHAT DATA (Turso Database)
-- =====================================================

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT,
    model TEXT NOT NULL,
    archived INTEGER DEFAULT 0, -- boolean 0/1
    created_at INTEGER NOT NULL, -- timestamp
    updated_at INTEGER NOT NULL  -- timestamp
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    role TEXT NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL, -- timestamp
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

-- User preferences table (stored in Turso alongside chats)
CREATE TABLE IF NOT EXISTS user_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    name TEXT,
    profession TEXT,
    timezone TEXT,
    language TEXT,
    communication_style TEXT, -- 'formal', 'casual', 'technical', 'simple'
    interests TEXT, -- JSON array of interests
    custom_preferences TEXT, -- JSON object of custom key-value pairs
    top_topics TEXT, -- JSON array of frequently discussed topics
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Topic tracking for building user context
CREATE TABLE IF NOT EXISTS user_topics (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    last_used_at INTEGER NOT NULL,
    UNIQUE(user_id, topic)
);

-- File attachments metadata
CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    extracted_text TEXT, -- OCR or parsed text content
    storage_url TEXT, -- URL to file in storage
    created_at INTEGER NOT NULL,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_topics_user_id ON user_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_topics_count ON user_topics(count DESC);
CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments(message_id);

-- =====================================================
-- NOTE: User authentication data is handled by Nhost
-- =====================================================
-- Nhost manages:
-- - users table (auth.users)
-- - user sessions
-- - refresh tokens
-- - email verification
-- - password reset
-- 
-- This separation ensures:
-- 1. User auth data is in a managed PostgreSQL (Nhost)
-- 2. Chat/message data is in a separate SQLite (Turso)
-- 3. Better scalability and data isolation
-- =====================================================
