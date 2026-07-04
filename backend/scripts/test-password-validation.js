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

    // 1. Test short password (< 6 chars, should fail)
    console.log('Attempting registration with short password "12345" (5 chars)...');
    const res1 = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        password: '12345'
      })
    });
    const data1 = await res1.json();
    console.log(`Response status: ${res1.status}`);
    console.log(`Response message: "${data1.message}"`);
    if (res1.status !== 400 || data1.message !== 'Password is less than 6 characters. Keep a strong password.') {
      throw new Error('Backend failed to reject short password.');
    }
    console.log('Short password validation test passed!');

    // 2. Test valid password (6 chars, should succeed)
    console.log('\nAttempting registration with valid password "123456" (6 chars)...');
    const res2 = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        password: '123456'
      })
    });
    const data2 = await res2.json();
    console.log(`Response status: ${res2.status}`);
    console.log(`Response message: "${data2.message}"`);
    if (res2.status !== 201) {
      throw new Error(`Expected success (201), got ${res2.status}`);
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
