const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

const API_BASE = 'http://localhost:5001/api';

async function runTests() {
  console.log('--- Starting Student Email Domain Validation Integration Tests ---');
  try {
    let uri = process.env.MONGODB_URI;
    if (!uri || uri === 'memory') {
      uri = 'mongodb://127.0.0.1:27017/event-management';
    }
    await mongoose.connect(uri);

    // 1. Ensure server is active by listing events
    const resList = await fetch(`${API_BASE}/events`);
    if (!resList.ok) {
      throw new Error('Backend server is not running on port 5001');
    }
    const events = await resList.json();
    if (events.length === 0) {
      throw new Error('No events seeded in database. Run seed first.');
    }
    const event = events[0];
    console.log(`Using Event: "${event.title}" (ID: ${event._id})`);

    // 2. Register student with invalid email domain (gmail.com)
    console.log('\nAttempting registration with invalid email domain: "bob@gmail.com"...');
    const regRes1 = await fetch(`${API_BASE}/events/${event._id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: 'Bob Student',
        studentEmail: 'bob@gmail.com',
        studentPhone: '9999999999',
        foodPreference: 'veg'
      })
    });
    console.log(`Response status: ${regRes1.status}`);
    const data1 = await regRes1.json();
    console.log(`Response message: "${data1.message}"`);
    if (regRes1.status !== 400 || data1.message !== 'Only student email addresses from @student.tce.edu are allowed.') {
      throw new Error('Invalid email domain check failed: Expected rejection but was approved or wrong message.');
    }
    console.log('Invalid email domain correctly rejected!');

    // 3. Register student with invalid subdomain (tce.edu instead of student.tce.edu)
    console.log('\nAttempting registration with invalid subdomain: "bob@tce.edu"...');
    const regRes2 = await fetch(`${API_BASE}/events/${event._id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: 'Bob Student',
        studentEmail: 'bob@tce.edu',
        studentPhone: '9999999999',
        foodPreference: 'veg'
      })
    });
    console.log(`Response status: ${regRes2.status}`);
    const data2 = await regRes2.json();
    console.log(`Response message: "${data2.message}"`);
    if (regRes2.status !== 400 || data2.message !== 'Only student email addresses from @student.tce.edu are allowed.') {
      throw new Error('Invalid subdomain check failed: Expected rejection.');
    }
    console.log('Invalid subdomain correctly rejected!');

    // 4. Register student with valid email domain (alice@student.tce.edu)
    const validEmail = `alice_${Date.now()}@student.tce.edu`;
    console.log(`\nAttempting registration with valid email domain: "${validEmail}"...`);
    const regRes3 = await fetch(`${API_BASE}/events/${event._id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: 'Alice Student',
        studentEmail: validEmail,
        studentPhone: '9999999999',
        foodPreference: 'veg'
      })
    });
    console.log(`Response status: ${regRes3.status}`);
    if (regRes3.status !== 201) {
      const err = await regRes3.json();
      throw new Error(`Valid email domain registration failed: ${err.message}`);
    }
    console.log('Valid email domain successfully registered!');

    // Cleanup valid test registration
    await Registration.deleteMany({ studentEmail: validEmail });

    await mongoose.disconnect();
    console.log('\n--- All Student Email Validation Tests Passed Successfully! ---');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
