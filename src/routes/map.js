const express = require('express');
const auth = require('../middleware/auth');
const mapController = require('../controllers/mapController');

const router = express.Router();

router.get('/heatmap', auth, mapController.getHeatmapData);
router.get('/cities', auth, mapController.getCities);
router.get('/nearby', auth, mapController.getNearby);

module.exports = router;
