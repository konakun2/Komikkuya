const fetch = require('node-fetch');

const API_PRIMARY = 'https://international.komikkuya.my.id';
const API_SECONDARY = 'https://internationalbackup.komikkuya.my.id';
const API_FALLBACK = 'https://komiku-api-self.vercel.app';
const API_NETLIFY = 'https://komikkuyaapi.netlify.app';
const TIMEOUT_MS = 10000; // 10 seconds timeout

/**
 * Enhanced Fetch with Parallel Racing (Fixed)
 * Hits both primary and fallback simultaneously, returns the first successful one.
 * Ensures the winner is NOT aborted while the loser is.
 * @param {string} path - API path
 * @param {object} options - Fetch options
 * @returns {Promise<Response>}
 */
async function fetchWithFallback(path, options = {}) {
    const primaryController = new AbortController();
    const secondaryController = new AbortController();
    const fallbackController = new AbortController();
    const netlifyController = new AbortController();

    // Global timeout to abort EVERYTHING if it takes too long
    const timeoutId = setTimeout(() => {
        primaryController.abort();
        secondaryController.abort();
        fallbackController.abort();
        netlifyController.abort();
    }, TIMEOUT_MS);

    const racers = [
        { name: 'Primary', url: API_PRIMARY, controller: primaryController },
        { name: 'Secondary', url: API_SECONDARY, controller: secondaryController },
        { name: 'Vercel', url: API_FALLBACK, controller: fallbackController },
        { name: 'Netlify', url: API_NETLIFY, controller: netlifyController }
    ];

    const makeRequest = async (racer) => {
        const fetchOptions = {
            ...options,
            signal: racer.controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                ...options.headers
            }
        };

        try {
            const start = Date.now();
            const response = await fetch(`${racer.url}${path}`, fetchOptions);

            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status} from ${racer.name}`);
            }

            // SUCCESS! Abort the OTHER racers only
            console.log(`[API] ${racer.name} won the race in ${Date.now() - start}ms for ${path}`);
            racers.forEach(r => {
                if (r !== racer) r.controller.abort();
            });

            return response;
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.log(`[API] ${racer.name} lost or failed: ${error.message}`);
            }
            throw error;
        }
    };

    try {
        // Promise.any returns the first successful racer
        const result = await Promise.any(racers.map(makeRequest));
        clearTimeout(timeoutId);
        return result;
    } catch (error) {
        clearTimeout(timeoutId);

        // If all failed
        if (error.name === 'AggregateError') {
            console.error(`[API] All API sources failed for ${path}`);
            throw new Error(`All API sources failed for path: ${path}. Errors: ${error.errors.map(e => e.message).join(', ')}`);
        }

        throw error;
    }
}

/**
 * Legacy compatibility
 */
async function fetchFromFallback(path, options = {}) {
    return fetchWithFallback(path, options);
}

/**
 * Fetch JSON with racing support
 * @param {string} path - API path
 * @param {object} options - Fetch options
 * @returns {Promise<object>}
 */
async function fetchJsonWithFallback(path, options = {}) {
    try {
        const response = await fetchWithFallback(path, options);
        return await response.json();
    } catch (error) {
        console.error(`[API] Json Fetch Error: ${error.message}`);
        return {
            success: false,
            message: error.message,
            data: [] // Return empty array to prevent view crashes
        };
    }
}

module.exports = {
    API_PRIMARY,
    API_SECONDARY,
    API_FALLBACK,
    API_NETLIFY,
    fetchWithFallback,
    fetchFromFallback,
    fetchJsonWithFallback
};
