const fetch = require("node-fetch");

const API_BASE = "https://komiku-api-self.vercel.app";
const DOUJIN_SITE = "https://komikdewasa.id";

const DoujinChapterController = {
    read: async (req, res) => {
        try {
            const { slug } = req.params;
            const server = req.query.server || '1'; // Default to server 1

            if (!slug) {
                return res.status(400).render("error", {
                    title: "Error - Komikkuya",
                    error: "Chapter slug is required"
                });
            }

            let apiUrl;
            if (server === '2') {
                // Server 2: /api/doujin/v2/chapter?slug=SLUG
                apiUrl = `https://international.komikkuya.my.id/api/doujin/v2/chapter?slug=${slug}`;
            } else {
                // Server 1: /api/doujin/chapter?url=URL (default)
                const chapterUrl = `${DOUJIN_SITE}/baca/${slug}/`;
                apiUrl = `${API_BASE}/api/doujin/chapter?url=${encodeURIComponent(chapterUrl)}`;
            }

            const response = await fetch(apiUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                    "Accept": "application/json"
                }
            });

            const json = await response.json();

            if (!json.success || !json.data) {
                return res.status(404).render("error", {
                    title: "Chapter Not Found - Komikkuya",
                    error: "Unable to load doujin chapter. Try switching server."
                });
            }

            const data = json.data;

            // Build navigation with server param
            const navigation = {
                prev: data.prevChapter && data.prevChapter.slug
                    ? `/doujin/chapter/${data.prevChapter.slug}?server=${server}`
                    : null,
                next: data.nextChapter && data.nextChapter.slug
                    ? `/doujin/chapter/${data.nextChapter.slug}?server=${server}`
                    : null,
                mangaUrl: data.mangaSlug ? `/doujin/${data.mangaSlug}` : null
            };

            // Map images
            const images = (data.images || []).map(img => ({
                page: img.page || 0,
                url: img.url || "",
                alt: img.alt || `Page ${img.page}`
            }));

            return res.render("doujin/chapter", {
                title: `${data.mangaTitle || 'Doujin'} - ${data.chapterNumber || 'Chapter'} - Komikkuya`,
                metaDescription: `Baca ${data.mangaTitle} ${data.chapterNumber} di Komikkuya. Komik dewasa gratis tanpa iklan.`,
                mangaTitle: data.mangaTitle || "Doujin",
                mangaSlug: data.mangaSlug || "",
                chapterNumber: data.chapterNumber || "Chapter",
                chapterSlug: data.slug || slug,
                totalImages: data.totalImages || images.length,
                images,
                navigation,
                currentServer: server
            });

        } catch (error) {
            console.error("DoujinChapterController Error:", error);
            return res.status(500).render("error", {
                title: "Error - Komikkuya",
                error: "Failed to load doujin chapter."
            });
        }
    }
};

module.exports = DoujinChapterController;
