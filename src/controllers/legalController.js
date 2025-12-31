const fetch = require('node-fetch');
const multer = require('multer');
const FormData = require('form-data');

// Discord webhook URLs (hidden from client)
const DISCORD_WEBHOOKS = [
    'https://discord.com/api/webhooks/1455145456014196737/sy1zEjGbXoCRLqW8JDjktN1YvvQ8Fg3-eFVXN3wS7Bls-kpWL7dwSANXLtCMbJFi_big',
    'https://discord.com/api/webhooks/1455146998876340380/o-O3OAFuwuhcIL_RQLAvYE_hGLxWMJubhDfOPx7aucgeXXknP02XKVf3W6on0-lg_cKa'
];

// Multer configuration for memory storage (no disk save)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 8 * 1024 * 1024, // 8MB max (Discord limit)
    },
    fileFilter: (req, file, cb) => {
        // Only allow images
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'), false);
        }
    }
}).single('image'); // 'image' is the field name

// In-memory rate limit store (resets on server restart)
// For production with multiple instances, use Redis or similar
const rateLimitStore = new Map();
const RATE_LIMIT_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// VPN/Proxy check cache (to avoid repeated API calls)
const vpnCheckCache = new Map();
const VPN_CACHE_DURATION = 10 * 60 * 1000; // Cache VPN check for 10 minutes

// Get client IP address (supports Vercel/proxies)
function getClientIP(req) {
    // Vercel uses x-forwarded-for
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        // x-forwarded-for can contain multiple IPs, first one is the client
        return forwarded.split(',')[0].trim();
    }
    // Fallback to x-real-ip
    const realIP = req.headers['x-real-ip'];
    if (realIP) {
        return realIP;
    }
    // Fallback to connection remote address
    return req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
}

// Check if IP is rate limited
function isRateLimited(ip) {
    const lastSubmit = rateLimitStore.get(ip);
    if (!lastSubmit) return false;

    const timeSinceLastSubmit = Date.now() - lastSubmit;
    return timeSinceLastSubmit < RATE_LIMIT_DURATION;
}

// Get remaining time until rate limit expires (in minutes)
function getRateLimitRemaining(ip) {
    const lastSubmit = rateLimitStore.get(ip);
    if (!lastSubmit) return 0;

    const remaining = RATE_LIMIT_DURATION - (Date.now() - lastSubmit);
    return Math.ceil(remaining / 60000); // Convert to minutes
}

