const fetch = require('node-fetch');

const API_BASE = "https://komiku-api-self.vercel.app";
const DOUJIN_SITE = "https://komikdewasa.id";

const doujinDetailController = {
    detail: async (req, res) => {
        try {
            const { slug } = req.params;

            if (!slug) {
                return res.status(400).render('error', {
                    title: 'Invalid Request - Komikkuya',
                    error: 'Slug tidak ditemukan'
                });
            }

            // Build URL for the API
            const doujinUrl = `${DOUJIN_SITE}/komik/${slug}/`;
            const apiUrl = `${API_BASE}/api/doujin/detail?url=${encodeURIComponent(doujinUrl)}`;

            const response = await fetch(apiUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                    "Accept": "application/json"
                }
            });

            const json = await response.json();

            if (!json.success || !json.data) {
                return res.status(404).render('error', {
                    title: 'Not Found - Komikkuya',
                    error: 'Doujin tidak ditemukan'
                });
            }

            const data = json.data;

            const doujin = {
                title: data.title || "Untitled",
                slug: data.slug || slug,
                cover: data.cover || "/images/placeholder.jpg",
                type: data.type || "Unknown",
                status: data.status || "Unknown",
                author: data.author || "Unknown",
                lastUpdate: data.lastUpdate || "-",
                genres: data.genres || [],
                description: data.description || "No description available.",
                url: data.url || "",
                totalChapters: data.totalChapters || 0,
                chapters: (data.chapters || []).map(ch => ({
                    number: ch.number || "",
                    title: ch.title || "",
                    slug: ch.slug || "",
                    url: ch.url || ""
                }))
            };

            return res.render('doujin/detail', {
                title: `${doujin.title} - Komikkuya`,
                metaDescription: `Baca ${doujin.title} di Komikkuya. ${doujin.description.substring(0, 150)}...`,
                doujin
            });

        } catch (error) {
            console.error('Error fetching doujin details:', error);

            return res.status(500).render('error', {
                title: 'Error - Komikkuya',
                error: 'Failed to load doujin details'
            });
        }
    }
};

module.exports = doujinDetailController;
