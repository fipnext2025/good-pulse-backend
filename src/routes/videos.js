const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const { videoUpload } = require('../config/s3');
const videoController = require('../controllers/videoController');

const router = express.Router();

router.post(
  '/',
  auth,
  videoUpload.single('video'),
  [body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 100 })],
  validate,
  videoController.upload
);

router.post(
  '/youtube-link',
  auth,
  [
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 100 }),
    body('youtubeUrl').trim().notEmpty().withMessage('YouTube URL is required'),
  ],
  validate,
  videoController.addYoutubeLink
);

router.get('/', auth, videoController.getAll);
router.get('/:id', auth, videoController.getById);
router.delete('/:id', auth, videoController.delete);

module.exports = router;
