const mongoose = require('mongoose');

const liveStreamSchema = new mongoose.Schema(
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
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    streamUrl: {
      type: String,
      default: '',
    },
    thumbnailUrl: {
      type: String,
      default: '',
    },
    // 'admin' streams go live directly; 'user' streams need admin approval
    streamType: {
      type: String,
      enum: ['admin', 'user'],
      required: true,
    },
    status: {
      type: String,
      enum: ['requested', 'approved', 'live', 'paused', 'ended', 'rejected'],
      default: 'requested',
    },
    scheduledFrom: {
      type: Date,
      default: null,
    },
    scheduledTo: {
      type: Date,
      default: null,
    },
    // Keep legacy field for backward compatibility
    scheduledAt: {
      type: Date,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

liveStreamSchema.index({ status: 1, scheduledFrom: 1 });
liveStreamSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('LiveStream', liveStreamSchema);
