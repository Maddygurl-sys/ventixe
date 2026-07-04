const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true, // Stores the date of the event
  },
  time: {
    type: String,
    required: true, // e.g. "14:00 - 16:00"
  },
  venue: {
    type: String,
    required: true,
  },
  capacity: {
    type: Number,
    required: true,
    min: 1,
  },
  createdBy: {
    type: String,
    default: 'Organiser',
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'declined'],
    default: 'approved',
  },
  foodMenu: {
    type: String,
    default: 'None',
  },
  coordinatorName: {
    type: String,
    default: 'Organiser',
  },
  coordinatorPhone: {
    type: String,
    default: '',
  },
  isPaid: {
    type: Boolean,
    default: false,
  },
  entryFee: {
    type: Number,
    default: 0,
  },
  upiId: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Event', eventSchema);
