import { turso } from '@/lib/turso';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, chatId, role, content, createdAt } = body;

        if (!id || !chatId || !role || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await turso.execute({
            sql: 'INSERT INTO messages (id, chat_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)',
            args: [id, chatId, role, content, createdAt || Date.now()]
        });

        // Update chat updated_at
        await turso.execute({
            sql: 'UPDATE chats SET updated_at = ? WHERE id = ?',
            args: [Date.now(), chatId]
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to save message:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
