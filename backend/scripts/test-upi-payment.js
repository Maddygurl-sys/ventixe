const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

async function runTests() {
  try {
    console.log('--- Starting UPI Payment Integration Tests ---');
    
    await mongoose.connect('mongodb://127.0.0.1:27017/event-management');
    
    // Clear test records
    await Event.deleteMany({ title: 'Paid Code Fest' });
    
    // 1. Create a paid event
    console.log('\n1. Creating paid event...');
    const paidEvent = new Event({
      title: 'Paid Code Fest',
      description: 'Test hackathon with entry fee',
      date: new Date('2026-08-10T00:00:00Z'),
      time: '12:00 - 15:00',
      venue: 'Lab 4',
      capacity: 30,
      createdBy: 'admin',
      foodMenu: 'None',
      coordinatorName: 'Rohit',
      coordinatorPhone: '9999999999',
      isPaid: true,
      entryFee: 150,
      upiId: 'test@okaxis'
    });
    await paidEvent.save();
    console.log(`Event created! ID: ${paidEvent._id}, entryFee: ₹${paidEvent.entryFee}, upi: ${paidEvent.upiId}`);

    // 2. Try booking without payment info
    console.log('\n2. Attempting registration without payment info (should fail)...');
    try {
      const res = await fetch(`http://localhost:5001/api/events/${paidEvent._id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: 'Alice Test',
          studentEmail: 'alice@student.tce.edu',
          studentPhone: '9876543210'
        })
      });
      console.log(`Response status: ${res.status}`);
      const data = await res.json();
      console.log(`Response message: ${data.message}`);
      if (res.status !== 400) {
        throw new Error('Should have failed with 400 Bad Request');
      }
      console.log('Confirmed: registration failed without payment details.');
    } catch (e) {
      if (e.message.includes('Should have failed')) throw e;
      console.log('Fetch error as expected:', e.message);
    }

    // 3. Try booking with correct payment info
    console.log('\n3. Registering with valid GPay UPI payment reference...');
    const resPay = await fetch(`http://localhost:5001/api/events/${paidEvent._id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: 'Alice Test',
        studentEmail: 'alice@student.tce.edu',
        studentPhone: '9876543210',
        paymentStatus: 'paid',
        upiTransactionId: 'TXN123456789'
      })
    });
    
    console.log(`Response status: ${resPay.status}`);
    const regData = await resPay.json();
    if (resPay.status !== 201) {
      throw new Error(`Registration failed: ${regData.message}`);
    }
    console.log(`Alice registered successfully! Ticket QR: ${regData.qrCode ? 'Generated' : 'Missing'}`);
    console.log(`Payment Status: ${regData.paymentStatus}, TXN ID: ${regData.upiTransactionId}`);

    // Clean up
    await Event.deleteOne({ _id: paidEvent._id });
    await Registration.deleteOne({ _id: regData._id });
    
    await mongoose.disconnect();
    console.log('\n--- All UPI Payment Tests Passed Successfully! ---');
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

runTests();