// Check if IP is VPN/Proxy using ip-api.com (free, no API key needed)
async function isVPNorProxy(ip) {
    // Skip check for localhost/private IPs
    if (ip === 'unknown' || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return { isVPN: false, cached: false };
    }

    // Check cache first
    const cached = vpnCheckCache.get(ip);
    if (cached && (Date.now() - cached.timestamp) < VPN_CACHE_DURATION) {
        return { isVPN: cached.isVPN, cached: true };
    }

    try {
        // ip-api.com with proxy field (free tier, 45 requests/minute)
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,proxy,hosting`);
        const data = await response.json();

        if (data.status === 'success') {
            const isVPN = data.proxy === true || data.hosting === true;

            // Cache the result
            vpnCheckCache.set(ip, {
                isVPN: isVPN,
                timestamp: Date.now()
            });

            return { isVPN: isVPN, cached: false };
        }
    } catch (error) {
        console.error('VPN check error:', error);
    }

    // If check fails, allow the request (fail open)
    return { isVPN: false, cached: false };
}

const legalController = {
    terms: (req, res) => {
        res.render('legal/terms', {
            title: 'Terms of Usage - Komikkuya'
        });
    },

    privacy: (req, res) => {
        res.render('legal/privacy', {
            title: 'Privacy Policy - Komikkuya'
        });
    },

    dmca: (req, res) => {
        res.render('legal/dmca', {
            title: 'DMCA - Komikkuya'
        });
    },

    contact: async (req, res) => {
        const clientIP = getClientIP(req);
        const isLimited = isRateLimited(clientIP);
        const remainingMinutes = getRateLimitRemaining(clientIP);

        // Check VPN/Proxy
        const vpnCheck = await isVPNorProxy(clientIP);

        res.render('legal/contact', {
            title: 'Contact Us - Komikkuya',
            success: req.query.success === 'true',
            error: req.query.error,
            isRateLimited: isLimited,
            remainingMinutes: remainingMinutes,
            isVPN: vpnCheck.isVPN
        });
    },

    // Multer middleware export for route
    uploadMiddleware: upload,

    // POST handler for contact form - sends to Discord webhooks
    submitContact: async (req, res) => {
        try {
            const clientIP = getClientIP(req);

            // Check VPN/Proxy first
            const vpnCheck = await isVPNorProxy(clientIP);
            if (vpnCheck.isVPN) {
                return res.redirect('/contact?error=VPN/Proxy detected. Please disable your VPN/Proxy and try again.');
            }

            // Check rate limit
            if (isRateLimited(clientIP)) {
                const remaining = getRateLimitRemaining(clientIP);
                return res.redirect(`/contact?error=You can only send one message per hour. Please try again in ${remaining} minutes.`);
            }

            const { name, email, subject, message } = req.body;
            const imageFile = req.file; // Multer adds this

            // Validate required fields
            if (!name || !email || !subject || !message) {
                return res.redirect('/contact?error=Please fill all required fields');
            }

            // Subject mapping
            const subjectLabels = {
                'general': '📩 General Inquiry',
                'support': '🔧 Technical Support',
                'feedback': '💬 Feedback',
                'dmca': '⚠️ DMCA Notice',
                'other': '📝 Other'
            };

            // Create Discord embed
            const embed = {
                title: subjectLabels[subject] || '📩 New Contact Message',
                color: 0x8B5CF6, // Purple color
                fields: [
                    {
                        name: '👤 Name',
                        value: name,
                        inline: true
                    },
                    {
                        name: '📧 Email',
                        value: email,
                        inline: true
                    },
                    {
                        name: '📋 Subject',
                        value: subject,
                        inline: true
                    },
                    {
                        name: '🌐 IP Address',
                        value: `||${clientIP}||`, // Spoiler tag for privacy
                        inline: true
                    },
                    {
                        name: '💬 Message',
                        value: message.length > 1024 ? message.substring(0, 1021) + '...' : message,
                        inline: false
                    }
                ],
                footer: {
                    text: 'Komikkuya Contact Form'
                },
                timestamp: new Date().toISOString()
            };

            // If there's an image, add it to the embed
            if (imageFile) {
                embed.image = {
                    url: 'attachment://uploaded_image.' + (imageFile.mimetype.split('/')[1] || 'png')
                };
                embed.fields.push({
                    name: '🖼️ Attachment',
                    value: `${imageFile.originalname} (${(imageFile.size / 1024).toFixed(1)} KB)`,
                    inline: true
                });
            }

            const payload = {
                username: 'Komikkuya Contact',
                avatar_url: 'https://komikkuya.my.id/assets/favicon.png',
                embeds: [embed]
            };

            // Send to all Discord webhooks in parallel
            const webhookPromises = DISCORD_WEBHOOKS.map(async webhookUrl => {
                if (imageFile) {
                    // Use FormData for file upload
                    const formData = new FormData();
                    formData.append('payload_json', JSON.stringify(payload));
                    formData.append('file', imageFile.buffer, {
                        filename: 'uploaded_image.' + (imageFile.mimetype.split('/')[1] || 'png'),
                        contentType: imageFile.mimetype
                    });

                    return fetch(webhookUrl, {
                        method: 'POST',
                        body: formData
                    });
                } else {
                    // No file, use JSON
                    return fetch(webhookUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });
                }
            });

            const results = await Promise.allSettled(webhookPromises);

            // Check if at least one webhook succeeded
            const anySuccess = results.some(result =>
                result.status === 'fulfilled' && result.value.ok
            );

            if (anySuccess) {
                // Set rate limit for this IP
                rateLimitStore.set(clientIP, Date.now());
                return res.redirect('/contact?success=true');
            } else {
                console.error('All Discord webhooks failed:', results);
                return res.redirect('/contact?error=Failed to send message. Please try again.');
            }
        } catch (error) {
            console.error('Error submitting contact form:', error);
            return res.redirect('/contact?error=An error occurred. Please try again later.');
        }
    },

    about: (req, res) => {
        res.render('legal/about', {
            title: 'Tentang Kami - Komikkuya',
            metaDescription: 'Tentang Komikkuya - Platform baca komik gratis manga, manhwa, manhua dalam Bahasa Indonesia. Baca komik online tanpa iklan!',
            metaKeywords: 'tentang komikkuya, about komikkuya, baca komik gratis, manga indonesia, manhwa indonesia, manhua indonesia',
            canonicalUrl: 'https://komikkuya.my.id/about',
            currentPath: '/about'
        });
    }
};

module.exports = legalController;

