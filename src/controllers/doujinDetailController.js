const { fetchJsonWithFallback } = require("../utils/apiFetch");

const DOUJIN_SITE = "https://komikdewasa.id";

const doujinDetailController = {
    detail: async (req, res) => {
        try {
            const { slug } = req.params;

            if (!slug) {
                return res.status(400).render('error', {
                    title: 'Error - Komikkuya',
                    error: 'Doujin slug is required'
                });
            }

            // Build URL for the API with fallback
            const doujinUrl = `${DOUJIN_SITE}/komik/${slug}/`;
            const json = await fetchJsonWithFallback(`/api/doujin/detail?url=${encodeURIComponent(doujinUrl)}`);

            if (!json.success || !json.data) {
                return res.status(404).render('error', {
                    title: 'Doujin Not Found - Komikkuya',
                    error: 'Unable to load doujin details.'
                });
            }

            const data = json.data;

            // Map chapters
            const chapters = (data.chapters || []).map(ch => ({
                title: ch.title || 'Chapter',
                slug: ch.slug || '',
                number: ch.number || 0,
                url: ch.url || ''
            }));

            const doujin = {
                title: data.title || 'Untitled',
                cover: data.cover || '/images/placeholder.jpg',
                description: data.description || '',
                type: data.type || 'Doujin',
                status: data.status || 'Unknown',
                author: data.author || 'Unknown',
                genres: data.genres || [],
                chapters: chapters,
                totalChapters: chapters.length,
                lastUpdate: data.lastUpdate || '-',
                slug: slug
            };

            return res.render('doujin/detail', {
                title: `${doujin.title} - Komikkuya`,
                metaDescription: `Baca ${doujin.title} di Komikkuya. Komik dewasa gratis tanpa iklan.`,
                doujin
            });

        } catch (error) {
            console.error('DoujinDetailController Error:', error);
            return res.status(500).render('error', {
                title: 'Error - Komikkuya',
                error: 'Failed to load doujin details.'
            });
        }
    }
};

module.exports = doujinDetailController;
