const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
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
      required: [true, 'Description is required'],
      trim: true,
      maxlength: 500,
    },
    // Multiple images
    images: [
      {
        url: { type: String },
        key: { type: String },
      },
    ],
    // Single legacy image fields (backward compat)
    imageUrl: { type: String, default: '' },
    imageKey: { type: String, default: '' },
    // Single video
    videoUrl: { type: String, default: '' },
    videoKey: { type: String, default: '' },
    // YouTube link
    youtubeUrl: { type: String, default: '' },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    address: {
      city: { type: String, default: '' },
      region: { type: String, default: '' },
      country: { type: String, default: '' },
      formattedAddress: { type: String, default: '' },
    },
    submissionType: {
      type: String,
      enum: ['deed', 'issue'],
      default: 'deed',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    // For deeds that solve an addressed issue
    linkedIssueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      default: null,
    },
    karmaPoints: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// GeoJSON 2dsphere index for location-based queries
submissionSchema.index({ location: '2dsphere' });
submissionSchema.index({ userId: 1, createdAt: -1 });
submissionSchema.index({ status: 1, createdAt: -1 });
submissionSchema.index({ submissionType: 1, status: 1, createdAt: -1 });
submissionSchema.index({ linkedIssueId: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
