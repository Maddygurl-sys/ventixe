const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: String,
    required: true, // "admin" or username
  },
  sender: {
    type: String,
    required: true, // username or "admin"
  },
  type: {
    type: String,
    required: true,
    enum: ['EVENT_REQUEST', 'EVENT_APPROVED', 'EVENT_DECLINED', 'SYSTEM'],
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  relatedEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'declined', 'seen'],
    default: 'pending',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
