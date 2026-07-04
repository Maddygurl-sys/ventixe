const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

dotenv.config();

const API_BASE = 'http://localhost:5001/api';

async function runTests() {
  console.log('--- Starting API Integration Tests ---');
  
  try {
    // 1. Fetch events list
    console.log('\n1. Fetching all events...');
    const listRes = await fetch(`${API_BASE}/events`);
    if (!listRes.ok) throw new Error('Failed to list events');
    const events = await listRes.json();
    console.log(`Successfully fetched ${events.length} events.`);
    
    // Pick Arohan and Tiny Tans (which are on different days: July 15 and July 16)
    const arohan = events.find(e => e.title === 'Arohan');
    const tinyTans = events.find(e => e.title === 'Tiny Tans');
    
    if (!arohan || !tinyTans) {
      throw new Error('Seed events not found. Run seed script first.');
    }
    console.log(`Arohan ID: ${arohan._id}, Date: ${arohan.date.split('T')[0]}, Time: ${arohan.time}`);
    console.log(`Tiny Tans ID: ${tinyTans._id}, Date: ${tinyTans.date.split('T')[0]}, Time: ${tinyTans.time}`);

    // 2. Register Alice for Arohan
    console.log('\n2. Registering Alice for Arohan...');
    const regRes1 = await fetch(`${API_BASE}/events/${arohan._id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: 'Alice Smith',
        studentEmail: 'alice@college.edu'
      })
    });
    if (!regRes1.ok) {
      const errData = await regRes1.json();
      throw new Error(`Failed to register Alice: ${errData.message}`);
    }
    const aliceArohanTicket = await regRes1.json();
    console.log('Alice registered successfully!');
    console.log(`Ticket ID: ${aliceArohanTicket._id}`);
    console.log(`QR Code generated (Base64 length): ${aliceArohanTicket.qrCode.length}`);

    // 3. Register Alice again for Arohan (should fail)
    console.log('\n3. Registering Alice again for Arohan (expecting error 400)...');
    const regRes2 = await fetch(`${API_BASE}/events/${arohan._id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: 'Alice Smith',
        studentEmail: 'alice@college.edu'
      })
    });
    console.log(`Status code: ${regRes2.status}`);
    const regRes2Data = await regRes2.json();
    console.log(`Error message: ${regRes2Data.message}`);
    if (regRes2.status !== 400) {
      throw new Error('Expected status code 400 for duplicate registration');
    }

    // 4. Register Alice for Tiny Tans on a different day (should succeed)
    console.log('\n4. Registering Alice for Tiny Tans (different day, expecting success)...');
    const regRes3 = await fetch(`${API_BASE}/events/${tinyTans._id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: 'Alice Smith',
        studentEmail: 'alice@college.edu'
      })
    });
    if (!regRes3.ok) {
      const errData = await regRes3.json();
      throw new Error(`Failed to register Alice for Tiny Tans: ${errData.message}`);
    }
    console.log('Alice registered for Tiny Tans successfully!');

    // 5. Create a conflicting event (same day as Arohan: 2026-07-15, overlapping time: 10:00 - 12:00)
    console.log('\n5. Creating a conflicting event on the same day as Arohan...');
    const createConflictRes = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Arohan Conflict Event',
        description: 'Overlapping hackathon talk',
        date: '2026-07-15',
        time: '10:00 - 12:00',
        venue: 'CS Seminar Hall',
        capacity: 10
      })
    });
    if (!createConflictRes.ok) {
      throw new Error('Failed to create conflict event');
    }
    const conflictEvent = await createConflictRes.json();
    console.log(`Conflict Event created! ID: ${conflictEvent._id}, Date: ${conflictEvent.date.split('T')[0]}, Time: ${conflictEvent.time}`);

    // 6. Register Alice for conflict event (should fail with 409)
    console.log('\n6. Registering Alice for conflict event (expecting clash error 409)...');
    const regConflictRes = await fetch(`${API_BASE}/events/${conflictEvent._id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: 'Alice Smith',
        studentEmail: 'alice@college.edu'
      })
    });
    console.log(`Status code: ${regConflictRes.status}`);
    const regConflictData = await regConflictRes.json();
    console.log(`Clash check status: ${JSON.stringify(regConflictData)}`);
    if (regConflictRes.status !== 409 || !regConflictData.clash) {
      throw new Error('Expected status code 409 and clash: true');
    }

    // 7. Bypass clash registration
    console.log('\n7. Registering Alice for conflict event with bypassClash: true (expecting success)...');
    const bypassRes = await fetch(`${API_BASE}/events/${conflictEvent._id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: 'Alice Smith',
        studentEmail: 'alice@college.edu',
        bypassClash: true
      })
    });
    if (!bypassRes.ok) {
      const errData = await bypassRes.json();
      throw new Error(`Failed to bypass clash: ${errData.message}`);
    }
    console.log('Alice registered for conflict event successfully using bypass!');

    // 8. Check-in Alice for Arohan
    console.log('\n8. Checking in Alice for Arohan...');
    const checkinRes1 = await fetch(`${API_BASE}/checkin/${aliceArohanTicket._id}`, {
      method: 'POST'
    });
    if (!checkinRes1.ok) {
      const errData = await checkinRes1.json();
      throw new Error(`Failed to checkin Alice: ${errData.message}`);
    }
    const checkinData1 = await checkinRes1.json();
    console.log(`Success message: ${checkinData1.message}`);

    // 9. Check-in Alice again (should fail with 400)
    console.log('\n9. Checking in Alice again (expecting duplicate check-in error 400)...');
    const checkinRes2 = await fetch(`${API_BASE}/checkin/${aliceArohanTicket._id}`, {
      method: 'POST'
    });
    console.log(`Status code: ${checkinRes2.status}`);
    const checkinData2 = await checkinRes2.json();
    console.log(`Duplicate check-in response: ${checkinData2.message}`);
    if (checkinRes2.status !== 400 || !checkinData2.alreadyCheckedIn) {
      throw new Error('Expected status code 400 and alreadyCheckedIn: true');
    }

    console.log('\n--- All API Integration Tests Passed Successfully! ---');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
