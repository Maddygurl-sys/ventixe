const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true,
    lowercase: true
  },
  activityType: {
    type: String,
    required: true,
    enum: ['LOGIN', 'REGISTER', 'REGISTER_EVENT', 'CHECKIN', 'CANCEL_EVENT']
  },
  description: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Activity', activitySchema);
