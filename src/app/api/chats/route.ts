import { getTursoClient } from '@/lib/turso';
import { NextResponse } from 'next/server';

// Use nodejs runtime for Turso compatibility
export const runtime = 'nodejs';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        try {
            const turso = getTursoClient();
            const result = await turso.execute({
                sql: 'SELECT * FROM chats WHERE user_id = ? AND archived = 0 ORDER BY updated_at DESC',
                args: [userId]
            });
            return NextResponse.json(result.rows);
        } catch (dbError) {
            // Turso not configured, return empty array
            console.warn('Turso not configured:', dbError);
            return NextResponse.json([]);
        }
    } catch (error) {
        console.error('Failed to fetch chats:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, userId, title, model, createdAt } = body;

        if (!id || !userId || !model) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        try {
            const turso = getTursoClient();
            const now = Date.now();
            await turso.execute({
                sql: 'INSERT INTO chats (id, user_id, title, model, archived, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)',
                args: [id, userId, title, model, createdAt || now, now]
            });
            return NextResponse.json({ success: true });
        } catch (dbError) {
            // Turso not configured, silently succeed
            console.warn('Turso not configured:', dbError);
            return NextResponse.json({ success: true });
        }
    } catch (error) {
        console.error('Failed to create chat:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
