const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  studentName: {
    type: String,
    required: true,
    trim: true,
  },
  studentEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  studentPhone: {
    type: String,
    required: true,
  },
  foodPreference: {
    type: String,
    enum: ['veg', 'non-veg', 'none'],
    default: 'none',
  },
  registeredAt: {
    type: Date,
    default: Date.now,
  },
  checkedIn: {
    type: Boolean,
    default: false,
  },
  paymentStatus: {
    type: String,
    enum: ['free', 'pending', 'paid'],
    default: 'free',
  },
  upiTransactionId: {
    type: String,
    default: '',
  },
  qrCode: {
    type: String, // String representation of the QR code (Data URL or unique verification link)
    required: true,
  },
  bookedBy: {
    type: String,
    trim: true,
  }
});

module.exports = mongoose.model('Registration', registrationSchema);
