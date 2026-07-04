const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

const API_BASE = 'http://localhost:5001/api';

async function runTests() {
  console.log('--- Starting Ticket Quantity & Limit Constraints Tests ---');
  try {
    let uri = process.env.MONGODB_URI;
    if (!uri || uri === 'memory') {
      uri = 'mongodb://127.0.0.1:27017/event-management';
    }
    await mongoose.connect(uri);

    // 1. Setup a test event with capacity = 8
    console.log('Creating a test event with capacity 8...');
    await Event.deleteMany({ title: 'Limit Test Fest' });
    
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 3); // 3 days in future

    const testEvent = new Event({
      title: 'Limit Test Fest',
      description: 'Test event for booking limits',
      date: eventDate,
      time: '10:00 - 12:00',
      venue: 'Test Arena',
      capacity: 8,
      status: 'approved',
      createdBy: 'Organiser'
    });
    await testEvent.save();
    const eventId = testEvent._id.toString();

    // Clean any prior registrations for this event
    await Registration.deleteMany({ eventId });

    // 2. Book 3 tickets for Student Bob (should succeed)
    console.log('\nBooking 3 tickets for Student Bob...');
    const res1 = await fetch(`${API_BASE}/events/${eventId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: 'Student Bob',
        studentEmail: 'bob@college.edu',
        studentPhone: '+91 99999 11111',
        foodPreference: 'veg',
        quantity: 3
      })
    });
    const data1 = await res1.json();
    console.log(`Response status: ${res1.status}`);
    console.log('data1:', JSON.stringify(data1, null, 2));
    
    if (res1.status !== 201 || !data1.registrations || data1.registrations.length !== 3) {
      throw new Error('Failed to book 3 tickets for Bob.');
    }

    // Verify Bob has 3 tickets in DB
    const bobDbCount = await Registration.countDocuments({ eventId, studentName: 'Student Bob' });
    console.log(`Registrations in DB for Bob: ${bobDbCount}`);
    if (bobDbCount !== 3) {
      throw new Error(`Expected 3 tickets for Bob in DB, found ${bobDbCount}`);
    }

    // 3. Try booking 3 more tickets for Bob (total would be 6, should fail because > 5 limit)
    console.log('\nAttempting to book 3 more tickets for Bob (total would be 6, limit is 5)...');
    const res2 = await fetch(`${API_BASE}/events/${eventId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: 'Student Bob',
        studentEmail: 'bob@college.edu',
        studentPhone: '+91 99999 11111',
        foodPreference: 'veg',
        quantity: 3
      })
    });
    const data2 = await res2.json();
    console.log(`Response status: ${res2.status}`);
    console.log(`Response message: "${data2.message}"`);
    if (res2.status !== 400 || data2.message !== 'You cannot book more than 5 tickets.') {
      throw new Error('Expected 400 error with message "You cannot book more than 5 tickets."');
    }
    console.log('Quota limit constraint verification passed!');

    // 4. Book 2 tickets for Bob (total becomes 5, should succeed)
    console.log('\nBooking 2 more tickets for Bob to reach the limit of 5...');
    const res3 = await fetch(`${API_BASE}/events/${eventId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: 'Student Bob',
        studentEmail: 'bob@college.edu',
        studentPhone: '+91 99999 11111',
        foodPreference: 'veg',
        quantity: 2
      })
    });
    console.log(`Response status: ${res3.status}`);
    if (res3.status !== 201) {
      throw new Error('Expected registration success when total is exactly 5.');
    }

    const finalBobDbCount = await Registration.countDocuments({ eventId, studentName: 'Student Bob' });
    console.log(`Final registrations in DB for Bob: ${finalBobDbCount}`);
    if (finalBobDbCount !== 5) {
      throw new Error(`Expected exactly 5 tickets for Bob in DB, found ${finalBobDbCount}`);
    }

    // 5. Try to book 1 more ticket for Bob (total would be 6, should fail)
    console.log('\nAttempting to book 6th ticket for Bob...');
    const res4 = await fetch(`${API_BASE}/events/${eventId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: 'Student Bob',
        studentEmail: 'bob@college.edu',
        studentPhone: '+91 99999 11111',
        foodPreference: 'veg',
        quantity: 1
      })
    });
    const data4 = await res4.json();
    console.log(`Response status: ${res4.status}`);
    console.log(`Response message: "${data4.message}"`);
    if (res4.status !== 400 || data4.message !== 'You cannot book more than 5 tickets.') {
      throw new Error('Bob was allowed to exceed the 5-ticket limit!');
    }

    // 6. Book 3 tickets for Student Carol (event capacity is 8, current registrations = 5, quantity = 3, matches exactly, should succeed)
    console.log('\nBooking 3 tickets for Student Carol (filling capacity)...');
    const res5 = await fetch(`${API_BASE}/events/${eventId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: 'Student Carol',
        studentEmail: 'carol@college.edu',
        studentPhone: '+91 99999 22222',
        foodPreference: 'veg',
        quantity: 3
      })
    });
    console.log(`Response status: ${res5.status}`);
    if (res5.status !== 201) {
      throw new Error('Carol should be able to book 3 tickets to fill capacity.');
    }

    const totalRegs = await Registration.countDocuments({ eventId });
    console.log(`Total registrations in DB: ${totalRegs} / 8`);
    if (totalRegs !== 8) {
      throw new Error(`Expected total registrations to be 8, got ${totalRegs}`);
    }

    // 7. Try to book 1 ticket for Student David (event is full, should fail with "Event is full. Cannot book.")
    console.log('\nAttempting to book 1 ticket for Student David (event is full)...');
    const res6 = await fetch(`${API_BASE}/events/${eventId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: 'Student David',
        studentEmail: 'david@college.edu',
        studentPhone: '+91 99999 33333',
        foodPreference: 'veg',
        quantity: 1
      })
    });
    const data6 = await res6.json();
    console.log(`Response status: ${res6.status}`);
    console.log(`Response message: "${data6.message}"`);
    if (res6.status !== 400 || data6.message !== 'Event is full. Cannot book.') {
      throw new Error('Expected 400 error with message "Event is full. Cannot book."');
    }
    console.log('Capacity full constraint verification passed!');

    // Teardown
    console.log('\nCleaning up test data...');
    await Registration.deleteMany({ eventId });
    await Event.deleteOne({ _id: eventId });

    await mongoose.disconnect();
    console.log('\n--- All Ticket Quantity and Limit Constraints Tests Passed! ---');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    try {
      if (typeof eventId !== 'undefined') {
        await Registration.deleteMany({ eventId });
        await Event.deleteOne({ _id: eventId });
      }
      await mongoose.disconnect();
    } catch (e) {}
    process.exit(1);
  }
}

runTests();
