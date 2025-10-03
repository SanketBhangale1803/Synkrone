const mongoose = require('mongoose');
const plm = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
  fullname: String,
  email: String,
  user_id: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  fullname: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  avatar: {
    type: String
  },
  specialization: {
    type: String,
    required: false,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'doctor', 'admin'],
    required: true, // Make role required instead of having a default
    index: true
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: function() { return this.role === 'doctor'; }
  },
  pushSubscription: {
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String
    }
  }
}, {
  timestamps: true
});

userSchema.plugin(plm);

const User = mongoose.model('User', userSchema);
module.exports = User;