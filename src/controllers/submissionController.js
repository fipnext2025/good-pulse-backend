const Submission = require('../models/Submission');
const User = require('../models/User');

exports.create = async (req, res, next) => {
  try {
    const { title, description, latitude, longitude, city, region, country, formattedAddress, youtubeUrl, submissionType } = req.body;

    const submissionData = {
      userId: req.userId,
      title,
      description,
      submissionType: submissionType || 'deed',
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      address: { city, region, country, formattedAddress },
    };

    // Handle YouTube link
    if (youtubeUrl) {
      submissionData.youtubeUrl = youtubeUrl;
    }

    // Handle multiple image uploads
    if (req.files?.images && req.files.images.length > 0) {
      submissionData.images = req.files.images.map((file) => ({
        url: file.location,
        key: file.key,
      }));
      submissionData.imageUrl = req.files.images[0].location;
      submissionData.imageKey = req.files.images[0].key;
    } else if (req.files?.image?.[0]) {
      submissionData.images = [{ url: req.files.image[0].location, key: req.files.image[0].key }];
      submissionData.imageUrl = req.files.image[0].location;
      submissionData.imageKey = req.files.image[0].key;
    }

    // Handle video upload
    if (req.files?.video?.[0]) {
      submissionData.videoUrl = req.files.video[0].location;
      submissionData.videoKey = req.files.video[0].key;
    }

    const submission = await Submission.create(submissionData);

    // Increment user's total submissions
    await User.findByIdAndUpdate(req.userId, { $inc: { totalSubmissions: 1 } });

    res.status(201).json({ data: submission });
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const submissionType = req.query.submissionType;

    const filter = {};
    if (status) filter.status = status;
    if (submissionType) filter.submissionType = submissionType;

    const [submissions, total] = await Promise.all([
      Submission.find(filter)
        .populate('userId', 'name avatar')
        .populate('linkedIssueId', 'title userId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Submission.countDocuments(filter),
    ]);

    res.json({
      data: submissions,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('userId', 'name avatar email')
      .populate({ path: 'linkedIssueId', populate: { path: 'userId', select: 'name avatar' } })
      .lean();

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // If this is an issue, attach all deed responses
    if (submission.submissionType === 'issue') {
      const deeds = await Submission.find({
        linkedIssueId: submission._id,
        submissionType: 'deed',
      })
        .populate('userId', 'name avatar')
        .sort({ createdAt: -1 })
        .lean();
      submission.deeds = deeds;
    }

    res.json({ data: submission });
  } catch (error) {
    next(error);
  }
};

exports.getUserSubmissions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const submissionType = req.query.submissionType;

    const filter = { userId: req.params.userId };
    if (submissionType) filter.submissionType = submissionType;

    const [submissions, total] = await Promise.all([
      Submission.find(filter)
        .populate({ path: 'linkedIssueId', populate: { path: 'userId', select: 'name avatar' } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Submission.countDocuments(filter),
    ]);

    res.json({
      data: submissions,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    next(error);
  }
};

// Get recent deeds (approved) - community feed
exports.getRecentDeeds = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const submissions = await Submission.find({
      status: 'approved',
      $or: [{ submissionType: 'deed' }, { submissionType: { $exists: false } }, { submissionType: null }],
    })
      .populate('userId', 'name avatar')
      .populate({ path: 'linkedIssueId', populate: { path: 'userId', select: 'name avatar' } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ data: submissions });
  } catch (error) {
    next(error);
  }
};

// Get recent addressed issues (approved) with deed counts
exports.getRecentIssues = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const issues = await Submission.find({ status: 'approved', submissionType: 'issue' })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Get deed counts for each issue
    if (issues.length > 0) {
      const issueIds = issues.map(i => i._id);
      const deedCounts = await Submission.aggregate([
        { $match: { linkedIssueId: { $in: issueIds }, submissionType: 'deed' } },
        { $group: { _id: '$linkedIssueId', total: { $sum: 1 }, approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } } } },
      ]);

      const countMap = {};
      deedCounts.forEach(c => { countMap[c._id.toString()] = { total: c.total, approved: c.approved }; });

      issues.forEach(issue => {
        const counts = countMap[issue._id.toString()] || { total: 0, approved: 0 };
        issue.deedCount = counts.total;
        issue.approvedDeedCount = counts.approved;
      });
    }

    res.json({ data: issues });
  } catch (error) {
    next(error);
  }
};

