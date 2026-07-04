const User = require('../models/User');
const Activity = require('../models/Activity');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{6,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long and contain at least one uppercase letter and one special character.' 
      });
    }

    const usernameLower = username.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ username: usernameLower });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken.' });
    }

    const hashedPassword = hashPassword(password);
    const newUser = new User({
      username: usernameLower,
      password: hashedPassword,
      role: 'user'
    });

    await newUser.save();

    // Log activity
    const activity = new Activity({
      userName: newUser.username,
      userEmail: newUser.username, // Using username as email placeholder in Activity
      activityType: 'REGISTER',
      description: `Registered user account: ${newUser.username}`
    });
    await activity.save();

    res.status(201).json({
      message: 'Account created successfully! Please log in.',
      user: { name: newUser.username, email: newUser.username, role: newUser.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const usernameLower = username.trim().toLowerCase();

    // Admin validation rule
    // "only if the admin name is admin and pass is admin123 allow them else nope"
    if (usernameLower === 'admin') {
      if (password === 'admin123') {
        let adminUser = await User.findOne({ username: 'admin' });
        if (!adminUser) {
          adminUser = new User({
            username: 'admin',
            password: hashPassword('admin123'),
            role: 'admin'
          });
          await adminUser.save();
        }

        const activity = new Activity({
          userName: 'Admin',
          userEmail: 'admin',
          activityType: 'LOGIN',
          description: 'Admin logged into portal.'
        });
        await activity.save();

        return res.json({
          message: 'Welcome back, Admin!',
          user: { name: 'Admin', email: 'admin', role: 'admin' }
        });
      } else {
        return res.status(401).json({ message: 'Incorrect Admin password.' });
      }
    }

    // Normal User Login
    const user = await User.findOne({ username: usernameLower });
    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
      return res.status(401).json({ message: 'Incorrect password.' });
    }

    // Log activity
    const activity = new Activity({
      userName: user.username,
      userEmail: user.username,
      activityType: 'LOGIN',
      description: 'User logged into portal.'
    });
    await activity.save();

    res.json({
      message: 'Login successful!',
      user: { name: user.username, email: user.username, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

exports.getActivities = async (req, res) => {
  try {
    const activities = await Activity.find().sort({ timestamp: -1 }).limit(40);
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching activities', error: error.message });
  }
};
