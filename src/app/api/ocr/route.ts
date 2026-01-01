import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface OCRResult {
    success: boolean;
    text: string;
    error?: string;
    method: string;
}

// Use free OCR.space API for text extraction
async function ocrSpaceExtract(imageBase64: string, mimeType: string): Promise<OCRResult> {
    const apiKey = process.env.OCR_SPACE_API_KEY || 'helloworld'; // Free tier key
    
    try {
        // Prepare the base64 data URL
        const base64Data = imageBase64.includes('base64,') 
            ? imageBase64 
            : `data:${mimeType};base64,${imageBase64}`;

        const formData = new FormData();
        formData.append('base64Image', base64Data);
        formData.append('language', 'eng');
        formData.append('isOverlayRequired', 'false');
        formData.append('detectOrientation', 'true');
        formData.append('scale', 'true');
        formData.append('OCREngine', '2'); // Use OCR Engine 2 for better accuracy

        const response = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            headers: {
                'apikey': apiKey,
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`OCR.space API error: ${response.status}`);
        }

        const result = await response.json();

        if (result.IsErroredOnProcessing) {
            throw new Error(result.ErrorMessage?.[0] || 'OCR processing failed');
        }

        const text = result.ParsedResults
            ?.map((r: any) => r.ParsedText)
            .join('\n')
            .trim() || '';

        return {
            success: true,
            text,
            method: 'ocr.space',
        };
    } catch (error) {
        console.error('OCR.space error:', error);
        return {
            success: false,
            text: '',
            error: error instanceof Error ? error.message : 'OCR failed',
            method: 'ocr.space',
        };
    }
}

// Use vision model for OCR as fallback
async function visionModelOCR(imageBase64: string, mimeType: string): Promise<OCRResult> {
    try {
        // Make request to our own chat API with vision model
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'vision',
                messages: [{
                    role: 'user',
                    parts: [
                        { type: 'text', text: 'Please extract and transcribe ALL text visible in this image. Return ONLY the extracted text, nothing else. If there are tables, preserve the structure. If there are multiple columns, read left to right.' },
                        { type: 'file', mimeType, url: imageBase64 }
                    ]
                }]
            }),
        });

        if (!response.ok) {
            throw new Error('Vision model request failed');
        }

        // Parse streaming response
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let text = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            // Extract text from UI message stream format
            const matches = chunk.match(/"text":"([^"]*)"/g);
            if (matches) {
                matches.forEach(m => {
                    const extracted = m.match(/"text":"([^"]*)"/);
                    if (extracted?.[1]) {
                        text += extracted[1];
                    }
                });
            }
        }

        return {
            success: true,
            text: text.trim(),
            method: 'vision-model',
        };
    } catch (error) {
        console.error('Vision model OCR error:', error);
        return {
            success: false,
            text: '',
            error: error instanceof Error ? error.message : 'Vision OCR failed',
            method: 'vision-model',
        };
    }
}

// Extract text from PDF using pdf-parse or similar
async function extractPdfText(base64Data: string): Promise<OCRResult> {
    try {
        // For now, we'll use OCR on PDF pages
        // In production, you could use pdf-parse library
        return {
            success: false,
            text: '',
            error: 'PDF text extraction requires server-side processing. Please upload images or use copy-paste.',
            method: 'pdf-extract',
        };
    } catch (error) {
        return {
            success: false,
            text: '',
            error: 'PDF extraction failed',
            method: 'pdf-extract',
        };
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { file, mimeType, method = 'auto' } = body as {
            file: string; // base64 encoded file
            mimeType: string;
            method?: 'ocr' | 'vision' | 'auto';
        };

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        console.log(`[OCR API] Processing file, type: ${mimeType}, method: ${method}`);

        // Handle different file types
        if (mimeType === 'application/pdf') {
            const result = await extractPdfText(file);
            return NextResponse.json(result);
        }

        // For images, use OCR
        if (mimeType.startsWith('image/')) {
            let result: OCRResult;

            if (method === 'vision') {
                result = await visionModelOCR(file, mimeType);
            } else if (method === 'ocr') {
                result = await ocrSpaceExtract(file, mimeType);
            } else {
                // Auto: try OCR first, fallback to vision
                result = await ocrSpaceExtract(file, mimeType);
                
                // If OCR fails or returns empty, try vision model
                if (!result.success || !result.text.trim()) {
                    console.log('[OCR API] OCR.space failed or empty, trying vision model');
                    result = await visionModelOCR(file, mimeType);
                }
            }

            return NextResponse.json(result);
        }

        // For text files, just decode
        if (mimeType.startsWith('text/') || mimeType === 'application/json') {
            try {
                const text = Buffer.from(file.split(',')[1] || file, 'base64').toString('utf-8');
                return NextResponse.json({
                    success: true,
                    text,
                    method: 'decode',
                });
            } catch {
                return NextResponse.json({
                    success: false,
                    text: '',
                    error: 'Failed to decode text file',
                    method: 'decode',
                });
            }
        }

        return NextResponse.json({
            success: false,
            text: '',
            error: `Unsupported file type: ${mimeType}`,
            method: 'none',
        });

    } catch (error) {
        console.error('[OCR API] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error', text: '', method: 'error' },
            { status: 500 }
        );
    }
}
