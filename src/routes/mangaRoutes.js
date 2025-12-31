const express = require('express');
const router = express.Router();
const mangaController = require('../controllers/mangaController');

// International series by ID (must be before /:slug to avoid conflict)
router.get('/series/:seriesId', mangaController.internationalDetail);
router.get('/image/:imageId', mangaController.proxyImage);
router.get('/:slug', mangaController.detail);

module.exports = router;
