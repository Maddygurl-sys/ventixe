const mongoose = require('mongoose');
const Event = require('../models/Event');

const API_BASE = 'http://localhost:5001/api';

async function runTests() {
  console.log('--- Starting 3-Month Creation Limit Integration Tests ---');
  try {
    let uri = process.env.MONGODB_URI;
    if (!uri || uri === 'memory') {
      uri = 'mongodb://127.0.0.1:27017/event-management';
    }
    await mongoose.connect(uri);

    // 1. Attempt creating event 2 months in the future (within limit, should succeed)
    console.log('Attempting to create event 2 months in future...');
    const validDate = new Date();
    validDate.setMonth(validDate.getMonth() + 2);
    
    // Format YYYY-MM-DD
    const validDateStr = validDate.toISOString().split('T')[0];

    const res1 = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Valid Future Fest',
        description: 'Should be successfully created',
        date: validDateStr,
        time: '10:00 - 12:00',
        venue: 'CS Seminar Hall',
        capacity: 50,
        createdBy: 'madhu'
      })
    });
    
    const data1 = await res1.json();
    console.log(`Response status: ${res1.status}`);
    if (res1.status !== 201) {
      throw new Error(`Expected 201, got ${res1.status}: ${data1.message}`);
    }
    console.log('Event inside 3-month window successfully created!');

    // 2. Attempt creating event 4 months in the future (outside limit, should fail)
    console.log('\nAttempting to create event 4 months in future (outside 3-month window)...');
    const invalidDate = new Date();
    invalidDate.setMonth(invalidDate.getMonth() + 4);
    const invalidDateStr = invalidDate.toISOString().split('T')[0];

    const res2 = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Too Far Future Fest',
        description: 'Should be rejected',
        date: invalidDateStr,
        time: '10:00 - 12:00',
        venue: 'CS Seminar Hall',
        capacity: 50,
        createdBy: 'madhu'
      })
    });

    const data2 = await res2.json();
    console.log(`Response status: ${res2.status}`);
    console.log(`Response message: "${data2.message}"`);
    if (res2.status !== 400 || data2.message !== 'Event date must be within the next 3 months.') {
      throw new Error('Backend failed to reject event scheduled beyond the 3-month limit.');
    }
    console.log('Event outside 3-month window successfully rejected!');

    // Clean up valid event
    await Event.deleteOne({ _id: data1._id });

    await mongoose.disconnect();
    console.log('\n--- All 3-Month Window Limit Tests Passed Successfully! ---');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
