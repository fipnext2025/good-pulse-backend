const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const livestreamController = require('../controllers/livestreamController');

const router = express.Router();

// Get currently live streams
router.get('/active', auth, livestreamController.getActive);

// Get upcoming scheduled streams
router.get('/upcoming', auth, livestreamController.getUpcoming);

// Get booked dates for a month (for calendar)
router.get('/booked-dates', auth, livestreamController.getBookedDates);

// User requests a live stream slot
router.post(
  '/request',
  auth,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').optional().trim().isLength({ max: 500 }),
    body('scheduledFrom').notEmpty().withMessage('Start date is required'),
    body('scheduledTo').notEmpty().withMessage('End date is required'),
  ],
  validate,
  livestreamController.requestStream
);

// Get user's own stream requests
router.get('/my-requests', auth, livestreamController.getMyRequests);

// User starts their approved stream (go live)
router.put('/:id/start', auth, livestreamController.startMyStream);

// User ends their own stream
router.put('/:id/end', auth, livestreamController.endMyStream);

// Get all streams (paginated)
router.get('/', auth, livestreamController.getAll);

module.exports = router;
