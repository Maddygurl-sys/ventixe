const mongoose = require('mongoose');
const User = require('../models/User');

const API_BASE = 'http://localhost:5001/api';

async function runTests() {
  console.log('--- Starting Password Validation Integration Tests ---');
  try {
    let uri = process.env.MONGODB_URI;
    if (!uri || uri === 'memory') {
      uri = 'mongodb://127.0.0.1:27017/event-management';
    }
    await mongoose.connect(uri);

    // Setup: clear old test user if exists
    const testUsername = 'pwdtestuser';
    await User.deleteOne({ username: testUsername });

    const expectedMsg = 'Password must be at least 6 characters long and contain at least one uppercase letter and one special character.';

    // 1. Test too short password ("Ab1!", 4 chars)
    console.log('Attempting registration with short password "Ab1!" (4 chars)...');
    const res1 = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUsername, password: 'Ab1!' })
    });
    const data1 = await res1.json();
    console.log(`Response status: ${res1.status}, Message: "${data1.message}"`);
    if (res1.status !== 400 || data1.message !== expectedMsg) {
      throw new Error('Backend failed to reject short password.');
    }

    // 2. Test no uppercase password ("abcde1!", 8 chars)
    console.log('\nAttempting registration with no uppercase password "abcde1!"...');
    const res2 = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUsername, password: 'abcde1!' })
    });
    const data2 = await res2.json();
    console.log(`Response status: ${res2.status}, Message: "${data2.message}"`);
    if (res2.status !== 400 || data2.message !== expectedMsg) {
      throw new Error('Backend failed to reject password with no uppercase letter.');
    }

    // 3. Test no special character password ("Abcde1", 6 chars)
    console.log('\nAttempting registration with no special character password "Abcde1"...');
    const res3 = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUsername, password: 'Abcde1' })
    });
    const data3 = await res3.json();
    console.log(`Response status: ${res3.status}, Message: "${data3.message}"`);
    if (res3.status !== 400 || data3.message !== expectedMsg) {
      throw new Error('Backend failed to reject password with no special character.');
    }
    console.log('All weak password validation test cases passed!');

    // 4. Test valid password ("Abcde1!", 7 chars, should succeed)
    console.log('\nAttempting registration with valid password "Abcde1!"...');
    const res4 = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUsername, password: 'Abcde1!' })
    });
    const data4 = await res4.json();
    console.log(`Response status: ${res4.status}`);
    if (res4.status !== 201) {
      throw new Error(`Expected success (201), got ${res4.status}: ${data4.message}`);
    }

    // Verify user is in DB
    const dbUser = await User.findOne({ username: testUsername });
    if (!dbUser) {
      throw new Error('User was not saved in DB!');
    }
    console.log('Valid password registration test passed!');

    // Clean up
    await User.deleteOne({ username: testUsername });

    await mongoose.disconnect();
    console.log('\n--- All Password Validation Tests Passed Successfully! ---');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
