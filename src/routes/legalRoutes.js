const express = require('express');
const router = express.Router();
const legalController = require('../controllers/legalController');

router.get('/terms', legalController.terms);
router.get('/privacy', legalController.privacy);
router.get('/dmca', legalController.dmca);
router.get('/contact', legalController.contact);
router.post('/contact', legalController.uploadMiddleware, legalController.submitContact); // POST for contact form submission with image
router.get('/about', legalController.about);

module.exports = router;
