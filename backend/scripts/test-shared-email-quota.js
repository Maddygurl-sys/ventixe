const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

const API_BASE = 'http://localhost:5001/api';

async function runTests() {
  console.log('--- Starting Shared Email Quota Integration Tests ---');
  try {
    let uri = process.env.MONGODB_URI;
    if (!uri || uri === 'memory') {
      uri = 'mongodb://127.0.0.1:27017/event-management';
    }
    await mongoose.connect(uri);

    // 1. Create a free test event
    console.log('Creating a test event...');
    const createRes = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Quota Shared Fest',
        description: 'Test quota limit across diff users with same email',
        date: '2026-08-20',
        time: '10:00 - 12:00',
        venue: 'CS Seminar Hall B',
        capacity: 10,
        createdBy: 'admin'
      })
    });
    const event = await createRes.json();
    console.log(`Event created: ${event.title}, ID: ${event._id}`);

    const sharedEmail = 'shared_holder@student.tce.edu';

    // 2. User 1 (u1) books 3 tickets with sharedEmail
    console.log('\nUser 1 booking 3 tickets with sharedEmail...');
    const bookU1Res = await fetch(`${API_BASE}/events/${event._id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: 'Student Alice',
        studentEmail: sharedEmail,
        studentPhone: '+91 99999 11111',
        foodPreference: 'veg',
        quantity: 3,
        bookedBy: 'user_u1'
      })
    });
    console.log(`User 1 booking status: ${bookU1Res.status}`);
    if (bookU1Res.status !== 201) {
      throw new Error(`Expected 201, got ${bookU1Res.status}`);
    }

    // 3. User 2 (u2) attempts to book 3 tickets with the SAME sharedEmail
    console.log('\nUser 2 attempting to book 3 tickets with the SAME sharedEmail (total would be 6)...');
    const bookU2Res = await fetch(`${API_BASE}/events/${event._id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: 'Student Bob',
        studentEmail: sharedEmail,
        studentPhone: '+91 99999 22222',
        foodPreference: 'non-veg',
        quantity: 3,
        bookedBy: 'user_u2'
      })
    });
    console.log(`User 2 booking status: ${bookU2Res.status}`);
    const dataU2 = await bookU2Res.json();
    console.log(`User 2 response message: "${dataU2.message}"`);

    if (bookU2Res.status !== 400) {
      throw new Error(`Expected 400 Bad Request, got ${bookU2Res.status}`);
    }
    if (dataU2.message !== 'You cannot book more than 5 tickets.') {
      throw new Error(`Expected quota error, got: ${dataU2.message}`);
    }
    console.log('Shared email quota limit check successfully blocked exceeding bookings!');

    // Cleanup
    await Event.deleteOne({ _id: event._id });
    await Registration.deleteMany({ eventId: event._id });
    await mongoose.disconnect();
    console.log('\n--- All Shared Email Quota Tests Passed Successfully! ---');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