// Get all deeds for a specific issue
exports.getDeedsByIssue = async (req, res, next) => {
  try {
    const deeds = await Submission.find({
      linkedIssueId: req.params.id,
      submissionType: 'deed',
    })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ data: deeds });
  } catch (error) {
    next(error);
  }
};

// Deed an addressed issue: creates a new deed submission linked to the issue
// Multiple users can deed the same issue (one-to-many)
exports.deedIssue = async (req, res, next) => {
  try {
    const issue = await Submission.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });
    if (issue.submissionType !== 'issue') return res.status(400).json({ message: 'This is not an issue' });
    if (issue.status !== 'approved') return res.status(400).json({ message: 'Issue is not approved yet' });

    const { title, description, youtubeUrl } = req.body;

    const deedData = {
      userId: req.userId,
      title: title || `Deed for: ${issue.title}`,
      description: description || `Completed the addressed issue: ${issue.title}`,
      submissionType: 'deed',
      linkedIssueId: issue._id,
      location: issue.location,
      address: issue.address,
      status: 'pending', // needs admin approval
    };

    if (youtubeUrl) deedData.youtubeUrl = youtubeUrl;

    // Handle uploads
    if (req.files?.images && req.files.images.length > 0) {
      deedData.images = req.files.images.map((file) => ({
        url: file.location,
        key: file.key,
      }));
      deedData.imageUrl = req.files.images[0].location;
      deedData.imageKey = req.files.images[0].key;
    } else if (req.files?.image?.[0]) {
      deedData.images = [{ url: req.files.image[0].location, key: req.files.image[0].key }];
      deedData.imageUrl = req.files.image[0].location;
      deedData.imageKey = req.files.image[0].key;
    }

    if (req.files?.video?.[0]) {
      deedData.videoUrl = req.files.video[0].location;
      deedData.videoKey = req.files.video[0].key;
    }

    const deed = await Submission.create(deedData);
    await User.findByIdAndUpdate(req.userId, { $inc: { totalSubmissions: 1 } });

    res.status(201).json({ message: 'Deed submitted for review', data: deed });
  } catch (error) {
    next(error);
  }
};

// Get user's public profile (karma, deeds, addressed issues)
exports.getUserPublicProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const [deeds, issues, rank] = await Promise.all([
      Submission.find({
        userId: req.params.userId,
        status: 'approved',
        $or: [{ submissionType: 'deed' }, { submissionType: { $exists: false } }, { submissionType: null }],
      })
        .populate({ path: 'linkedIssueId', populate: { path: 'userId', select: 'name avatar' } })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      Submission.find({ userId: req.params.userId, status: 'approved', submissionType: 'issue' })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      User.countDocuments({ karmaPoints: { $gt: user.karmaPoints || 0 } }),
    ]);

    // Get deed counts for issues
    if (issues.length > 0) {
      const issueIds = issues.map(i => i._id);
      const deedCounts = await Submission.aggregate([
        { $match: { linkedIssueId: { $in: issueIds }, submissionType: 'deed' } },
        { $group: { _id: '$linkedIssueId', total: { $sum: 1 }, approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } } } },
      ]);
      const countMap = {};
      deedCounts.forEach(c => { countMap[c._id.toString()] = { total: c.total, approved: c.approved }; });
      issues.forEach(issue => {
        const counts = countMap[issue._id.toString()] || { total: 0, approved: 0 };
        issue.deedCount = counts.total;
        issue.approvedDeedCount = counts.approved;
      });
    }

    res.json({
      data: {
        id: user._id,
        name: user.name,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location,
        karmaPoints: user.karmaPoints || 0,
        rank: rank + 1,
        createdAt: user.createdAt,
        deeds,
        issues,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Backward compat alias
exports.getRecentActivities = exports.getRecentDeeds;
