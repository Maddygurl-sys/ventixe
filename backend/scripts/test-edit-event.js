const mongoose = require('mongoose');
const Event = require('../models/Event');

const API_BASE = 'http://localhost:5001/api';

async function runTests() {
  console.log('--- Starting Edit Event Integration Tests ---');
  try {
    let uri = process.env.MONGODB_URI;
    if (!uri || uri === 'memory') {
      uri = 'mongodb://127.0.0.1:27017/event-management';
    }
    await mongoose.connect(uri);

    // 1. Create a paid event
    console.log('Creating a paid event...');
    const createRes = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Original Fest',
        description: 'Original description',
        date: '2026-08-10',
        time: '10:00 - 12:00',
        venue: 'Main Hall',
        capacity: 100,
        createdBy: 'hostuser',
        isPaid: true,
        entryFee: 100,
        upiId: 'host@okaxis'
      })
    });
    const event = await createRes.json();
    console.log(`Event created: ${event.title}, ID: ${event._id}`);

    // 2. Try to edit with unauthorized user
    console.log('\nAttempting to edit event with unauthorized user...');
    const editUnauthorizedRes = await fetch(`${API_BASE}/events/${event._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Hacked Fest',
        requesterUsername: 'hackeruser'
      })
    });
    console.log(`Unauthorized edit status: ${editUnauthorizedRes.status}`);
    if (editUnauthorizedRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden, got ${editUnauthorizedRes.status}`);
    }

    // 3. Edit title & description with creator
    console.log('\nEditing title and description with creator...');
    const editCreatorRes = await fetch(`${API_BASE}/events/${event._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated Creator Fest',
        description: 'New Description',
        requesterUsername: 'hostuser'
      })
    });
    console.log(`Creator edit status: ${editCreatorRes.status}`);
    if (editCreatorRes.status !== 200) {
      throw new Error(`Expected 200 OK, got ${editCreatorRes.status}`);
    }
    const updatedEvent = await Event.findById(event._id);
    console.log(`Updated Title: ${updatedEvent.title}`);
    if (updatedEvent.title !== 'Updated Creator Fest' || updatedEvent.description !== 'New Description') {
      throw new Error('Title or description failed to update.');
    }

    // 4. Verify payment details are locked and cannot be edited
    console.log('\nVerifying payment details remain locked during updates...');
    const editPaymentRes = await fetch(`${API_BASE}/events/${event._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated Payment Fest',
        isPaid: false, // Attempting to turn off payment
        entryFee: 50,  // Attempting to change fee
        upiId: 'hacked@okaxis', // Attempting to hijack UPI
        requesterUsername: 'admin' // Even admin cannot change fixed payment details
      })
    });
    console.log(`Edit status: ${editPaymentRes.status}`);
    
    const finalEventObj = await Event.findById(event._id);
    console.log(`isPaid: ${finalEventObj.isPaid} (Expected: true)`);
    console.log(`entryFee: ${finalEventObj.entryFee} (Expected: 100)`);
    console.log(`upiId: ${finalEventObj.upiId} (Expected: host@okaxis)`);

    if (finalEventObj.isPaid !== true || finalEventObj.entryFee !== 100 || finalEventObj.upiId !== 'host@okaxis') {
      throw new Error('Security Breach: Payment details were modified during edit!');
    }
    console.log('Payment locks verified successfully!');

    // Cleanup
    await Event.deleteOne({ _id: event._id });
    await mongoose.disconnect();
    console.log('\n--- All Edit Event Tests Passed Successfully! ---');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
