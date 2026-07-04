const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

const API_BASE = 'http://localhost:5001/api';

async function runTests() {
  console.log('--- Starting Auto-Seed and Auto-Cleanup Integration Tests ---');
  try {
    // Connect directly to DB to inspect counts
    let uri = process.env.MONGODB_URI;
    if (!uri || uri === 'memory') {
      uri = 'mongodb://127.0.0.1:27017/event-management';
    }
    await mongoose.connect(uri);

    // 1. Clear database events to trigger auto-seed
    console.log('Clearing Event collection in DB...');
    await Event.deleteMany({});
    await Registration.deleteMany({});

    // 2. Query listEvents endpoint (should trigger auto-seed)
    console.log('Querying listEvents endpoint...');
    const res = await fetch(`${API_BASE}/events`);
    if (!res.ok) {
      throw new Error(`Failed to list events: ${res.statusText}`);
    }
    const events = await res.json();
    console.log(`Events returned: ${events.length}`);

    // Verify 6 events are seeded
    const dbCount = await Event.countDocuments({});
    console.log(`Database events count: ${dbCount}`);
    if (dbCount !== 6) {
      throw new Error(`Expected 6 seeded events, got ${dbCount}`);
    }
    console.log('Auto-seed verification passed!');

    // 3. Test Auto-Cleanup of past events
    console.log('\nInserting a past event in DB...');
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 2); // 2 days ago

    const pastEvent = new Event({
      title: 'Ended Fest',
      description: 'Past event should be deleted',
      date: pastDate,
      time: '10:00 - 12:00',
      venue: 'Old Gym',
      capacity: 50,
      status: 'approved',
      createdBy: 'Organiser'
    });
    await pastEvent.save();

    const dbCountAfterInsert = await Event.countDocuments({});
    console.log(`Database events count after past event insert: ${dbCountAfterInsert}`);
    if (dbCountAfterInsert !== 7) {
      throw new Error(`Expected 7 events, got ${dbCountAfterInsert}`);
    }

    // Call endpoint again to trigger cleanup
    console.log('Querying listEvents again to trigger cleanup...');
    const res2 = await fetch(`${API_BASE}/events`);
    const events2 = await res2.json();
    console.log(`Events returned after cleanup: ${events2.length}`);

    const dbCountAfterCleanup = await Event.countDocuments({});
    console.log(`Database events count after cleanup: ${dbCountAfterCleanup}`);
    if (dbCountAfterCleanup !== 6) {
      throw new Error(`Expected 6 events after cleanup, got ${dbCountAfterCleanup}`);
    }

    // Verify past event was deleted
    const foundPast = await Event.findOne({ title: 'Ended Fest' });
    if (foundPast) {
      throw new Error('Ended event was not deleted by cleanup script');
    }
    console.log('Auto-cleanup verification passed!');

    await mongoose.disconnect();
    console.log('\n--- All Auto-Seed and Auto-Cleanup Tests Passed Successfully! ---');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
