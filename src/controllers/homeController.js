const { fetchJsonWithFallback } = require('../utils/apiFetch');
const fetch = require('node-fetch');

// Server-side memory cache
let serverCache = {
    data: null,
    timestamp: 0
};
const SERVER_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

class HomeController {
    async index(req, res) {
        try {
            // Check if client requests cache skip
            const skipCache = req.query.refresh === 'true';

            // Check server-side cache first
            const now = Date.now();
            const cacheAge = now - serverCache.timestamp;
            const cacheValid = !skipCache && serverCache.data && cacheAge < SERVER_CACHE_DURATION;

            if (cacheValid) {
                console.log(`📦 Serving homepage from server cache (age: ${Math.floor(cacheAge / 60000)} min)`);
                return res.render('index', {
                    ...serverCache.data,
                    fromCache: true,
                    cacheAge: Math.floor(cacheAge / 60000)
                });
            }

            console.log('🔄 Fetching fresh homepage data from API...');

            // Fetch all data in parallel for better performance
            const [recommendationsData, genresData, hotData, latestMangaData, latestManhwaData, latestManhuaData, internationalLatestData, popularDailyData, popularWeeklyData, popularAllData] = await Promise.all([
                fetchJsonWithFallback('/api/custom'),
                fetchJsonWithFallback('/api/genres'),
                fetchJsonWithFallback('/api/hot?page=1'),
                fetchJsonWithFallback('/api/last-update?category=manga&page=1'),
                fetchJsonWithFallback('/api/last-update?category=manhwa&page=1'),
                fetchJsonWithFallback('/api/last-update?category=manhua&page=1'),
                // Fetch international last-update
                fetch('https://internationalbackup.komikkuya.my.id/api/international/last-update?page=1')
                    .then(res => res.json())
                    .catch(() => ({ success: false, data: { results: [] } })),
                fetchJsonWithFallback('/api/popular?category=manga&page=1&sorttime=daily'),
                fetchJsonWithFallback('/api/popular?category=manga&page=1&sorttime=weekly'),
                fetchJsonWithFallback('/api/popular?category=manga&page=1&sorttime=all')
            ]);

            if (!recommendationsData.success) {
                return res.status(500).render('error', {
                    message: 'Failed to load home page',
                    error: process.env.NODE_ENV === 'development' ? recommendationsData : {}
                });
            }

            // Process recommendations
            const processedRecommendations = recommendationsData.data.map(item => {
                if (item.url && item.url.includes('https://komiku.idhttps://komiku.id')) {
                    item.url = item.url.replace('https://komiku.idhttps://komiku.id', 'https://komiku.id');
                }
                if (item.imageUrl && item.imageUrl.includes('undefined')) {
                    item.imageUrl = '/images/placeholder.jpg';
                }
                return item;
            });

            // Process hot manga (for Project Update)
            const hotManga = hotData.success && hotData.data?.mangaList
                ? hotData.data.mangaList.map(item => {
                    if (item.url && item.url.includes('https://komiku.org/https://komiku.org')) {
                        item.url = item.url.replace('https://komiku.org/https://komiku.org', 'https://komiku.org');
                    }
                    return item;
                })
                : [];

            // Helper function to process Komiku latest data
            const processKomikuLatest = (data, category) => {
                if (!data.success || !data.data?.mangaList) return [];
                return data.data.mangaList.slice(0, 6).map(item => {
                    if (item.url && item.url.includes('https://komiku.idhttps://komiku.id')) {
                        item.url = item.url.replace('https://komiku.idhttps://komiku.id', 'https://komiku.id');
                    }
                    // Parse timeAgo to approximate timestamp for sorting
                    let timestamp = Date.now();
                    const timeAgo = item.stats?.timeAgo || '';
                    if (timeAgo.includes('jam')) {
                        const hours = parseInt(timeAgo) || 1;
                        timestamp = Date.now() - (hours * 60 * 60 * 1000);
                    } else if (timeAgo.includes('hari')) {
                        const days = parseInt(timeAgo) || 1;
                        timestamp = Date.now() - (days * 24 * 60 * 60 * 1000);
                    } else if (timeAgo.includes('menit')) {
                        const minutes = parseInt(timeAgo) || 1;
                        timestamp = Date.now() - (minutes * 60 * 1000);
                    }
                    return {
                        ...item,
                        type: item.type || category,
                        source: 'komiku',
                        sortTimestamp: timestamp,
                        timeAgo: timeAgo || 'Baru'
                    };
                });
            };

            // Process latest from all categories
            const komikuLatest = [
                ...processKomikuLatest(latestMangaData, 'Manga'),
                ...processKomikuLatest(latestManhwaData, 'Manhwa'),
                ...processKomikuLatest(latestManhuaData, 'Manhua')
            ];

            // Process international latest updates
            const internationalLatest = internationalLatestData.success && internationalLatestData.data?.results
                ? internationalLatestData.data.results.slice(0, 10).map(item => {
                    const updatedAt = item.latestChapter?.updatedAt ? new Date(item.latestChapter.updatedAt).getTime() : Date.now();
                    // Calculate timeAgo
                    const diffMs = Date.now() - updatedAt;
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);
                    let timeAgo = 'Baru';
                    if (diffDays > 0) {
                        timeAgo = `${diffDays} hari`;
                    } else if (diffHours > 0) {
                        timeAgo = `${diffHours} jam`;
                    } else if (diffMins > 0) {
                        timeAgo = `${diffMins} menit`;
                    }
                    return {
                        title: item.title,
                        url: `/manga/series/${item.seriesId}`,
                        imageUrl: item.cover,
                        type: 'International',
                        genre: 'English',
                        latestChapter: {
                            title: item.latestChapter?.chapterNumber || 'Chapter',
                            url: `/chapter/chapters/${item.latestChapter?.chapterId || ''}`
                        },
                        source: 'international',
                        sortTimestamp: updatedAt,
                        timeAgo: timeAgo
                    };
                })
                : [];

            // Merge and sort by timestamp (newest first)
            const latestManga = [...komikuLatest, ...internationalLatest]
                .sort((a, b) => b.sortTimestamp - a.sortTimestamp)
                .slice(0, 12);

            // Process popular manga by sorttime
            const processPopular = (data) => {
                if (!data.success || !data.data?.mangaList) return [];
                return data.data.mangaList.slice(0, 10).map((item, index) => {
                    if (item.url && item.url.includes('https://komiku.org/https://komiku.org')) {
                        item.url = item.url.replace('https://komiku.org/https://komiku.org', 'https://komiku.org');
                    }
                    item.rank = index + 1;
                    return item;
                });
            };

            const popularDaily = processPopular(popularDailyData);
            const popularWeekly = processPopular(popularWeeklyData);
            const popularAll = processPopular(popularAllData);

            // Get top genres
            const topGenres = genresData.success ? genresData.data.slice(0, 5) : [];

            // Build render data
            const renderData = {
                title: 'Komikkuya - Baca & Read Komik Gratis Online | Manga, Manhwa, Manhua Chapter Terbaru',
                metaDescription: 'Baca komik gratis online di Komikkuya! Read manga chapter terbaru, genres lengkap: aksi, fantasi, romantis. Koleksi manga, manhwa, manhua update setiap hari tanpa iklan!',
                metaKeywords: 'baca komik gratis, manga online, manhwa indonesia, manhua terbaru, komik lengkap, baca manga gratis, baca manhwa gratis, read manga online, read manhwa free, chapter terbaru, update chapter, genre komik, komik romantis, komik action, komik fantasi, komik isekai, komik populer, trending manga, trending manhwa, solo leveling, one piece, naruto, demon slayer, jujutsu kaisen, attack on titan, blue lock, chainsaw man, spy x family, tower of god, lookism, manga terbaru 2025, manhwa terbaru 2025, manga terbaru 2026, komikkuya, komik online gratis, baca komik tanpa iklan, webtoon indonesia',
                canonicalUrl: 'https://komikkuya.my.id/',
                currentPath: '/',
                recommendations: processedRecommendations,
                hotManga: hotManga,
                latestManga: latestManga,
                popularDaily: popularDaily,
                popularWeekly: popularWeekly,
                popularAll: popularAll,
                genres: topGenres,
                fromCache: false,
                cacheAge: 0
            };

            // Save to server cache
            serverCache.data = renderData;
            serverCache.timestamp = Date.now();
            console.log('💾 Homepage data saved to server cache');

            return res.render('index', renderData);

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
