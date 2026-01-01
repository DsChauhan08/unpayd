// Web Search functionality using Brave Search API or fallback
// Provides real-time web search results to augment LLM responses

export interface SearchResult {
    title: string;
    url: string;
    description: string;
}

export interface WebSearchResponse {
    success: boolean;
    results: SearchResult[];
    query: string;
    error?: string;
}

// Brave Search API (Free tier available)
async function braveSearch(query: string): Promise<SearchResult[]> {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    if (!apiKey) {
        console.warn('BRAVE_SEARCH_API_KEY not configured');
        return [];
    }

    try {
        const response = await fetch(
            `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
            {
                headers: {
                    'Accept': 'application/json',
                    'X-Subscription-Token': apiKey,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Brave Search failed: ${response.status}`);
        }

        const data = await response.json();
        
        return (data.web?.results || []).slice(0, 5).map((result: any) => ({
            title: result.title || '',
            url: result.url || '',
            description: result.description || '',
        }));
    } catch (error) {
        console.error('Brave Search error:', error);
        return [];
    }
}

// SearXNG search (self-hosted or public instances)
async function searxngSearch(query: string): Promise<SearchResult[]> {
    const searxngUrl = process.env.SEARXNG_URL || 'https://searx.be';
    
    try {
        const response = await fetch(
            `${searxngUrl}/search?q=${encodeURIComponent(query)}&format=json&categories=general`,
            {
                headers: {
                    'Accept': 'application/json',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`SearXNG failed: ${response.status}`);
        }

        const data = await response.json();
        
        return (data.results || []).slice(0, 5).map((result: any) => ({
            title: result.title || '',
            url: result.url || '',
            description: result.content || result.description || '',
        }));
    } catch (error) {
        console.error('SearXNG error:', error);
        return [];
    }
}

// DuckDuckGo Instant Answers (no API key needed, limited results)
async function duckDuckGoSearch(query: string): Promise<SearchResult[]> {
    try {
        const response = await fetch(
            `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`,
            {
                headers: {
                    'Accept': 'application/json',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`DuckDuckGo failed: ${response.status}`);
        }

        const data = await response.json();
        const results: SearchResult[] = [];

        // Abstract (main result)
        if (data.AbstractText) {
            results.push({
                title: data.Heading || 'Summary',
                url: data.AbstractURL || '',
                description: data.AbstractText,
            });
        }

        // Related topics
        if (data.RelatedTopics) {
            for (const topic of data.RelatedTopics.slice(0, 4)) {
                if (topic.Text && topic.FirstURL) {
                    results.push({
                        title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 50),
                        url: topic.FirstURL,
                        description: topic.Text,
                    });
                }
            }
        }

        return results.slice(0, 5);
    } catch (error) {
        console.error('DuckDuckGo error:', error);
        return [];
    }
}

// Main search function with fallback chain
export async function performWebSearch(query: string): Promise<WebSearchResponse> {
    console.log(`[WebSearch] Searching for: "${query}"`);

    // Try providers in order - DuckDuckGo first since it needs no API key
    let results: SearchResult[] = [];

    // 1. Try DuckDuckGo first (no API key needed, always available)
    results = await duckDuckGoSearch(query);
    if (results.length > 0) {
        console.log(`[WebSearch] Got ${results.length} results from DuckDuckGo`);
        return { success: true, results, query };
    }

    // 2. Try SearXNG (privacy-focused, public instances)
    results = await searxngSearch(query);
    if (results.length > 0) {
        console.log(`[WebSearch] Got ${results.length} results from SearXNG`);
        return { success: true, results, query };
    }

    // 3. Try Brave Search if API key is configured (best quality but paid)
    if (process.env.BRAVE_SEARCH_API_KEY) {
        results = await braveSearch(query);
        if (results.length > 0) {
            console.log(`[WebSearch] Got ${results.length} results from Brave`);
            return { success: true, results, query };
        }
    }

    console.log('[WebSearch] No results from any provider');
    return { 
        success: false, 
        results: [], 
        query,
        error: 'No search results found' 
    };
}

// Format search results for the LLM context
export function formatSearchResultsForLLM(searchResponse: WebSearchResponse): string {
    if (!searchResponse.success || searchResponse.results.length === 0) {
        return '';
    }

    const formattedResults = searchResponse.results
        .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.description}`)
        .join('\n\n');

    return `\n---\nWeb Search Results for "${searchResponse.query}":\n\n${formattedResults}\n---\n`;
}
