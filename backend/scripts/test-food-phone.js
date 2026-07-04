const API_BASE = 'http://localhost:5001/api';

async function runTests() {
  console.log('--- Starting New Features Integration Tests (Food, Coordinator, Phone, Clash) ---');

  try {
    // 1. Create event with coordinator and food menu
    console.log('\n1. Creating event with coordinator details and food menu...');
    const res1 = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Freshers Fiesta',
        description: 'Welcome freshers to campus.',
        date: '2026-07-28',
        time: '16:00 - 20:00',
        venue: 'Silver Jubilee Hall',
        capacity: 100,
        createdBy: 'madhu', // Admin auto-approved
        foodMenu: 'Cupcakes, Noodles, Soft Drinks',
        coordinatorName: 'Rohit Gupta',
        coordinatorPhone: '+91 99999 88888'
      })
    });

    if (!res1.ok) {
      const err = await res1.json();
      throw new Error(`Failed to create event: ${err.message}`);
    }
    const event = await res1.json();
    console.log(`Event created! ID: ${event._id}`);
    console.log(`Coordinator: ${event.coordinatorName} (${event.coordinatorPhone})`);
    console.log(`Food Menu: ${event.foodMenu}`);

    // 2. Register student with phone number and food choice
    console.log('\n2. Registering Alice with phone and food choice...');
    const res2 = await fetch(`${API_BASE}/events/${event._id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: 'Alice Kumar',
        studentEmail: 'alice@college.edu',
        studentPhone: '+91 98765 43210',
        foodPreference: 'veg'
      })
    });

    if (!res2.ok) {
      const err = await res2.json();
      throw new Error(`Failed to register Alice: ${err.message}`);
    }
    const ticket = await res2.json();
    console.log('Alice registered successfully!');
    console.log(`Ticket details: Phone: ${ticket.studentPhone}, Food: ${ticket.foodPreference}`);
    if (ticket.studentPhone !== '+91 98765 43210' || ticket.foodPreference !== 'veg') {
      throw new Error('Phone or food choice was not saved correctly');
    }

    // 3. Verify clash checking prevents double booking same venue same day/time
    console.log('\n3. Verifying timezone-safe double booking check on the same venue/date...');
    const res3 = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Conflict Festival',
        description: 'Should fail double booking check.',
        date: '2026-07-28', // Same date
        time: '18:00 - 21:00', // Overlaps 16:00 - 20:00
        venue: 'Silver Jubilee Hall', // Same venue
        capacity: 50,
        createdBy: 'student1'
      })
    });

    console.log(`Clash status: ${res3.status}`);
    const clashData = await res3.json();
    console.log(`Clash response: ${clashData.message}`);
    if (res3.status !== 400 || clashData.message !== 'Already booked') {
      throw new Error('Expected 400 and message "Already booked" for double booking');
    }

    console.log('\n--- All Food, Coordinator, Phone, and Clash Tests Passed Successfully! ---');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
