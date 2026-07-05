const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

const API_BASE = 'http://localhost:5001/api';

async function runTests() {
  console.log('--- Starting Hide Concluded Bookings Integration Tests ---');
  try {
    let uri = process.env.MONGODB_URI;
    if (!uri || uri === 'memory') {
      uri = 'mongodb://127.0.0.1:27017/event-management';
    }
    await mongoose.connect(uri);

    const testUsername = 'scopinguser_' + Date.now();

    // 1. Create a future event (concludes in 3 days)
    console.log('Creating a future event...');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const res1 = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Active Future Fest',
        description: 'Should show ticket',
        date: futureDateStr,
        time: '10:00 - 12:00',
        venue: 'CS Hall A',
        capacity: 50,
        createdBy: 'admin'
      })
    });
    const event = await res1.json();
    console.log(`Event created: ${event.title}, ID: ${event._id}`);

    // 2. Book a ticket for this future event
    console.log(`Booking ticket for ${testUsername}...`);
    const bookRes = await fetch(`${API_BASE}/events/${event._id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: 'Attendee Bob',
        studentEmail: 'bob@student.tce.edu',
        studentPhone: '+91 99999 11111',
        foodPreference: 'veg',
        quantity: 1,
        bookedBy: testUsername
      })
    });
    const bookData = await bookRes.json();
    console.log(`Booking status: ${bookRes.status}`);

    // 3. Query bookings for this user - should return the ticket (event is active)
    console.log(`\nQuerying active bookings for bookedBy="${testUsername}"...`);
    const activeRes = await fetch(`${API_BASE}/events/my-bookings/list?bookedBy=${testUsername}`);
    const activeBookings = await activeRes.json();
    console.log(`Active bookings count: ${activeBookings.length}`);
    if (activeBookings.length !== 1) {
      throw new Error('Expected ticket to be visible because event is upcoming.');
    }
    console.log('Ticket is correctly visible while event is active!');

    // 4. Force the event's date into the past (ended yesterday)
    console.log('\nSimulating event conclusion (updating event date to yesterday)...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await Event.updateOne({ _id: event._id }, { date: yesterday });

    // 5. Query bookings again - should return empty list (event has ended)
    console.log(`Querying bookings for bookedBy="${testUsername}" after event ended...`);
    const endedRes = await fetch(`${API_BASE}/events/my-bookings/list?bookedBy=${testUsername}`);
    const endedBookings = await endedRes.json();
    console.log(`Concluded bookings count: ${endedBookings.length}`);
    if (endedBookings.length !== 0) {
      throw new Error('Ticket is still visible after event concluded! It should be hidden.');
    }
    console.log('Ticket is correctly hidden after the event concluded!');

    // Cleanup
    await Event.deleteOne({ _id: event._id });
    await Registration.deleteMany({ eventId: event._id });

    await mongoose.disconnect();
    console.log('\n--- All Hide Concluded Bookings Tests Passed Successfully! ---');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
