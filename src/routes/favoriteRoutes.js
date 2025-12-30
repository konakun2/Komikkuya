const express = require('express');
const router = express.Router();
const { getFavorites } = require('../controllers/favoriteController');

// GET /favorites - Display favorited items
router.get('/', getFavorites);

module.exports = router;
