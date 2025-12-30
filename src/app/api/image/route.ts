// Image Generation API
// Primary: Hugging Face Inference API with Stable Diffusion XL (free tier)
// Fallback: Pollinations.ai (completely free, no API key needed)

export const runtime = 'nodejs';
export const maxDuration = 60;

// Hugging Face API key - free tier available
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { prompt } = body as { prompt: string };

        if (!prompt) {
            return new Response(
                JSON.stringify({ error: 'Prompt is required' }), 
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Try Hugging Face Inference API first (if API key available)
        if (HF_API_KEY) {
            try {
                console.log('[Image API] Trying Hugging Face Inference API...');
                
                const response = await fetch(
                    'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${HF_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            inputs: prompt,
                            parameters: {
                                width: 1024,
                                height: 1024,
                            }
                        }),
                    }
                );

                if (response.ok) {
                    const imageBlob = await response.blob();
                    const arrayBuffer = await imageBlob.arrayBuffer();
                    const base64 = Buffer.from(arrayBuffer).toString('base64');
                    const imageUrl = `data:image/png;base64,${base64}`;

                    console.log('[Image API] HuggingFace success!');
                    return new Response(
                        JSON.stringify({ 
                            success: true,
                            imageUrl,
                            prompt,
                            provider: 'huggingface'
                        }), 
                        { status: 200, headers: { 'Content-Type': 'application/json' } }
                    );
                }

                // Check if model is loading
                const errorData = await response.json().catch(() => ({}));
                if (errorData.error?.includes('loading')) {
                    console.log('[Image API] Model is loading, falling back to Pollinations...');
                } else {
                    console.error('[Image API] HuggingFace error:', errorData);
                }
            } catch (hfError) {
                console.error('[Image API] HuggingFace failed:', hfError);
            }
        }

        // Fallback to Pollinations.ai (completely free, no API key)
        console.log('[Image API] Using Pollinations.ai fallback...');
        const encodedPrompt = encodeURIComponent(prompt);
        const seed = Math.floor(Math.random() * 1000000);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true`;

        return new Response(
            JSON.stringify({ 
                success: true,
                imageUrl,
                prompt,
                provider: 'pollinations'
            }), 
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('[Image API] Error:', error);
        return new Response(
            JSON.stringify({ error: error?.message || 'Image generation failed' }), 
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
