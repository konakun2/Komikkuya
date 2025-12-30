const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// Sitemap.xml route
router.get('/sitemap.xml', async (req, res) => {
    try {
        const baseUrl = 'https://komikkuya.my.id';
        const now = new Date().toISOString();

        // Static pages
        const staticPages = [
            { url: '/', priority: '1.0', changefreq: 'daily' },
            { url: '/popular', priority: '0.9', changefreq: 'daily' },
            { url: '/latest', priority: '0.9', changefreq: 'hourly' },
            { url: '/genre', priority: '0.8', changefreq: 'weekly' },
            { url: '/doujin', priority: '0.7', changefreq: 'daily' },
            { url: '/nhentai', priority: '0.7', changefreq: 'daily' },
            { url: '/terms', priority: '0.3', changefreq: 'monthly' },
            { url: '/privacy', priority: '0.3', changefreq: 'monthly' },
            { url: '/dmca', priority: '0.3', changefreq: 'monthly' },
            { url: '/contact', priority: '0.4', changefreq: 'monthly' }
        ];

        // Fetch manga URLs from API
        let mangaUrls = [];

        try {
            // Fetch recommendations
            const recResponse = await fetch('https://komiku-api-self.vercel.app/api/custom');
            const recData = await recResponse.json();

            if (recData.success && recData.data) {
                recData.data.forEach(manga => {
                    if (manga.url) {
                        const match = manga.url.match(/\/manga\/([^/]+)/);
                        if (match && match[1]) {
                            mangaUrls.push({
                                url: `/manga/${match[1]}`,
                                priority: '0.8',
                                changefreq: 'daily'
                            });
                        }
                    }
                });
            }

            // Fetch popular manga, manhwa, manhua
            const categories = ['manga', 'manhwa', 'manhua'];
            for (const category of categories) {
                try {
                    const popResponse = await fetch(`https://komiku-api-self.vercel.app/api/popular?category=${category}&page=1`);
                    const popData = await popResponse.json();

                    if (popData.success && popData.data && popData.data.mangaList) {
                        popData.data.mangaList.forEach(manga => {
                            if (manga.url) {
                                const match = manga.url.match(/\/manga\/([^/]+)/);
                                if (match && match[1]) {
                                    const mangaPath = `/manga/${match[1]}`;
                                    if (!mangaUrls.find(m => m.url === mangaPath)) {
                                        mangaUrls.push({
                                            url: mangaPath,
                                            priority: '0.7',
                                            changefreq: 'daily'
                                        });
                                    }
                                }
                            }
                        });
                    }
                } catch (err) {
                    console.error(`Error fetching popular ${category}:`, err.message);
                }
            }

            // Fetch latest updates
            try {
                const latestResponse = await fetch('https://komiku-api-self.vercel.app/api/last-update?category=manga&page=1');
                const latestData = await latestResponse.json();

                if (latestData.success && latestData.data && latestData.data.mangaList) {
                    latestData.data.mangaList.forEach(manga => {
                        if (manga.url) {
                            const match = manga.url.match(/\/manga\/([^/]+)/);
                            if (match && match[1]) {
                                const mangaPath = `/manga/${match[1]}`;
                                if (!mangaUrls.find(m => m.url === mangaPath)) {
                                    mangaUrls.push({
                                        url: mangaPath,
                                        priority: '0.7',
                                        changefreq: 'hourly'
                                    });
                                }
                            }
                        }
                    });
                }
            } catch (err) {
                console.error('Error fetching latest:', err.message);
            }

        } catch (apiError) {
            console.error('Error fetching manga for sitemap:', apiError.message);
        }

        // Generate sitemap XML
        let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

        // Add static pages
        staticPages.forEach(page => {
            sitemap += `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
        });

        // Add manga pages
        mangaUrls.forEach(manga => {
            sitemap += `  <url>
    <loc>${baseUrl}${manga.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${manga.changefreq}</changefreq>
    <priority>${manga.priority}</priority>
  </url>
`;
        });

        sitemap += `</urlset>`;

        res.header('Content-Type', 'application/xml');
        res.header('Cache-Control', 'public, max-age=3600');
        res.send(sitemap);
    } catch (error) {
        console.error('Error generating sitemap:', error);
        res.status(500).send('Error generating sitemap');
    }
});

module.exports = router;

