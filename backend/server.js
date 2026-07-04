const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// ===============================
// Database Connection
// ===============================
async function connectDB() {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error('MONGO_URI is not defined in environment variables.');
    }

    await mongoose.connect(uri);

    console.log('MongoDB Atlas connected successfully.');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
}

connectDB();

// ===============================
// Routes
// ===============================
const eventRoutes = require('./routes/eventRoutes');
const checkinRoutes = require('./routes/checkinRoutes');
const authRoutes = require('./routes/authRoutes');

app.use('/api/events', eventRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/auth', authRoutes);

// ===============================
// Home Route
// ===============================
app.get('/', (req, res) => {
  res.json({
    message: 'Smart Event Management Portal API is running.'
  });
});

// ===============================
// Start Server
// ===============================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
