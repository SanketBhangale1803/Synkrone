const mongoose = require('mongoose');
const plm = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
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
  specialization: {
    type: String,
    required: false,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'doctor', 'admin'],
    default: 'user',
    index: true
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: function() { return this.role === 'doctor'; }
  }
}, {
  timestamps: true
});

userSchema.plugin(plm);

const User = mongoose.model('User', userSchema);
module.exports = User;