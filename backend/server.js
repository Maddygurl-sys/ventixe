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

// Database Connection
let mongoServer;

async function connectDB() {
  try {
    let uri = process.env.MONGODB_URI;
    
    if (!uri || uri === 'memory') {
      const path = require('path');
      const fs = require('fs');
      const dbDirectory = path.join(__dirname, 'db_data');
      if (!fs.existsSync(dbDirectory)) {
        fs.mkdirSync(dbDirectory, { recursive: true });
      }

      console.log('Starting persistent local database in db_data on port 27017...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      try {
        mongoServer = await MongoMemoryServer.create({
          instance: {
            port: 27017,
            dbName: 'event-management',
            dbPath: dbDirectory,
            storageEngine: 'wiredTiger'
          }
        });
        uri = mongoServer.getUri();
        if (uri.endsWith('/')) {
          uri += 'event-management';
        } else {
          uri += '/event-management';
        }
        console.log(`Persistent MongoDB started at: ${uri}`);
      } catch (err) {
        if (err.message.includes('EADDRINUSE') || err.message.includes('port') || err.code === 'EADDRINUSE') {
          console.log('Port 27017 is busy. Connecting directly to local MongoDB...');
          uri = 'mongodb://127.0.0.1:27017/event-management';
        } else {
          throw err;
        }
      }
    }
    
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully.');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
}

connectDB();

const eventRoutes = require('./routes/eventRoutes');
const checkinRoutes = require('./routes/checkinRoutes');
const authRoutes = require('./routes/authRoutes');

// Routes
app.use('/api/events', eventRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/auth', authRoutes);

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: 'Smart Event Management Portal API is running.' });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown for memory server
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  if (mongoServer) {
    await mongoServer.stop();
    console.log('In-memory MongoDB stopped.');
  }
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
});

module.exports = app;
