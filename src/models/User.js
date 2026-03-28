const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 50,
      default: '',
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
      index: { unique: true, sparse: true },
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
    },
    isRegistered: {
      type: Boolean,
      default: false,
    },
    // password: {
    //   type: String,
    //   minlength: 6,
    //   select: false,
    // },
    avatar: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      maxlength: 200,
      default: '',
    },
    location: {
      area: { type: String, default: '' },
      city: { type: String, default: '' },
      district: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: '' },
      coordinates: {
        latitude: { type: Number, default: 0 },
        longitude: { type: Number, default: 0 },
      },
    },
    karmaPoints: {
      type: Number,
      default: 0,
    },
    totalSubmissions: {
      type: Number,
      default: 0,
    },
    approvedSubmissions: {
      type: Number,
      default: 0,
    },
    pushTokens: [
      {
        token: { type: String, required: true },
        platform: { type: String, enum: ['ios', 'android', 'web'], default: 'android' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    notificationPreferences: {
      pushEnabled: { type: Boolean, default: true },
      submissionUpdates: { type: Boolean, default: true },
      streamAlerts: { type: Boolean, default: true },
      communityUpdates: { type: Boolean, default: true },
    },
    // socialProvider: {
    //   type: String,
    //   enum: ['google', 'facebook', null],
    //   default: null,
    // },
    // socialId: {
    //   type: String,
    //   default: null,
    // },
  },
  {
    timestamps: true,
  }
);

// Index for leaderboard queries
userSchema.index({ karmaPoints: -1 });
userSchema.index({ 'location.city': 1, karmaPoints: -1 });
userSchema.index({ 'location.district': 1, karmaPoints: -1 });
userSchema.index({ 'location.state': 1, karmaPoints: -1 });
userSchema.index({ 'location.country': 1, karmaPoints: -1 });
userSchema.index({ 'location.area': 1, karmaPoints: -1 });

// Hash password before saving (commented out - future use with password login)
// userSchema.pre('save', async function (next) {
//   if (!this.isModified('password') || !this.password) return next();
//   this.password = await bcrypt.hash(this.password, 12);
//   next();
// });

// Compare password (commented out - future use with password login)
// userSchema.methods.comparePassword = async function (candidatePassword) {
//   return bcrypt.compare(candidatePassword, this.password);
// };

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
