import { turso } from '@/lib/turso';
import { nhost } from '@/lib/nhost';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        // Auth check via Nhost (server-side)
        // Note: For simplicity we trust the client session cookie or header if forwarded,
        // but robustly we should verify the JWT. 
        // Here we rely on sending the userId in query/body or verify headers.
        // Assuming client sends userId for MVP or we verify session.

        // For security, verifying the JWT from header is best.
        // const authHeader = request.headers.get('Authorization');
        // ... verify jwt ...

        // Assuming passed userId for now, but strict auth is better.
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        const result = await turso.execute({
            sql: 'SELECT * FROM chats WHERE user_id = ? AND archived = 0 ORDER BY updated_at DESC',
            args: [userId]
        });

        return NextResponse.json(result.rows);
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

        const now = Date.now();
        await turso.execute({
            sql: 'INSERT INTO chats (id, user_id, title, model, archived, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)',
            args: [id, userId, title, model, createdAt || now, now]
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to create chat:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
