const fetch = require('node-fetch');

const AUTH_API_BASE = 'https://komikkuya-backend.vercel.app';

/**
 * Auth Middleware
 * Checks for JWT token in cookies and fetches user profile
 * Sets res.locals.user for all views
 */
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies?.komikkuya_token;

        if (!token) {
            res.locals.user = null;
            return next();
        }

        // Verify token with auth API
        const response = await fetch(`${AUTH_API_BASE}/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            // Invalid token, clear cookie
            res.clearCookie('komikkuya_token');
            res.locals.user = null;
            return next();
        }

        const data = await response.json();

        if (data.success && data.data?.user) {
            // Add profile picture full URL if exists
            if (data.data.user.profile_picture) {
                data.data.user.profile_picture_url = `${data.data.user.profile_picture}`;
            }
            res.locals.user = data.data.user;
            // Store Discord data if linked
            res.locals.discord = data.data.discord || null;
        } else {
            res.locals.user = null;
            res.locals.discord = null;
        }

        next();
    } catch (error) {
        console.error('Auth middleware error:', error.message);
        res.locals.user = null;
        next();
    }
};

/**
 * Require Auth Middleware
 * Use this for protected routes that require login
 */
const requireAuth = (req, res, next) => {
    if (!res.locals.user) {
        return res.redirect('/auth/login?error=' + encodeURIComponent('Silahkan login terlebih dahulu'));
    }
    next();
};

module.exports = { authMiddleware, requireAuth };
