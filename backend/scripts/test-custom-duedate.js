const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

const API_BASE = 'http://localhost:5001/api';

async function runTests() {
  console.log('--- Starting Custom Due Date Registration Tests ---');
  try {
    let uri = process.env.MONGODB_URI;
    if (!uri || uri === 'memory') {
      uri = 'mongodb://127.0.0.1:27017/event-management';
    }
    await mongoose.connect(uri);

    // Setup dates
    const today = new Date();
    
    const eventDate = new Date();
    eventDate.setDate(today.getDate() + 5); // Event in 5 days
    const eventDateStr = eventDate.toISOString().split('T')[0];

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // 1. Create Event with dueDate set to yesterday (registration closed)
    console.log('Creating event with deadline set to yesterday (should be closed for booking)...');
    const res1 = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Closed Event Test',
        description: 'Should fail booking',
        date: eventDateStr,
        dueDate: yesterdayStr,
        time: '10:00 - 12:00',
        venue: 'CS Seminar Hall A',
        capacity: 50,
        createdBy: 'madhu'
      })
    });
    const event1 = await res1.json();
    console.log(`Event created: ${event1.title}, ID: ${event1._id}`);

    // Try booking for closed event
    console.log('Attempting to book a ticket for closed event...');
    const bookRes1 = await fetch(`${API_BASE}/events/${event1._id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: 'Test Student',
        studentEmail: 'student@student.tce.edu',
        studentPhone: '+91 99999 00000',
        foodPreference: 'veg',
        quantity: 1
      })
    });
    const bookData1 = await bookRes1.json();
    console.log(`Response status: ${bookRes1.status}`);
    console.log(`Response message: "${bookData1.message}"`);
    if (bookRes1.status !== 400 || !bookData1.message.includes('Registration Closed')) {
      throw new Error('Expected registration to fail with Closed status.');
    }
    console.log('Closed deadline booking correctly rejected!');

    // 2. Create Event with dueDate set to tomorrow (registration open)
    console.log('\nCreating event with deadline set to tomorrow (should be open for booking)...');
    const res2 = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Open Event Test',
        description: 'Should succeed booking',
        date: eventDateStr,
        dueDate: tomorrowStr,
        time: '10:00 - 12:00',
        venue: 'CS Seminar Hall B',
        capacity: 50,
        createdBy: 'madhu'
      })
    });
    const event2 = await res2.json();
    console.log(`Event created: ${event2.title}, ID: ${event2._id}`);

    // Try booking for open event
    console.log('Attempting to book a ticket for open event...');
    const bookRes2 = await fetch(`${API_BASE}/events/${event2._id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: 'Test Student',
        studentEmail: 'student@student.tce.edu',
        studentPhone: '+91 99999 00000',
        foodPreference: 'veg',
        quantity: 1
      })
    });
    const bookData2 = await bookRes2.json();
    console.log(`Response status: ${bookRes2.status}`);
    if (bookRes2.status !== 201) {
      throw new Error(`Expected booking to succeed (201), got ${bookRes2.status}: ${bookData2.message}`);
    }
    console.log('Open deadline booking successfully approved!');

    // Cleanup
    await Event.deleteOne({ _id: event1._id });
    await Event.deleteOne({ _id: event2._id });
    await Registration.deleteMany({ eventId: event2._id });

    await mongoose.disconnect();
    console.log('\n--- All Custom Due Date Tests Passed Successfully! ---');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
