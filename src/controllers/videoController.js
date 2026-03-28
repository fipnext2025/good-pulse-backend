const Video = require('../models/Video');
const { deleteS3Object } = require('../config/s3');

// Extract YouTube video ID from various URL formats
const extractYoutubeId = (url) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

exports.upload = async (req, res, next) => {
  try {
    const { title, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Video file is required' });
    }

    const video = await Video.create({
      userId: req.userId,
      title,
      description,
      videoUrl: req.file.location,
      videoKey: req.file.key,
      type: 'uploaded',
    });

    res.status(201).json({ data: video });
  } catch (error) {
    next(error);
  }
};

exports.addYoutubeLink = async (req, res, next) => {
  try {
    const { title, description, youtubeUrl } = req.body;

    const videoId = extractYoutubeId(youtubeUrl);
    if (!videoId) {
      return res.status(400).json({ message: 'Invalid YouTube URL' });
    }

    const video = await Video.create({
      userId: req.userId,
      title,
      description,
      videoUrl: youtubeUrl,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      type: 'youtube',
      youtubeVideoId: videoId,
    });

    res.status(201).json({ data: video });
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [videos, total] = await Promise.all([
      Video.find()
        .populate('userId', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Video.countDocuments(),
    ]);

    res.json({
      data: videos,
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
    const video = await Video.findById(req.params.id)
      .populate('userId', 'name avatar')
      .lean();

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    res.json({ data: video });
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    if (video.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this video' });
    }

    // Delete from S3 if uploaded video
    if (video.type === 'uploaded' && video.videoKey) {
      await deleteS3Object(video.videoKey);
    }

    await Video.findByIdAndDelete(req.params.id);

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    next(error);
  }
};
