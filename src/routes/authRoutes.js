const express = require('express');
const router = express.Router();
const multer = require('multer');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

// Configure multer for profile picture upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'), false);
        }
    }
});

// Public routes
router.get('/login', authController.showLogin);
router.get('/register', authController.showRegister);
router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/logout', authController.logout);

// Discord Auth routes
router.get('/discord', authController.discordRedirect);
router.get('/discord/callback', authController.discordCallback);
router.get('/discord/link', requireAuth, authController.discordLink);

// OAuth Callback - receives token from backend
router.get('/callback', authController.authCallback);

// Protected routes
router.get('/dashboard', requireAuth, authController.dashboard);
router.post('/profile', requireAuth, authController.updateProfile);
router.post('/profile-picture', requireAuth, upload.single('file'), authController.uploadProfilePicture);
router.post('/delete-profile-picture', requireAuth, authController.deleteProfilePicture);

// Settings routes (JSON API)
router.get('/settings', requireAuth, authController.getSettings);
router.put('/settings', requireAuth, authController.updateSettings);

// Reading history routes (JSON API)
router.get('/reading-history', authController.getReadingHistory);
router.post('/reading-history', authController.addReadingHistory);
router.delete('/reading-history', authController.deleteReadingHistory);
router.delete('/reading-history/all', authController.deleteAllReadingHistory);

// Favorites routes (JSON API)
router.get('/favorites', authController.getFavorites);
router.post('/favorites', authController.addFavorite);
router.delete('/favorites/:id', authController.removeFavorite);
router.get('/favorites/check/:id', authController.checkFavorite);

// Public profile routes (No Auth Required)
router.get('/public/user/:userId', authController.getPublicProfile);
router.get('/public/favorites/:userId', authController.getPublicFavorites);
router.get('/public/reading-history/:userId', authController.getPublicReadingHistory);

module.exports = router;




