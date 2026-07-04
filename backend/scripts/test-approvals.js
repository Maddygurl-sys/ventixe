const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const API_BASE = 'http://localhost:5001/api';

async function runTests() {
  console.log('--- Starting Approval & Double Booking Tests ---');
  
  try {
    // 1. Create a base event at Main Auditorium, July 20 at 14:00 - 16:00
    console.log('\n1. Creating base approved event by Admin...');
    const res1 = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Tech Talk',
        description: 'Vibrant tech conference',
        date: '2026-07-20',
        time: '14:00 - 16:00',
        venue: 'Main Auditorium',
        capacity: 100,
        createdBy: 'admin' // Admin
      })
    });
    
    if (!res1.ok) {
      const err = await res1.json();
      throw new Error(`Failed to create base event: ${err.message}`);
    }
    const baseEvent = await res1.json();
    console.log(`Base Event created! ID: ${baseEvent._id}, Status: ${baseEvent.status}, Creator: ${baseEvent.createdBy}`);

    // 2. Try to create conflicting event (same day, same venue, overlapping time) -> Expecting 400 "Already booked"
    console.log('\n2. Attempting to create overlapping event at same venue/time (expecting "Already booked" error)...');
    const res2 = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Overlay Talk',
        description: 'Should clash',
        date: '2026-07-20',
        time: '15:00 - 17:00', // Overlaps 14:00 - 16:00
        venue: 'Main Auditorium',
        capacity: 50,
        createdBy: 'student1'
      })
    });

    console.log(`Clash check status: ${res2.status}`);
    const clashData = await res2.json();
    console.log(`Clash check response: ${clashData.message}`);
    if (res2.status !== 400 || clashData.message !== 'Already booked') {
      throw new Error('Expected 400 and message "Already booked" for double booking clash');
    }
    console.log('Double booking protection verified successfully!');

    // 3. Create a valid non-overlapping pending event by user student1
    console.log('\n3. Creating valid event request by student1 (no overlap, expecting pending)...');
    const res3 = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Open Mic Night',
        description: 'Poetry and music',
        date: '2026-07-20',
        time: '18:00 - 20:00', // No overlap with 14:00-16:00
        venue: 'Main Auditorium',
        capacity: 40,
        createdBy: 'student1'
      })
    });

    if (!res3.ok) {
      const err = await res3.json();
      throw new Error(`Failed to create pending event: ${err.message}`);
    }
    const pendingEvent = await res3.json();
    console.log(`Event proposal created! ID: ${pendingEvent._id}, Status: ${pendingEvent.status}`);
    if (pendingEvent.status !== 'pending') {
      throw new Error('Expected user-hosted event status to be "pending"');
    }

    // 4. Check admin notifications to find this request
    console.log('\n4. Fetching Admin notifications...');
    const resNoti = await fetch(`${API_BASE}/auth/notifications?username=admin`);
    if (!resNoti.ok) {
      throw new Error('Failed to retrieve Admin notifications');
    }
    const adminNotis = await resNoti.json();
    const eventRequestNoti = adminNotis.find(n => n.type === 'EVENT_REQUEST' && n.relatedEvent?._id === pendingEvent._id);
    
    if (!eventRequestNoti) {
      throw new Error('Pending request notification was not found in Admin list');
    }
    console.log(`Found event request notification! ID: ${eventRequestNoti._id}, Status: ${eventRequestNoti.status}`);

    // 5. Admin responds to request: Approve
    console.log(`\n5. Admin approving the event request (notification ID: ${eventRequestNoti._id})...`);
    const resApprove = await fetch(`${API_BASE}/auth/notifications/${eventRequestNoti._id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' })
    });
    if (!resApprove.ok) {
      const err = await resApprove.json();
      throw new Error(`Failed to approve event: ${err.message}`);
    }
    const approveData = await resApprove.json();
    console.log(`Approve status: ${resApprove.status}, Message: ${approveData.message}`);
    console.log(`Approved event status in response: ${approveData.event.status}`);
    if (approveData.event.status !== 'approved') {
      throw new Error('Expected event status to transition to "approved"');
    }

    // 6. Check student1 notifications to see approval
    console.log('\n6. Fetching student1 notifications...');
    const resStudentNoti = await fetch(`${API_BASE}/auth/notifications?username=student1`);
    if (!resStudentNoti.ok) {
      throw new Error('Failed to fetch student1 notifications');
    }
    const studentNotis = await resStudentNoti.json();
    const approvalAlert = studentNotis.find(n => n.type === 'EVENT_APPROVED' && n.relatedEvent?._id === pendingEvent._id);
    if (!approvalAlert) {
      throw new Error('Approval alert not found in student1 notifications');
    }
    console.log(`Student alert: "${approvalAlert.message}" (Type: ${approvalAlert.type})`);

    // 7. Verify the event list returns the approved event but not any declined ones
    console.log('\n7. Verifying public listEvents includes the approved event...');
    const resList = await fetch(`${API_BASE}/events`);
    const publicEvents = await resList.json();
    const foundApproved = publicEvents.find(e => e._id === pendingEvent._id);
    if (!foundApproved) {
      throw new Error('Approved user-hosted event was not found in public listEvents');
    }
    console.log(`Event "${foundApproved.title}" is visible publicly!`);

    console.log('\n--- All Double Booking & Approval Tests Passed! ---');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
