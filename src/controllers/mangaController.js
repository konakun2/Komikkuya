const { fetchWithFallback, fetchJsonWithFallback } = require('../utils/apiFetch');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

/**
 * Manga Controller
 * Handles manga detail pages from multiple sources:
 * - Komiku API (Indonesian manga from komiku.id)
 * - Asia API (Korean/Chinese manga from westmanga.me)
 * - International API (English manga from weebcentral.com)
 */
const mangaController = {
    detail: async (req, res) => {
        try {
            const { slug } = req.params;

            // First try Komiku API with fallback
            const komikuUrl = `https://komiku.id/manga/${slug}/`;
            let data = await fetchJsonWithFallback(`/api/manga?url=${encodeURIComponent(komikuUrl)}`);

            // Check if Komiku API returned valid data
            let sourceType = 'komiku';
            if (!data || !data.title || data.error) {
                // Try Asia API with fallback
                const asiaUrl = `https://westmanga.me/comic/${slug}`;
                const asiaData = await fetchJsonWithFallback(`/api/asia/detail?url=${encodeURIComponent(asiaUrl)}`);

                if (asiaData.success && asiaData.data && asiaData.data.title) {
                    sourceType = 'asia';
                    // Normalize Asia API response to match Komiku format
                    data = {
                        title: asiaData.data.title,
                        alternativeTitle: asiaData.data.alternativeTitle,
                        description: asiaData.data.description,
                        coverImage: asiaData.data.cover,
                        type: asiaData.data.type || 'Manhwa',
                        status: asiaData.data.status,
                        author: asiaData.data.author,
                        genres: asiaData.data.genres || [],
                        chapters: (asiaData.data.chapters || []).map(ch => ({
                            title: ch.title,
                            url: ch.url,
                            date: ch.date,
                            readers: 0
                        })),
                        source: 'asia',
                        originalUrl: asiaData.data.url
                    };
                } else {
                    // Try International API (weebcentral.com)
                    // International uses seriesId in URL, so we need to search first
                    const intlSearchResponse = await fetch(`https://international.komikkuya.my.id/api/international/search?q=${encodeURIComponent(slug.replace(/-/g, ' '))}`);
                    const intlSearchData = await intlSearchResponse.json();

                    if (intlSearchData.success && intlSearchData.data && intlSearchData.data.results && intlSearchData.data.results.length > 0) {
                        // Find exact match or use first result
                        const matchedManga = intlSearchData.data.results.find(r =>
                            r.slug?.toLowerCase() === slug.toLowerCase() ||
                            r.title?.toLowerCase().replace(/[^a-z0-9]/g, '-') === slug.toLowerCase()
                        ) || intlSearchData.data.results[0];

                        if (matchedManga) {
                            const intlDetailResponse = await fetch(`https://international.komikkuya.my.id/api/international/detail?url=${encodeURIComponent(matchedManga.url)}`);
                            const intlData = await intlDetailResponse.json();

                            if (intlData.success && intlData.data && intlData.data.title) {
                                sourceType = 'international';
                                // Normalize International API response
                                data = {
                                    title: intlData.data.title.replace(/(.+)\1/, '$1'), // Fix duplicate title bug
                                    alternativeTitle: null,
                                    description: intlData.data.description,
                                    coverImage: intlData.data.cover,
                                    type: intlData.data.type || 'Manga',
                                    status: intlData.data.status,
                                    author: intlData.data.authors?.join(', ') || 'Unknown',
                                    genres: intlData.data.tags || [],
                                    chapters: (intlData.data.chapters || []).map(ch => ({
                                        title: ch.title,
                                        url: ch.url,
                                        date: ch.date ? new Date(ch.date).toLocaleDateString('id-ID') : '',
                                        readers: 0,
                                        chapterId: ch.id
                                    })),
                                    source: 'international',
                                    seriesId: intlData.data.seriesId,
                                    originalUrl: intlData.data.url
                                };
                            }
                        }
                    }

                    if (!data || !data.title) {
                        throw new Error('Manga not found in all sources');
                    }
                }
            }

            // Truncate description for meta
            const truncatedDesc = data.description ?
                data.description.substring(0, 155).replace(/\s+/g, ' ').trim() + '...' :
                `Baca ${data.title} online gratis di Komikkuya`;

            // Create JSON-LD for manga
            const jsonLd = {
                "@context": "https://schema.org",
                "@type": "ComicSeries",
                "name": data.title,
                "alternateName": data.alternativeTitle || undefined,
                "description": data.description || `Baca ${data.title} online gratis`,
                "author": {
                    "@type": "Person",
                    "name": data.author || "Unknown"
                },
                "genre": data.genres || [],
                "inLanguage": sourceType === 'international' ? 'en' : 'id-ID',
                "image": data.coverImage,
                "url": `https://komikkuya.my.id/manga/${slug}`
            };

            return res.render('manga/detail', {
                title: `${data.title} - Baca Komik Gratis | Komikkuya`,
                metaDescription: truncatedDesc,
                metaKeywords: `${data.title}, ${(data.genres || []).join(', ')}, baca ${data.title}, baca ${data.title} gratis, baca ${data.title} online, read ${data.title}, read ${data.title} free, read ${data.title} online, manga ${data.title}, komik ${data.title}, manhwa ${data.title}, manhua ${data.title}, ${data.title} bahasa indonesia, ${data.title} sub indo, ${data.title} indo, ${data.title} terjemahan indonesia, ${data.title} translate indonesia, ${data.title} chapter lengkap, ${data.title} full chapter, ${data.title} chapter terbaru, ${data.title} update terbaru, ${data.title} all chapter, ${data.title} semua chapter, download ${data.title}, sinopsis ${data.title}, cerita ${data.title}, review ${data.title}, rating ${data.title}, ${data.title} tamat, ${data.title} completed, ${data.title} ongoing, ${data.title} komikkuya, komikkuya ${data.title}, baca manga ${data.title} gratis, baca komik ${data.title} gratis, ${data.title} 2025, ${data.title} 2026, ${data.title} terbaru`,
                ogImage: data.coverImage,
                ogType: 'book',
                canonicalUrl: `https://komikkuya.my.id/manga/${slug}`,
                currentPath: `/manga/${slug}`,
                jsonLd: jsonLd,
                breadcrumbs: [
                    { name: 'Home', url: 'https://komikkuya.my.id/' },
                    { name: 'Manga', url: 'https://komikkuya.my.id/popular' },
                    { name: data.title, url: `https://komikkuya.my.id/manga/${slug}` }
                ],
                manga: data,
                slug: slug,
                sourceType: sourceType
            });
        } catch (error) {
            console.error('Error fetching manga details:', error);
            res.status(500).render('error', {
                title: 'Error - Komikkuya',
                error: 'Failed to load manga details'
            });
        }
    },

    proxyImage: async (req, res) => {
        try {
            const { imageId } = req.params;

            if (!imageId) {
                return res.status(400).json({ success: false, message: 'Image ID is required' });
            }

            // First decode the base64 URL - we'll use this as fallback if proxy fails
            let originalUrl;
            try {
                originalUrl = Buffer.from(imageId, 'base64').toString('utf-8');
            } catch (error) {
                console.error('Error decoding base64 URL:', error);
                return res.status(400).json({ success: false, message: 'Invalid image ID format' });
            }

            // Try to proxy the image
            try {
                const urlObj = new URL(originalUrl);
                const proxyUrl = urlObj.origin + urlObj.pathname + urlObj.search;

                // Determine referer based on image source
                let referer = 'https://komiku.id/';
                if (originalUrl.includes('westmanga') || originalUrl.includes('storage.westmanga')) {
                    referer = 'https://westmanga.me/';
                } else if (originalUrl.includes('weebcentral') || originalUrl.includes('planeptune') || originalUrl.includes('compsci88')) {
                    referer = 'https://weebcentral.com/';
                }

                const response = await fetch(proxyUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Connection': 'keep-alive',
                        'Referer': referer
                    }
                });

                if (!response.ok) {
                    console.error('Failed to fetch image:', {
                        url: proxyUrl,
                        status: response.status,
                        statusText: response.statusText
                    });
                    // If proxy fails, redirect to original URL
                    return res.redirect(originalUrl);
                }

                // Get content type and buffer
                const contentType = response.headers.get('content-type') || 'image/jpeg';
                const buffer = await response.buffer();

                // Set response headers
                res.setHeader('Content-Type', contentType);
                res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
                res.setHeader('X-Content-Type-Options', 'nosniff');
                res.setHeader('X-Frame-Options', 'DENY');
                res.setHeader('Referrer-Policy', 'no-referrer');

                // Send the image
                res.send(buffer);
            } catch (error) {
                console.error('Error fetching image:', error);
                // If any error occurs, redirect to original URL
                return res.redirect(originalUrl);
            }
        } catch (error) {
            console.error('Error in proxyImage:', error);
            // If all else fails, try to use the original URL
            return res.status(500).json({
                success: false,
                message: 'Error proxying image',
                error: error.message
            });
        }
    }
};

// Helper function to serve default image
function serveDefaultImage(res) {
    try {
        // Path to default image in public folder
        const defaultImagePath = path.join(__dirname, '../public/images/placeholder.jpg');

        // Check if default image exists
        if (fs.existsSync(defaultImagePath)) {
            const defaultImage = fs.readFileSync(defaultImagePath);
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            return res.send(defaultImage);
        } else {
            // If default image doesn't exist, return a 404
            return res.status(404).json({
                success: false,
                message: 'Image not found and no default image available'
            });
        }
    } catch (error) {
        console.error('Error serving default image:', error);
        return res.status(500).json({
            success: false,
            message: 'Error serving default image'
        });
    }
}

module.exports = mangaController;
