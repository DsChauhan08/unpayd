import { createClient, type Client } from '@libsql/client';

let tursoClient: Client | null = null;

export function getTursoClient(): Client {
    if (tursoClient) return tursoClient;

    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) {
        throw new Error('TURSO_DATABASE_URL is not defined');
    }

    if (!authToken) {
        throw new Error('TURSO_AUTH_TOKEN is not defined');
    }

    tursoClient = createClient({
        url,
        authToken,
    });

    return tursoClient;
}

// Legacy export for backwards compatibility - lazily initialized
export const turso = new Proxy({} as Client, {
    get(_, prop) {
        return (getTursoClient() as any)[prop];
    }
});
