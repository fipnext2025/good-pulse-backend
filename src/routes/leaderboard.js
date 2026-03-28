const express = require('express');
const auth = require('../middleware/auth');
const leaderboardController = require('../controllers/leaderboardController');

const router = express.Router();

// Scoped leaderboard: ?scope=global|national|state|district|city|area&country=...&state=...
router.get('/', auth, leaderboardController.getLeaderboard);

// Backward compat
router.get('/global', auth, leaderboardController.getGlobal);
router.get('/local', auth, leaderboardController.getLocal);

module.exports = router;
