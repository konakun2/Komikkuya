const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const mangaController = {
    detail: async (req, res) => {
        try {
            const { slug } = req.params;
            const mangaUrl = `https://komiku.id/manga/${slug}/`;
            const response = await fetch(`https://komiku-api-self.vercel.app/api/manga?url=${encodeURIComponent(mangaUrl)}`);
            const data = await response.json();

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
                "inLanguage": "id-ID",
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
                manga: data
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

                const response = await fetch(proxyUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Connection': 'keep-alive',
                        'Referer': 'https://komiku.id/'
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
