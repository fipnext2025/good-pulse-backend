const User = require('../models/User');
const Submission = require('../models/Submission');

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location,
        karmaPoints: user.karmaPoints,
        totalSubmissions: user.totalSubmissions,
        approvedSubmissions: user.approvedSubmissions,
        isRegistered: user.isRegistered,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    if (req.params.userId !== req.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this profile' });
    }

    const allowedFields = ['name', 'bio', 'avatar', 'location'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(req.params.userId, updates, {
      new: true,
      runValidators: true,
    }).lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ data: user });
  } catch (error) {
    next(error);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const [pendingCount, rejectedCount, rank] = await Promise.all([
      Submission.countDocuments({ userId: req.params.userId, status: 'pending' }),
      Submission.countDocuments({ userId: req.params.userId, status: 'rejected' }),
      User.countDocuments({ karmaPoints: { $gt: user.karmaPoints } }),
    ]);

    res.json({
      data: {
        totalKarmaPoints: user.karmaPoints,
        totalSubmissions: user.totalSubmissions,
        approvedSubmissions: user.approvedSubmissions,
        pendingSubmissions: pendingCount,
        rejectedSubmissions: rejectedCount,
        rank: rank + 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadAvatar = async (req, res, next) => {
  try {
    if (req.params.userId !== req.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const avatarUrl = req.file.location;

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { avatar: avatarUrl },
      { new: true }
    ).lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ data: { avatar: avatarUrl } });
  } catch (error) {
    next(error);
  }
};
