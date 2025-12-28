const fetch = require('node-fetch');

const chapterController = {
    read: async (req, res) => {
        try {
            const { chapterUrl } = req.params;

            if (!chapterUrl) {
                return res.status(400).render('error', {
                    title: 'Error - Komikkuya',
                    error: 'Chapter URL is required'
                });
            }

            // Remove leading slash if present and construct the full URL
            const cleanUrl = chapterUrl.startsWith('/') ? chapterUrl.slice(1) : chapterUrl;
            const fullUrl = `https://komiku.id/${cleanUrl}`;

            const response = await fetch(`https://komiku-api-self.vercel.app/api/chapter?url=${encodeURIComponent(fullUrl)}`);
            const data = await response.json();

            if (!data || !data.images) {
                return res.status(404).render('error', {
                    title: 'Error - Komikkuya',
                    error: 'Chapter not found'
                });
            }

            // Extract chapter numbers from URLs for navigation
            const currentChapterNumber = cleanUrl.match(/chapter-(\d+)/)?.[1] || '';
            const prevChapterNumber = data.navigation?.prev?.url?.match(/chapter-(\d+)/)?.[1] || '';
            const nextChapterNumber = data.navigation?.next?.url?.match(/chapter-(\d+)/)?.[1] || '';

            // Extract manga detail URL from chapterList
            const mangaDetailUrl = data.navigation?.chapterList ?
                `${new URL(data.navigation.chapterList).pathname}` :
                null;

            res.render('manga/chapter', {
                title: `${data.title} - ${data.mangaTitle} | Baca Gratis Komikkuya`,
                metaDescription: `Baca ${data.title} dari ${data.mangaTitle} gratis online di Komikkuya. Tanpa iklan, loading cepat!`,
                metaKeywords: `${data.mangaTitle}, ${data.title}, baca ${data.mangaTitle} gratis, baca ${data.mangaTitle} online, read ${data.mangaTitle} free, read ${data.mangaTitle} online, chapter ${currentChapterNumber}, ${data.mangaTitle} chapter ${currentChapterNumber}, baca chapter ${currentChapterNumber}, ${data.mangaTitle} chapter terbaru, ${data.mangaTitle} chapter lengkap, ${data.mangaTitle} bahasa indonesia, ${data.mangaTitle} sub indo, ${data.mangaTitle} indo, ${data.mangaTitle} terjemahan indonesia, ${data.mangaTitle} translate indonesia, ${data.mangaTitle} komik, manga ${data.mangaTitle} chapter ${currentChapterNumber}, komik ${data.mangaTitle} chapter ${currentChapterNumber}, baca manga ${data.mangaTitle}, baca komik ${data.mangaTitle}, ${data.mangaTitle} full, ${data.mangaTitle} lengkap, ${data.mangaTitle} komikkuya, ${data.title} bahasa indonesia, ${data.title} sub indo, baca ${data.title} gratis, baca ${data.title} online, komikkuya ${data.mangaTitle}, ${data.mangaTitle} update terbaru, ${data.mangaTitle} chapter baru, ${data.mangaTitle} ch ${currentChapterNumber}`,
                canonicalUrl: `https://komikkuya.my.id/chapter/${cleanUrl}`,
                currentPath: `/chapter/${cleanUrl}`,
                breadcrumbs: [
                    { name: 'Home', url: 'https://komikkuya.my.id/' },
                    { name: data.mangaTitle, url: `https://komikkuya.my.id${mangaDetailUrl || '/popular'}` },
                    { name: data.title, url: `https://komikkuya.my.id/chapter/${cleanUrl}` }
                ],
                chapter: data,
                navigation: {
                    prev: data.navigation?.prev?.url ? {
                        url: `/chapter${new URL(data.navigation.prev.url).pathname}`,
                        title: data.navigation.prev.title
                    } : null,
                    next: data.navigation?.next?.url ? {
                        url: `/chapter${new URL(data.navigation.next.url).pathname}`,
                        title: data.navigation.next.title
                    } : null,
                    currentChapter: currentChapterNumber,
                    prevChapter: prevChapterNumber,
                    nextChapter: nextChapterNumber,
                    mangaDetailUrl
                }
            });
        } catch (error) {
            console.error('Error fetching chapter:', error);
            res.status(500).render('error', {
                title: 'Error - Komikkuya',
                error: 'Failed to load chapter'
            });
        }
    }
};

module.exports = chapterController; 
