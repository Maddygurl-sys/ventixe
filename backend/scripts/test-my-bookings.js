const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

const API_BASE = 'http://localhost:5001/api';

async function runTests() {
  console.log('--- Starting My Booked Tickets Integration Tests ---');
  try {
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

    // 2. Register student with a unique name
    const studentName = 'Test Student ' + Date.now();
    const studentEmail = 'teststudent@student.tce.edu';
    console.log(`\nRegistering student: "${studentName}"...`);
    const regRes = await fetch(`${API_BASE}/events/${event._id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName,
        studentEmail,
        studentPhone: '8888888888',
        foodPreference: 'veg'
      })
    });

    if (!regRes.ok) {
      const err = await regRes.json();
      throw new Error(`Registration failed: ${err.message}`);
    }
    console.log('Registration succeeded!');

    // 3. Query bookings for this student
    console.log(`\nQuerying bookings for studentName="${studentName}"...`);
    const bookingsRes = await fetch(`${API_BASE}/events/my-bookings/list?studentName=${encodeURIComponent(studentName)}`);
    if (!bookingsRes.ok) {
      const err = await bookingsRes.json();
      throw new Error(`Failed to query bookings: ${err.message}`);
    }
    const bookings = await bookingsRes.json();
    console.log(`Returned bookings count: ${bookings.length}`);

    if (bookings.length !== 1) {
      throw new Error(`Expected exactly 1 booking, got ${bookings.length}`);
    }

    const booking = bookings[0];
    console.log('Booking details verified:');
    console.log(`- Student Name: ${booking.studentName}`);
    console.log(`- Event Title: ${booking.eventId?.title}`);
    console.log(`- Event Venue: ${booking.eventId?.venue}`);

    if (booking.studentName !== studentName) {
      throw new Error('Returned booking studentName mismatch');
    }
    if (!booking.eventId || booking.eventId.title !== event.title) {
      throw new Error('Populated Event details mismatch or missing');
    }

    console.log('\n--- All My Booked Tickets Tests Passed Successfully! ---');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
