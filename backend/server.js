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
    let uri = process.env.MONGO_URI;

    if (!uri) {
      console.log('No MONGO_URI environment variable found. Starting local persistent database...');
      const path = require('path');
      const fs = require('fs');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      
      const dbDirectory = path.join(__dirname, 'db_data');
      if (!fs.existsSync(dbDirectory)) {
        fs.mkdirSync(dbDirectory, { recursive: true });
      }

      const mongoServer = await MongoMemoryServer.create({
        instance: {
          port: 27017,
          dbName: 'event-management',
          dbPath: dbDirectory,
          storageEngine: 'wiredTiger'
        }
      });
      uri = mongoServer.getUri();
      console.log(`Persistent MongoDB started at: ${uri}`);
    }

    await mongoose.connect(uri, { dbName: 'event-management' });
    console.log('MongoDB connected successfully.');
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
