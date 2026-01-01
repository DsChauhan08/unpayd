import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Whisper API transcription using OpenAI-compatible endpoint
// Can use OpenAI, Groq, or local Whisper

interface TranscriptionResult {
    success: boolean;
    text: string;
    error?: string;
    duration?: number;
    language?: string;
}

async function transcribeWithGroq(audioBlob: Blob): Promise<TranscriptionResult> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return { success: false, text: '', error: 'GROQ_API_KEY not configured' };
    }

    try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('model', 'whisper-large-v3-turbo');
        formData.append('language', 'en');
        formData.append('response_format', 'json');

        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Groq API error: ${error}`);
        }

        const result = await response.json();

        return {
            success: true,
            text: result.text || '',
            duration: result.duration,
            language: result.language,
        };
    } catch (error) {
        console.error('Groq transcription error:', error);
        return {
            success: false,
            text: '',
            error: error instanceof Error ? error.message : 'Transcription failed',
        };
    }
}

async function transcribeWithOpenAI(audioBlob: Blob): Promise<TranscriptionResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return { success: false, text: '', error: 'OPENAI_API_KEY not configured' };
    }

    try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('model', 'whisper-1');
        formData.append('language', 'en');
        formData.append('response_format', 'json');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI API error: ${error}`);
        }

        const result = await response.json();

        return {
            success: true,
            text: result.text || '',
            duration: result.duration,
            language: result.language,
        };
    } catch (error) {
        console.error('OpenAI transcription error:', error);
        return {
            success: false,
            text: '',
            error: error instanceof Error ? error.message : 'Transcription failed',
        };
    }
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get('audio') as Blob | null;
        const provider = formData.get('provider') as string || 'auto';

        if (!audioFile) {
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
        }

        console.log(`[Transcribe API] Processing audio, size: ${audioFile.size}, type: ${audioFile.type}`);

        let result: TranscriptionResult;

        if (provider === 'openai') {
            result = await transcribeWithOpenAI(audioFile);
        } else if (provider === 'groq') {
            result = await transcribeWithGroq(audioFile);
        } else {
            // Auto: Try Groq first (faster, free tier), then OpenAI
            result = await transcribeWithGroq(audioFile);
            
            if (!result.success) {
                console.log('[Transcribe API] Groq failed, trying OpenAI');
                result = await transcribeWithOpenAI(audioFile);
            }
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error('[Transcribe API] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error', text: '' },
            { status: 500 }
        );
    }
}
