const Submission = require('../models/Submission');
const LiveStream = require('../models/LiveStream');
const User = require('../models/User');
const notificationService = require('../services/notificationService');

// Dashboard stats
exports.getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalSubmissions,
      pendingSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      totalStreams,
      pendingStreams,
      liveStreams,
    ] = await Promise.all([
      User.countDocuments({ isRegistered: true }),
      Submission.countDocuments(),
      Submission.countDocuments({ status: 'pending' }),
      Submission.countDocuments({ status: 'approved' }),
      Submission.countDocuments({ status: 'rejected' }),
      LiveStream.countDocuments(),
      LiveStream.countDocuments({ status: 'requested' }),
      LiveStream.countDocuments({ status: { $in: ['live', 'paused'] } }),
    ]);

    res.json({
      data: {
        totalUsers,
        totalSubmissions,
        pendingSubmissions,
        approvedSubmissions,
        rejectedSubmissions,
        totalStreams,
        pendingStreams,
        liveStreams,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all users with pagination
exports.getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const filter = { isRegistered: true };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);

    res.json({ data: users, page, totalPages: Math.ceil(total / limit), total });
  } catch (error) {
    next(error);
  }
};

// Approve submission
exports.approveSubmission = async (req, res, next) => {
  try {
    const { karmaPoints } = req.body;
    const pointsToAward = parseInt(karmaPoints) || 10;

    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    if (submission.status === 'approved') return res.status(400).json({ message: 'Already approved' });

    submission.status = 'approved';
    submission.karmaPoints = pointsToAward;
    await submission.save();

    // Award Karma Points and increment approved count
    await User.findByIdAndUpdate(submission.userId, {
      $inc: { karmaPoints: pointsToAward, approvedSubmissions: 1 },
    });

    // Send notification
    notificationService.sendToUser(submission.userId, {
      title: 'Submission Approved!',
      body: `Your submission "${submission.title}" has been approved! You earned ${pointsToAward} Karma Points.`,
      type: 'submission_approved',
      data: { submissionId: submission._id.toString(), karmaPoints: pointsToAward },
    });

    res.json({ message: 'Submission approved', data: submission });
  } catch (error) {
    next(error);
  }
};

// Reject submission
exports.rejectSubmission = async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    if (submission.status === 'rejected') return res.status(400).json({ message: 'Already rejected' });

    submission.status = 'rejected';
    await submission.save();

    // Send notification
    notificationService.sendToUser(submission.userId, {
      title: 'Submission Update',
      body: `Your submission "${submission.title}" was not approved. Please review our guidelines and try again.`,
      type: 'submission_rejected',
      data: { submissionId: submission._id.toString() },
    });

    res.json({ message: 'Submission rejected', data: submission });
  } catch (error) {
    next(error);
  }
};

// Approve livestream request
exports.approveStream = async (req, res, next) => {
  try {
    const stream = await LiveStream.findById(req.params.id);
    if (!stream) return res.status(404).json({ message: 'Stream not found' });
    if (stream.status !== 'requested') return res.status(400).json({ message: `Cannot approve stream with status: ${stream.status}` });

    stream.status = 'approved';
    await stream.save();

    // Send notification
    notificationService.sendToUser(stream.userId, {
      title: 'Live Stream Approved!',
      body: `Your live stream request "${stream.title}" has been approved! Get ready to go live.`,
      type: 'stream_approved',
      data: { streamId: stream._id.toString() },
    });

    res.json({ message: 'Stream request approved', data: stream });
  } catch (error) {
    next(error);
  }
};

// Reject livestream request
exports.rejectStream = async (req, res, next) => {
  try {
    const stream = await LiveStream.findById(req.params.id);
    if (!stream) return res.status(404).json({ message: 'Stream not found' });
    if (stream.status !== 'requested') return res.status(400).json({ message: `Cannot reject stream with status: ${stream.status}` });

    stream.status = 'rejected';
    await stream.save();

    // Send notification
    notificationService.sendToUser(stream.userId, {
      title: 'Live Stream Update',
      body: `Your live stream request "${stream.title}" was not approved. You can request again next month.`,
      type: 'stream_rejected',
      data: { streamId: stream._id.toString() },
    });

    res.json({ message: 'Stream request rejected', data: stream });
  } catch (error) {
    next(error);
  }
};

// Start admin livestream
exports.startAdminStream = async (req, res, next) => {
  try {
    const { title, description, streamUrl, thumbnailUrl } = req.body;

    if (!title) return res.status(400).json({ message: 'Title is required' });

    const stream = await LiveStream.create({
      userId: req.userId,
      title,
      description: description || '',
      streamUrl: streamUrl || '',
      thumbnailUrl: thumbnailUrl || '',
      streamType: 'admin',
      status: 'live',
      startedAt: new Date(),
    });

    res.status(201).json({ message: 'Admin stream started', data: stream });
  } catch (error) {
    next(error);
  }
};

// End a livestream (stop)
exports.endStream = async (req, res, next) => {
  try {
    const stream = await LiveStream.findById(req.params.id);
    if (!stream) return res.status(404).json({ message: 'Stream not found' });
    if (!['live', 'paused', 'approved'].includes(stream.status)) {
      return res.status(400).json({ message: `Cannot end stream with status: ${stream.status}` });
    }

    stream.status = 'ended';
    stream.endedAt = new Date();
    await stream.save();

    res.json({ message: 'Stream ended', data: stream });
  } catch (error) {
    next(error);
  }
};

// Start/restart a stream (approved, paused, or ended → live)
exports.startStream = async (req, res, next) => {
  try {
    const { streamUrl } = req.body;
    const stream = await LiveStream.findById(req.params.id);
    if (!stream) return res.status(404).json({ message: 'Stream not found' });
    if (!['approved', 'paused', 'ended'].includes(stream.status)) {
      return res.status(400).json({ message: `Cannot start stream with status: ${stream.status}` });
    }

    stream.status = 'live';
    if (!stream.startedAt) stream.startedAt = new Date();
    if (streamUrl) stream.streamUrl = streamUrl;
    await stream.save();

    res.json({ message: 'Stream is now live', data: stream });
  } catch (error) {
    next(error);
  }
};

// Pause a live stream
exports.pauseStream = async (req, res, next) => {
  try {
    const stream = await LiveStream.findById(req.params.id);
    if (!stream) return res.status(404).json({ message: 'Stream not found' });
    if (stream.status !== 'live') {
      return res.status(400).json({ message: `Cannot pause stream with status: ${stream.status}` });
    }

    stream.status = 'paused';
    await stream.save();

    res.json({ message: 'Stream paused', data: stream });
  } catch (error) {
    next(error);
  }
};
