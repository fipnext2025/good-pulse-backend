const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    videoUrl: {
      type: String,
      required: true,
    },
    videoKey: {
      type: String,
      default: '',
    },
    thumbnailUrl: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: ['youtube', 'uploaded'],
      required: true,
    },
    youtubeVideoId: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

videoSchema.index({ createdAt: -1 });
videoSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Video', videoSchema);
