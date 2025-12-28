const fetch = require('node-fetch');

class HomeController {
    async index(req, res) {
        try {
            // Fetch recommendations from API
            const response = await fetch('https://komiku-api-self.vercel.app/api/recommendations');
            const data = await response.json();

            if (!data.success) {
                return res.status(500).render('error', {
                    message: 'Failed to load home page',
                    error: process.env.NODE_ENV === 'development' ? data : {}
                });
            }

            // Fetch genres for the home page
            const genresResponse = await fetch('https://komiku-api-self.vercel.app/api/genres');
            const genresData = await genresResponse.json();

            if (!genresData.success) {
                return res.status(500).render('error', {
                    message: 'Failed to load genres',
                    error: process.env.NODE_ENV === 'development' ? genresData : {}
                });
            }

            // Process manga items to ensure URLs are valid
            const processedItems = data.data.map(item => {
                // Fix malformed URLs
                if (item.url && item.url.includes('https://komiku.idhttps://komiku.id')) {
                    item.url = item.url.replace('https://komiku.idhttps://komiku.id', 'https://komiku.id');
                }

                // Fix malformed image URLs
                if (item.imageUrl && item.imageUrl.includes('undefined')) {
                    item.imageUrl = '/images/placeholder.jpg';
                }

                return item;
            });

            // Get top 5 genres for the home page
            const topGenres = genresData.data.slice(0, 5);

            return res.render('index', {
                title: 'Komikkuya - Baca & Read Komik Gratis Online | Manga, Manhwa, Manhua Chapter Terbaru',
                metaDescription: 'Baca komik gratis online di Komikkuya! Read manga chapter terbaru, genres lengkap: aksi, fantasi, romantis. Koleksi manga, manhwa, manhua update setiap hari tanpa iklan!',
                metaKeywords: 'baca komik gratis, manga online, manhwa indonesia, manhua terbaru, komik lengkap, baca manga gratis, baca manhwa gratis, webtoon indonesia, read manga, chapter terbaru, genres komik, aksi, fantasi, romantis, isekai, solo leveling, one piece, naruto, demon slayer, jujutsu kaisen, attack on titan, blue lock, chainsaw man, spy x family, manga terbaru 2025, manhwa terbaru 2025, manga terbaru 2026, komikkuya, komik online gratis, baca komik tanpa iklan',
                canonicalUrl: 'https://komikkuya.my.id/',
                currentPath: '/',
                recommendations: processedItems,
                genres: topGenres
            });
        } catch (error) {
            console.error('Error in home controller:', error);
            return res.status(500).render('error', {
                message: 'Failed to load home page',
                error: process.env.NODE_ENV === 'development' ? error : {}
            });
        }
    }
}

module.exports = new HomeController(); 
