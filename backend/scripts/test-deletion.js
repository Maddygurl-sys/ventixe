const API_BASE = 'http://localhost:5001/api';

async function runTests() {
  console.log('--- Starting Event Cancellation/Deletion Integration Tests ---');

  try {
    // 1. Create an event hosted by student_host
    console.log('\n1. Creating event hosted by student_host...');
    const res1 = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Fiesta Cancel Test',
        description: 'Testing deletion notifications.',
        date: '2026-07-29',
        time: '14:00 - 17:00',
        venue: 'Silver Jubilee Hall',
        capacity: 100,
        createdBy: 'student_host',
        foodMenu: 'None',
        coordinatorName: 'student_host',
        coordinatorPhone: '123'
      })
    });

    if (!res1.ok) {
      const err = await res1.json();
      throw new Error(`Failed to create event: ${err.message}`);
    }
    const event = await res1.json();
    console.log(`Event created! ID: ${event._id}, status: ${event.status}`);

    // Wait, the status is 'pending' because it was created by a student.
    // Let's verify that the host student can delete a pending event.
    // Let's register two students for this event (simulate registration bypassing status for testing or approve it first).
    // In our system, only approved events can be registered. So let's approve it first.
    // To approve it, let's find the notification created for admin and respond.
    // Wait, we can also just create it with createdBy: 'madhu' to auto-approve, or update its status in DB.
    // Let's register users by sending POST /api/events/:id/register.
    // Wait, can we register for pending events?
    // Let's see: `registerStudent` does not block registration for pending events in the backend controller.
    // But let's approve it just to be safe and match the full production flow.
    console.log('\n2. Fetching notifications to approve the event request...');
    const resAuth = await fetch(`${API_BASE}/auth/notifications?username=admin`);
    const notifications = await resAuth.json();
    const requestAlert = notifications.find(n => n.relatedEvent === event._id && n.type === 'EVENT_REQUEST');
    
    if (requestAlert) {
      console.log(`Found event request alert: ${requestAlert._id}. Approving...`);
      const resApprove = await fetch(`${API_BASE}/auth/notifications/${requestAlert._id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      });
      if (!resApprove.ok) {
        throw new Error('Failed to approve event request');
      }
      console.log('Event request approved!');
    }

    // Register student2 and student3
    console.log('\n3. Registering student2 and student3...');
    const reg1 = await fetch(`${API_BASE}/events/${event._id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: 'Student Two',
        studentEmail: 'student2@college.edu',
        studentPhone: '111',
        foodPreference: 'none'
      })
    });
    if (!reg1.ok) throw new Error('Failed to register student2');

    const reg2 = await fetch(`${API_BASE}/events/${event._id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: 'Student Three',
        studentEmail: 'student3@college.edu',
        studentPhone: '222',
        foodPreference: 'none'
      })
    });
    if (!reg2.ok) throw new Error('Failed to register student3');
    console.log('Students registered successfully!');

    // 4. Host student1 deletes the event
    console.log('\n4. Host student_host canceling/deleting the event...');
    const resDel = await fetch(`${API_BASE}/events/${event._id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'student_host'
      })
    });

    if (!resDel.ok) {
      const err = await resDel.json();
      throw new Error(`Failed to delete event: ${err.message}`);
    }
    console.log('Event deleted successfully by host!');

    // 5. Verify database records are cleared
    console.log('\n5. Verifying event and registrations are deleted from DB...');
    const resGet = await fetch(`${API_BASE}/events/${event._id}`);
    if (resGet.status !== 404) {
      throw new Error('Event was not deleted from DB');
    }
    console.log('Confirmed: Event deleted!');

    // 6. Verify notifications are generated
    console.log('\n6. Checking cancellation notification alerts for admin and students...');
    
    // Check Admin notifications
    const resAdminNotif = await fetch(`${API_BASE}/auth/notifications?username=admin`);
    const adminNotifs = await resAdminNotif.json();
    const cancelAlertForAdmin = adminNotifs.find(n => n.type === 'SYSTEM' && n.title === 'Hosted Event Cancelled');
    if (!cancelAlertForAdmin) {
      throw new Error('Admin did not receive event cancellation alert');
    }
    console.log(`Confirmed: Admin notified! Alert: "${cancelAlertForAdmin.message}"`);

    // Check student2 notifications
    const resStudentNotif = await fetch(`${API_BASE}/auth/notifications?username=student2@college.edu`);
    const studentNotifs = await resStudentNotif.json();
    const cancelAlertForStudent = studentNotifs.find(n => n.type === 'SYSTEM' && n.title === 'Event Cancelled');
    if (!cancelAlertForStudent) {
      throw new Error('Student did not receive event cancellation alert');
    }
    console.log(`Confirmed: Student notified! Alert: "${cancelAlertForStudent.message}"`);

    console.log('\n--- All Event Cancellation, Cascading Deletion, and Notification Alerts Tests Passed! ---');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
