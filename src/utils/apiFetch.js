const fetch = require('node-fetch');

const API_PRIMARY = 'https://komiku-api-self.vercel.app';
const API_FALLBACK = 'https://international.komikkuya.my.id';
const TIMEOUT_MS = 10000; // 10 seconds timeout

/**
 * Fetch with timeout and fallback support
 * @param {string} path - API path (e.g., '/api/custom')
 * @param {object} options - Fetch options
 * @returns {Promise<Response>}
 */
async function fetchWithFallback(path, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const fetchOptions = {
        ...options,
        signal: controller.signal,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            ...options.headers
        }
    };

    try {
        // Try primary API
        const response = await fetch(`${API_PRIMARY}${path}`, fetchOptions);
        clearTimeout(timeoutId);

        // Check for 504 Gateway Timeout
        if (response.status === 504) {
            console.log(`[API] Primary API returned 504 for ${path}, trying fallback...`);
            return await fetchFromFallback(path, options);
        }

        return response;
    } catch (error) {
        clearTimeout(timeoutId);

        // Check if it's a timeout error
        if (error.name === 'AbortError') {
            console.log(`[API] Primary API timeout for ${path}, trying fallback...`);
            return await fetchFromFallback(path, options);
        }

        // Other errors - try fallback
        console.log(`[API] Primary API error for ${path}: ${error.message}, trying fallback...`);
        return await fetchFromFallback(path, options);
    }
}

/**
 * Fetch from fallback API
 * @param {string} path - API path
 * @param {object} options - Fetch options
 * @returns {Promise<Response>}
 */
async function fetchFromFallback(path, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const fetchOptions = {
        ...options,
        signal: controller.signal,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            ...options.headers
        }
    };

    try {
        const response = await fetch(`${API_FALLBACK}${path}`, fetchOptions);
        clearTimeout(timeoutId);
        console.log(`[API] Fallback API success for ${path}`);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        console.error(`[API] Fallback API also failed for ${path}: ${error.message}`);
        throw error;
    }
}

/**
 * Fetch JSON with fallback support
 * @param {string} path - API path
 * @param {object} options - Fetch options
 * @returns {Promise<object>}
 */
async function fetchJsonWithFallback(path, options = {}) {
    const response = await fetchWithFallback(path, options);
    return await response.json();
}

module.exports = {
    API_PRIMARY,
    API_FALLBACK,
    fetchWithFallback,
    fetchFromFallback,
    fetchJsonWithFallback
};
