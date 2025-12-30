const { fetchWithFallback, fetchJsonWithFallback } = require('../utils/apiFetch');
const fetch = require('node-fetch');

/**
 * Chapter Controller
 * Handles chapter reading from multiple sources:
 * - Komiku API (Indonesian manga from komiku.id)
 * - Asia API (Korean/Chinese manga from westmanga.me)
 * - International API (English manga from weebcentral.com)
 */
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

            // Determine source by URL pattern
            // International: chapters/CHAPTER_ID or weebcentral pattern
            // Asia: view/manga-slug-chapter-X-bahasa-indonesia
            // Komiku: anything else
            const isInternationalChapter = cleanUrl.startsWith('chapters/') || cleanUrl.match(/^[A-Z0-9]{26}$/);
            const isAsiaChapter = cleanUrl.includes('bahasa-indonesia') || cleanUrl.startsWith('view/');

            let data;
            let sourceType = 'komiku';

            if (isInternationalChapter) {
                // International API (weebcentral.com)
                let chapterId = cleanUrl;
                if (cleanUrl.startsWith('chapters/')) {
                    chapterId = cleanUrl.replace('chapters/', '');
                }

                const intlUrl = `https://weebcentral.com/chapters/${chapterId}`;
                const response = await fetch(`https://international.komikkuya.my.id/api/international/chapter?url=${encodeURIComponent(intlUrl)}`);
                const intlData = await response.json();

                if (intlData.success && intlData.data) {
                    sourceType = 'international';
                    // Normalize International API response
                    data = {
                        title: intlData.data.chapterNumber,
                        mangaTitle: intlData.data.mangaTitle,
                        releaseDate: intlData.data.date,
                        images: (intlData.data.images || []).map((img, index) => ({
                            url: typeof img === 'string' ? img : img.url,
                            alt: typeof img === 'string' ? `Page ${index + 1}` : (img.alt || `Page ${index + 1}`),
                            width: typeof img === 'object' ? img.width : 'auto',
                            height: typeof img === 'object' ? img.height : 'auto'
                        })),
                        navigation: {
                            prev: null, // International API doesn't provide navigation
                            next: null,
                            chapterList: intlData.data.mangaUrl
                        },
                        source: 'international',
                        seriesId: intlData.data.seriesId
                    };
                }
            } else if (isAsiaChapter) {
                // Asia API (westmanga.me) with fallback
                const asiaUrl = `https://westmanga.me/${cleanUrl}`;
                const asiaData = await fetchJsonWithFallback(`/api/asia/chapter?url=${encodeURIComponent(asiaUrl)}`);

                if (asiaData.success && asiaData.data) {
                    sourceType = 'asia';
                    // Normalize Asia API response
                    data = {
                        title: asiaData.data.title,
                        mangaTitle: asiaData.data.title.replace(/Chapter.*$/i, '').trim(),
                        releaseDate: asiaData.data.createdAt,
                        images: (asiaData.data.images || []).map((url, index) => ({
                            url: url,
                            alt: `Page ${index + 1}`,
                            width: 'auto',
                            height: 'auto'
                        })),
                        navigation: {
                            prev: asiaData.data.prevChapter ? {
                                url: asiaData.data.prevChapter,
                                title: 'Previous Chapter'
                            } : null,
                            next: asiaData.data.nextChapter ? {
                                url: asiaData.data.nextChapter,
                                title: 'Next Chapter'
                            } : null,
                            chapterList: asiaData.data.comicUrl
                        },
                        source: 'asia'
                    };
                }
            }

            // If not International or Asia, or if those failed, try Komiku API with fallback
            if (!data) {
                const fullUrl = `https://komiku.id/${cleanUrl}`;
                data = await fetchJsonWithFallback(`/api/chapter?url=${encodeURIComponent(fullUrl)}`);
                sourceType = 'komiku';
            }

            if (!data || !data.images) {
                return res.status(404).render('error', {
                    title: 'Error - Komikkuya',
                    error: 'Chapter not found'
                });
            }

            // Extract chapter numbers from URLs for navigation
            const currentChapterNumber = cleanUrl.match(/chapter-?(\d+)/i)?.[1] || '';
            const prevChapterNumber = data.navigation?.prev?.url?.match(/chapter-?(\d+)/i)?.[1] || '';
            const nextChapterNumber = data.navigation?.next?.url?.match(/chapter-?(\d+)/i)?.[1] || '';

            // Extract manga detail URL from chapterList or chapter URL
            let mangaDetailUrl = null;
            if (data.navigation?.chapterList) {
                try {
                    const chList = data.navigation.chapterList;
                    if (chList.startsWith('http')) {
                        const chapterListUrl = new URL(chList);
                        if (chapterListUrl.hostname.includes('westmanga')) {
                            const slug = chapterListUrl.pathname.split('/comic/')[1]?.replace('/', '') || '';
                            mangaDetailUrl = `/manga/${slug}`;
                        } else if (chapterListUrl.hostname.includes('weebcentral')) {
                            const pathParts = chapterListUrl.pathname.split('/');
                            const slug = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2] || '';
                            mangaDetailUrl = `/manga/${slug}`;
                        } else {
                            mangaDetailUrl = chapterListUrl.pathname;
                        }
                    } else {
                        mangaDetailUrl = chList.startsWith('/') ? chList : '/' + chList;
                    }
                } catch (e) {
                    mangaDetailUrl = null;
                }
            }

            // Fallback: Try to extract from cleanUrl (most reliable for Komiku)
            if (!mangaDetailUrl || mangaDetailUrl === '/') {
                const slugMatch = cleanUrl.match(/manga\/([^\/]+)/);
                if (slugMatch && slugMatch[1]) {
                    mangaDetailUrl = `/manga/${slugMatch[1]}`;
                }
            }

            // Final safety: normalize path
            if (mangaDetailUrl) {
                if (!mangaDetailUrl.startsWith('http')) {
                    if (!mangaDetailUrl.startsWith('/')) mangaDetailUrl = '/' + mangaDetailUrl;
                    // Fix double slashes
                    mangaDetailUrl = mangaDetailUrl.replace(/\/+/g, '/');
                    if (mangaDetailUrl.length > 1 && mangaDetailUrl.endsWith('/')) {
                        mangaDetailUrl = mangaDetailUrl.slice(0, -1);
                    }
                }
            }

            // Build navigation URLs
            let prevNavigation = null;
            let nextNavigation = null;

            if (data.navigation?.prev?.url) {
                try {
                    const prevUrl = new URL(data.navigation.prev.url);
                    if (sourceType === 'asia' || prevUrl.hostname.includes('westmanga')) {
                        prevNavigation = {
                            url: `/chapter/${prevUrl.pathname.replace('/view/', 'view/')}`,
                            title: data.navigation.prev.title || 'Previous Chapter'
                        };
                    } else if (sourceType === 'international' || prevUrl.hostname.includes('weebcentral')) {
                        const prevId = prevUrl.pathname.split('/chapters/')[1] || '';
                        prevNavigation = {
                            url: `/chapter/chapters/${prevId}`,
                            title: data.navigation.prev.title || 'Previous Chapter'
                        };
                    } else {
                        prevNavigation = {
                            url: `/chapter${prevUrl.pathname}`,
                            title: data.navigation.prev.title
                        };
                    }
                } catch (e) {
                    prevNavigation = null;
                }
            }

            if (data.navigation?.next?.url) {
                try {
                    const nextUrl = new URL(data.navigation.next.url);
                    if (sourceType === 'asia' || nextUrl.hostname.includes('westmanga')) {
                        nextNavigation = {
                            url: `/chapter/${nextUrl.pathname.replace('/view/', 'view/')}`,
                            title: data.navigation.next.title || 'Next Chapter'
                        };
                    } else if (sourceType === 'international' || nextUrl.hostname.includes('weebcentral')) {
                        const nextId = nextUrl.pathname.split('/chapters/')[1] || '';
                        nextNavigation = {
                            url: `/chapter/chapters/${nextId}`,
                            title: data.navigation.next.title || 'Next Chapter'
                        };
                    } else {
                        nextNavigation = {
                            url: `/chapter${nextUrl.pathname}`,
                            title: data.navigation.next.title
                        };
                    }
                } catch (e) {
                    nextNavigation = null;
                }
            }

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
                    prev: prevNavigation,
                    next: nextNavigation,
                    currentChapter: currentChapterNumber,
                    prevChapter: prevChapterNumber,
                    nextChapter: nextChapterNumber,
                    mangaDetailUrl
                },
                sourceType: sourceType
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
