import { getTursoClient } from '@/lib/turso';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// GET user preferences
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        try {
            const turso = getTursoClient();
            
            // Get preferences
            const prefsResult = await turso.execute({
                sql: 'SELECT * FROM user_preferences WHERE user_id = ?',
                args: [userId]
            });

            if (prefsResult.rows.length === 0) {
                return NextResponse.json({ preferences: null });
            }

            const row = prefsResult.rows[0];
            
            // Get top topics
            const topicsResult = await turso.execute({
                sql: 'SELECT topic FROM user_topics WHERE user_id = ? ORDER BY count DESC LIMIT 10',
                args: [userId]
            });

            const preferences = {
                userId: row.user_id,
                name: row.name,
                profession: row.profession,
                timezone: row.timezone,
                language: row.language,
                communicationStyle: row.communication_style,
                interests: row.interests ? JSON.parse(row.interests as string) : [],
                customPreferences: row.custom_preferences ? JSON.parse(row.custom_preferences as string) : {},
                topTopics: topicsResult.rows.map(r => r.topic as string),
                updatedAt: row.updated_at,
            };

            return NextResponse.json({ preferences });
        } catch (dbError) {
            console.warn('Turso not configured:', dbError);
            return NextResponse.json({ preferences: null });
        }
    } catch (error) {
        console.error('Failed to fetch preferences:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST/PUT user preferences
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { 
            userId, 
            name, 
            profession, 
            timezone, 
            language, 
            communicationStyle,
            interests,
            customPreferences 
        } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        try {
            const turso = getTursoClient();
            const now = Date.now();

            // Upsert preferences
            await turso.execute({
                sql: `INSERT INTO user_preferences 
                      (id, user_id, name, profession, timezone, language, communication_style, interests, custom_preferences, created_at, updated_at)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                      ON CONFLICT(user_id) DO UPDATE SET
                        name = excluded.name,
                        profession = excluded.profession,
                        timezone = excluded.timezone,
                        language = excluded.language,
                        communication_style = excluded.communication_style,
                        interests = excluded.interests,
                        custom_preferences = excluded.custom_preferences,
                        updated_at = excluded.updated_at`,
                args: [
                    crypto.randomUUID(),
                    userId,
                    name || null,
                    profession || null,
                    timezone || null,
                    language || null,
                    communicationStyle || null,
                    interests ? JSON.stringify(interests) : null,
                    customPreferences ? JSON.stringify(customPreferences) : null,
                    now,
                    now
                ]
            });

            return NextResponse.json({ success: true });
        } catch (dbError) {
            console.warn('Turso not configured:', dbError);
            return NextResponse.json({ success: true }); // Silently succeed
        }
    } catch (error) {
        console.error('Failed to save preferences:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Track a topic
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { userId, topic } = body;

        if (!userId || !topic) {
            return NextResponse.json({ error: 'User ID and topic required' }, { status: 400 });
        }

        try {
            const turso = getTursoClient();
            const now = Date.now();

            // Upsert topic count
            await turso.execute({
                sql: `INSERT INTO user_topics (id, user_id, topic, count, last_used_at)
                      VALUES (?, ?, ?, 1, ?)
                      ON CONFLICT(user_id, topic) DO UPDATE SET
                        count = count + 1,
                        last_used_at = excluded.last_used_at`,
                args: [crypto.randomUUID(), userId, topic.toLowerCase(), now]
            });

            return NextResponse.json({ success: true });
        } catch (dbError) {
            console.warn('Turso not configured:', dbError);
            return NextResponse.json({ success: true });
        }
    } catch (error) {
        console.error('Failed to track topic:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
