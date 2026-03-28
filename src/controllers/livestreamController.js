const LiveStream = require('../models/LiveStream');

// Get currently live streams (admin or approved user streams)
// Auto-ends streams past their scheduled end time
exports.getActive = async (req, res, next) => {
  try {
    const now = new Date();

    // Auto-end expired live/paused streams
    await LiveStream.updateMany(
      { status: { $in: ['live', 'paused'] }, scheduledTo: { $lte: now } },
      { $set: { status: 'ended', endedAt: now } }
    );

    const streams = await LiveStream.find({ status: { $in: ['live', 'paused'] } })
      .populate('userId', 'name avatar')
      .sort({ startedAt: -1 })
      .lean();

    res.json({ data: streams });
  } catch (error) {
    next(error);
  }
};

// Get upcoming approved/scheduled streams
exports.getUpcoming = async (req, res, next) => {
  try {
    const streams = await LiveStream.find({
      status: { $in: ['approved', 'live', 'paused'] },
      $or: [
        { status: { $in: ['live', 'paused'] } },
        { scheduledFrom: { $gte: new Date() } },
      ],
    })
      .populate('userId', 'name avatar')
      .sort({ scheduledFrom: 1 })
      .lean();

    res.json({ data: streams });
  } catch (error) {
    next(error);
  }
};

// Get booked dates for a given month (for calendar display)
exports.getBookedDates = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ message: 'year and month query params are required' });
    }

    const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endOfMonth = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    const bookedStreams = await LiveStream.find({
      status: { $in: ['requested', 'approved', 'live', 'paused'] },
      scheduledFrom: { $lte: endOfMonth },
      scheduledTo: { $gte: startOfMonth },
    })
      .select('scheduledFrom scheduledTo status title')
      .lean();

    res.json({ data: bookedStreams });
  } catch (error) {
    next(error);
  }
};

// User requests to stream on a particular date range (max 1 per month)
exports.requestStream = async (req, res, next) => {
  try {
    const { title, description, scheduledFrom, scheduledTo } = req.body;
    const userId = req.userId;

    if (!scheduledFrom || !scheduledTo) {
      return res.status(400).json({ message: 'Scheduled from and to dates are required' });
    }

    const fromDate = new Date(scheduledFrom);
    const toDate = new Date(scheduledTo);

    if (toDate <= fromDate) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Get start and end of the month for the requested date
    const monthStart = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
    const monthEnd = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 0, 23, 59, 59);

    // Check if user already has a request this month (any status except 'ended')
    const existingRequest = await LiveStream.findOne({
      userId,
      streamType: 'user',
      createdAt: { $gte: monthStart, $lte: monthEnd },
      status: { $in: ['requested', 'approved', 'live', 'rejected'] },
    });

    if (existingRequest) {
      if (existingRequest.status === 'rejected') {
        return res.status(400).json({
          message: 'Your stream request was rejected this month. You can request again next month.',
        });
      }
      return res.status(400).json({
        message: 'You can only request one live stream per month. You already have a request this month.',
      });
    }

    // Check for date overlap with existing booked streams
    const overlap = await LiveStream.findOne({
      status: { $in: ['requested', 'approved', 'live', 'paused'] },
      scheduledFrom: { $lt: toDate },
      scheduledTo: { $gt: fromDate },
    });

    if (overlap) {
      return res.status(400).json({
        message: 'This time slot overlaps with another stream. Please choose a different date/time.',
      });
    }

    const stream = await LiveStream.create({
      userId,
      title,
      description: description || '',
      streamType: 'user',
      status: 'requested',
      scheduledFrom: fromDate,
      scheduledTo: toDate,
      scheduledAt: fromDate, // backward compat
    });

    res.status(201).json({
      message: 'Stream request submitted for admin approval',
      data: stream,
    });
  } catch (error) {
    next(error);
  }
};

// Get user's own stream requests
exports.getMyRequests = async (req, res, next) => {
  try {
    const streams = await LiveStream.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ data: streams });
  } catch (error) {
    next(error);
  }
};

// User starts their approved stream (adds URL and goes live)
// Only allowed within the booked time window
exports.startMyStream = async (req, res, next) => {
  try {
    const stream = await LiveStream.findById(req.params.id);
    if (!stream) return res.status(404).json({ message: 'Stream not found' });
    console.log('Starting stream:', stream);
    console.log('Request body:', req.userId);
    if (stream.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'You can only start your own stream' });
    }
    if (stream.status !== 'approved') {
      return res.status(400).json({ message: `Cannot start stream with status: ${stream.status}` });
    }

    // Check if current time is within the booked window
    const now = new Date();
    const from = new Date(stream.scheduledFrom);
    const to = new Date(stream.scheduledTo);

    if (now < from || now > to) {
      return res.status(400).json({
        message: 'You can only go live during your booked time slot',
      });
    }

    const { streamUrl } = req.body;
    if (!streamUrl) {
      return res.status(400).json({ message: 'Stream URL is required' });
    }

    stream.streamUrl = streamUrl;
    stream.status = 'live';
    stream.startedAt = now;
    await stream.save();

    res.json({ message: 'Stream is now live!', data: stream });
  } catch (error) {
    next(error);
  }
};

// User ends their own stream
exports.endMyStream = async (req, res, next) => {
  try {
    const stream = await LiveStream.findById(req.params.id);
    if (!stream) return res.status(404).json({ message: 'Stream not found' });
    if (stream.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'You can only end your own stream' });
    }
    if (stream.status !== 'live') {
      return res.status(400).json({ message: 'Stream is not live' });
    }

    stream.status = 'ended';
    stream.endedAt = new Date();
    await stream.save();

    res.json({ message: 'Stream ended', data: stream });
  } catch (error) {
    next(error);
  }
};

// Get all streams (with optional status filter)
exports.getAll = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    const filter = {};
    if (status) filter.status = status;

    const [streams, total] = await Promise.all([
      LiveStream.find(filter)
        .populate('userId', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LiveStream.countDocuments(filter),
    ]);

    res.json({
      data: streams,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    next(error);
  }
};
