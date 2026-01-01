const fetch = require('node-fetch');
const FormData = require('form-data');

const AUTH_API_BASE = 'https://auth.komikkuya.my.id';

const authController = {
    // Show login page
    showLogin: (req, res) => {
        // If already logged in, redirect to dashboard
        if (res.locals.user) {
            return res.redirect('/auth/dashboard');
        }

        res.render('auth/login', {
            layout: 'layouts/main',
            title: 'Login - Komikkuya',
            metaDescription: 'Login ke akun Komikkuya untuk akses fitur premium',
            error: req.query.error || null,
            success: req.query.success || null
        });
    },

    // Show register page
    showRegister: (req, res) => {
        // If already logged in, redirect to dashboard
        if (res.locals.user) {
            return res.redirect('/auth/dashboard');
        }

        res.render('auth/register', {
            layout: 'layouts/main',
            title: 'Daftar - Komikkuya',
            metaDescription: 'Daftar akun Komikkuya gratis untuk akses fitur premium',
            error: req.query.error || null
        });
    },

    // Handle login
    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.redirect('/auth/login?error=' + encodeURIComponent('Email dan password wajib diisi'));
            }

            const response = await fetch(`${AUTH_API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                return res.redirect('/auth/login?error=' + encodeURIComponent(data.message || 'Login gagal'));
            }

            // Set JWT token in cookie (httpOnly for security)
            res.cookie('komikkuya_token', data.data.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                sameSite: 'lax'
            });

            // Redirect to dashboard
            res.redirect('/auth/dashboard');
        } catch (error) {
            console.error('Login error:', error);
            res.redirect('/auth/login?error=' + encodeURIComponent('Terjadi kesalahan server'));
        }
    },

    // Handle register
    register: async (req, res) => {
        try {
            const { email, password, username } = req.body;

            if (!email || !password || !username) {
                return res.redirect('/auth/register?error=' + encodeURIComponent('Semua field wajib diisi'));
            }

            const response = await fetch(`${AUTH_API_BASE}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, username })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                return res.redirect('/auth/register?error=' + encodeURIComponent(data.message || 'Registrasi gagal'));
            }

            // Set JWT token in cookie
            res.cookie('komikkuya_token', data.data.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000,
                sameSite: 'lax'
            });

            // Redirect to dashboard
            res.redirect('/auth/dashboard');
        } catch (error) {
            console.error('Register error:', error);
            res.redirect('/auth/register?error=' + encodeURIComponent('Terjadi kesalahan server'));
        }
    },

    // Handle logout
    logout: (req, res) => {
        res.clearCookie('komikkuya_token');
        res.redirect('/auth/login?success=' + encodeURIComponent('Berhasil logout'));
    },

    // Show dashboard (protected)
    dashboard: async (req, res) => {
        try {
            if (!res.locals.user) {
                return res.redirect('/auth/login');
            }

            res.render('auth/dashboard', {
                layout: 'layouts/main',
                title: 'Dashboard - Komikkuya',
                metaDescription: 'Dashboard akun Komikkuya',
                user: res.locals.user,
                error: req.query.error || null,
                success: req.query.success || null
            });
        } catch (error) {
            console.error('Dashboard error:', error);
            res.redirect('/auth/login?error=' + encodeURIComponent('Terjadi kesalahan'));
        }
    },

    // Update profile
    updateProfile: async (req, res) => {
        try {
            const token = req.cookies.komikkuya_token;
            if (!token) {
                return res.redirect('/auth/login');
            }

            const { username, email } = req.body;

            const response = await fetch(`${AUTH_API_BASE}/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username, email })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                return res.redirect('/auth/dashboard?error=' + encodeURIComponent(data.message || 'Gagal update profil'));
            }

            res.redirect('/auth/dashboard?success=' + encodeURIComponent('Profil berhasil diupdate'));
        } catch (error) {
            console.error('Update profile error:', error);
            res.redirect('/auth/dashboard?error=' + encodeURIComponent('Terjadi kesalahan'));
        }
    },

    // Upload profile picture
    uploadProfilePicture: async (req, res) => {
        try {
            const token = req.cookies.komikkuya_token;
            if (!token) {
                return res.redirect('/auth/login');
            }

            if (!req.file) {
                return res.redirect('/auth/dashboard?error=' + encodeURIComponent('File tidak ditemukan'));
            }

            const formData = new FormData();
            formData.append('file', req.file.buffer, {
                filename: req.file.originalname,
                contentType: req.file.mimetype
            });

            const response = await fetch(`${AUTH_API_BASE}/auth/profile-picture`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                return res.redirect('/auth/dashboard?error=' + encodeURIComponent(data.message || 'Gagal upload foto'));
            }

            res.redirect('/auth/dashboard?success=' + encodeURIComponent('Foto profil berhasil diupdate'));
        } catch (error) {
            console.error('Upload profile picture error:', error);
            res.redirect('/auth/dashboard?error=' + encodeURIComponent('Terjadi kesalahan'));
        }
    },

    // Delete profile picture
    deleteProfilePicture: async (req, res) => {
        try {
            const token = req.cookies.komikkuya_token;
            if (!token) {
                return res.redirect('/auth/login');
            }

            const response = await fetch(`${AUTH_API_BASE}/auth/profile-picture`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                return res.redirect('/auth/dashboard?error=' + encodeURIComponent(data.message || 'Gagal hapus foto'));
            }

            res.redirect('/auth/dashboard?success=' + encodeURIComponent('Foto profil berhasil dihapus'));
        } catch (error) {
            console.error('Delete profile picture error:', error);
            res.redirect('/auth/dashboard?error=' + encodeURIComponent('Terjadi kesalahan'));
        }
    },

    // Get user settings
    getSettings: async (req, res) => {
        try {
            const token = req.cookies.komikkuya_token;
            if (!token) {
                return res.json({ success: false, message: 'Not authenticated' });
            }

            const response = await fetch(`${AUTH_API_BASE}/settings`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            return res.json(data);
        } catch (error) {
            console.error('Get settings error:', error);
            return res.json({ success: false, message: 'Failed to get settings' });
        }
    },

    // Update user settings (toggle)
    updateSettings: async (req, res) => {
        try {
            const token = req.cookies.komikkuya_token;
            if (!token) {
                return res.json({ success: false, message: 'Not authenticated' });
            }

            const { show_favorites, show_reading_history } = req.body;

            const response = await fetch(`${AUTH_API_BASE}/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ show_favorites, show_reading_history })
            });

            const data = await response.json();
            return res.json(data);
        } catch (error) {
            console.error('Update settings error:', error);
            return res.json({ success: false, message: 'Failed to update settings' });
        }
    },

    // Get reading history
    getReadingHistory: async (req, res) => {
        try {
            const token = req.cookies.komikkuya_token;
            if (!token) {
                return res.json({ success: false, message: 'Not authenticated' });
            }

            const response = await fetch(`${AUTH_API_BASE}/reading-history`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            return res.json(data);
        } catch (error) {
            console.error('Get reading history error:', error);
            return res.json({ success: false, message: 'Failed to get reading history' });
        }
    },

    // Add/update reading history (upsert)
    addReadingHistory: async (req, res) => {
        try {
            const token = req.cookies.komikkuya_token;
            if (!token) {
                return res.json({ success: false, message: 'Not authenticated' });
            }

            const { title, chapterTitle, url, image, type, time } = req.body;

            const response = await fetch(`${AUTH_API_BASE}/reading-history`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title, chapterTitle, url, image, type, time })
            });

            const data = await response.json();
            return res.json(data);
        } catch (error) {
            console.error('Add reading history error:', error);
            return res.json({ success: false, message: 'Failed to add reading history' });
        }
    },

    // Delete single reading history entry
    deleteReadingHistory: async (req, res) => {
        try {
            const token = req.cookies.komikkuya_token;
            if (!token) {
                return res.json({ success: false, message: 'Not authenticated' });
            }

            const { title } = req.body;

            const response = await fetch(`${AUTH_API_BASE}/reading-history`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title })
            });

            const data = await response.json();
            return res.json(data);
        } catch (error) {
            console.error('Delete reading history error:', error);
            return res.json({ success: false, message: 'Failed to delete reading history' });
        }
    },

    // Delete all reading history
    deleteAllReadingHistory: async (req, res) => {
        try {
            const token = req.cookies.komikkuya_token;
            if (!token) {
                return res.json({ success: false, message: 'Not authenticated' });
            }

            const response = await fetch(`${AUTH_API_BASE}/reading-history/all`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            return res.json(data);
        } catch (error) {
            console.error('Delete all reading history error:', error);
            return res.json({ success: false, message: 'Failed to delete all reading history' });
        }
    },

    // Get all favorites
    getFavorites: async (req, res) => {
        try {
            const token = req.cookies.komikkuya_token;
            if (!token) {
                return res.json({ success: false, message: 'Not authenticated' });
            }

            const response = await fetch(`${AUTH_API_BASE}/favorites`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            return res.json(data);
        } catch (error) {
            console.error('Get favorites error:', error);
            return res.json({ success: false, message: 'Failed to get favorites' });
        }
    },

    // Add favorite
    addFavorite: async (req, res) => {
        try {
            const token = req.cookies.komikkuya_token;
            if (!token) {
                return res.json({ success: false, message: 'Not authenticated' });
            }

            const { id, slug, title, cover, type, source } = req.body;

            const response = await fetch(`${AUTH_API_BASE}/favorites`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ id, slug, title, cover, type, source })
            });

            const data = await response.json();
            return res.json(data);
        } catch (error) {
            console.error('Add favorite error:', error);
            return res.json({ success: false, message: 'Failed to add favorite' });
        }
    },

    // Remove favorite
    removeFavorite: async (req, res) => {
        try {
            const token = req.cookies.komikkuya_token;
            if (!token) {
                return res.json({ success: false, message: 'Not authenticated' });
            }

            const { id } = req.params;

            const response = await fetch(`${AUTH_API_BASE}/favorites/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            return res.json(data);
        } catch (error) {
            console.error('Remove favorite error:', error);
            return res.json({ success: false, message: 'Failed to remove favorite' });
        }
    },

    // Check if favorited
    checkFavorite: async (req, res) => {
        try {
            const token = req.cookies.komikkuya_token;
            if (!token) {
                return res.json({ success: false, favorited: false });
            }

            const { id } = req.params;

            const response = await fetch(`${AUTH_API_BASE}/favorites/check/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            return res.json(data);
        } catch (error) {
            console.error('Check favorite error:', error);
            return res.json({ success: false, favorited: false });
        }
    },

    // ==================== PUBLIC ENDPOINTS (No Auth Required) ====================

    // Get public profile
    getPublicProfile: async (req, res) => {
        try {
            const { userId } = req.params;

            const response = await fetch(`${AUTH_API_BASE}/public/user/${userId}`, {
                method: 'GET'
            });

            const data = await response.json();
            return res.json(data);
        } catch (error) {
            console.error('Get public profile error:', error);
            return res.json({ success: false, message: 'Failed to get public profile' });
        }
    },

    // Get public favorites
    getPublicFavorites: async (req, res) => {
        try {
            const { userId } = req.params;

            const response = await fetch(`${AUTH_API_BASE}/public/favorites/${userId}`, {
                method: 'GET'
            });

            const data = await response.json();
            return res.json(data);
        } catch (error) {
            console.error('Get public favorites error:', error);
            return res.json({ success: false, message: 'Failed to get public favorites' });
        }
    },

    // Get public reading history
    getPublicReadingHistory: async (req, res) => {
        try {
            const { userId } = req.params;
            const limit = req.query.limit || 20;

            const response = await fetch(`${AUTH_API_BASE}/public/reading-history/${userId}?limit=${limit}`, {
                method: 'GET'
            });

            const data = await response.json();
            return res.json(data);
        } catch (error) {
            console.error('Get public reading history error:', error);
            return res.json({ success: false, message: 'Failed to get public reading history' });
        }
    }
};

module.exports = authController;




