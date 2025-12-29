const fetch = require("node-fetch");

const API_BASE = "https://komiku-api-self.vercel.app";

class DoujinController {
    async index(req, res) {
        try {
            const pageNumber = Number(req.query.page) || 1;

            const apiUrl = `${API_BASE}/api/doujin/last-update?page=${pageNumber}`;

            const result = await fetch(apiUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                    "Accept": "application/json"
                }
            });

            const json = await result.json();

            if (!json.success || !json.data) {
                return res.status(500).render("error", {
                    title: "Error - Komikkuya",
                    message: "Unable to load doujin list.",
                    error: process.env.NODE_ENV === "development" ? json : {}
                });
            }

            const entries = json.data.results.map(item => ({
                title: item.title || "Untitled",
                slug: item.slug || "",
                imageUrl: item.imageUrl || "/images/placeholder.jpg",
                genres: item.genres || [],
                chapters: item.chapters || [],
                latestChapter: item.chapters && item.chapters[0] ? item.chapters[0].title : "-"
            }));

            const TOTAL_PAGES = 88; // Total known pages

            const pagination = {
                page: json.data.page || pageNumber,
                totalPages: TOTAL_PAGES,
                totalItems: json.data.totalResults || entries.length,
                prev: pageNumber > 1 ? pageNumber - 1 : null,
                next: pageNumber < TOTAL_PAGES ? pageNumber + 1 : null
            };

            return res.render("doujin/index", {
                title: "Doujin Update - Komikkuya",
                metaDescription: "Baca doujin terbaru di Komikkuya. Update harian komik dewasa gratis tanpa iklan.",
                items: entries,
                pagination
            });

        } catch (err) {
            console.error("DoujinController Error:", err);

            return res.status(500).render("error", {
                title: "Error - Komikkuya",
                message: "Error fetching doujin data.",
                error: process.env.NODE_ENV === "development" ? err : {}
            });
        }
    }
}

module.exports = new DoujinController();
