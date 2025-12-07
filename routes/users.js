const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/users');
const auth = require('../middleware/auth');
const calendarService = require('../services/calendarService');

router.post('/register', async (req, res) => {
  try {
    const { username, fullname, email, password, confirmPassword, role, hospitalId } = req.body;
    
    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }
    
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username exists' });


    if (password !== confirmPassword) {
      console.log('❌ Password mismatch – aborting');
      res.status(400);
      return res.render('register', { error: 'Passwords do not match' });
    }

    const user = new User({
      user_id: Date.now().toString(),
      username,
      fullname,
      email,
      role: role, // Remove the fallback to 'user'
      hospitalId: role === 'doctor' ? hospitalId : undefined
    });

    await User.register(user, password);
    res.json({ message: 'Registered' });
  } catch (e) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res, next) => {
  const passport = require('passport');
  passport.authenticate('local', { session: false }, (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({
      _id: user._id,
      username: user.username,
      role: user.role,
      hospitalId: user.hospitalId
    }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
    res.json({ token });
  })(req, res, next);
});

/* Calendar management endpoints */
router.get('/calendar/status', auth.verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      calendarSyncEnabled: user.calendarSyncEnabled || false,
      hasGoogleAccount: !!user.googleRefreshToken
    });
  } catch (error) {
    console.error('Error getting calendar status:', error);
    res.status(500).json({ error: 'Error getting calendar status' });
  }
});

router.post('/calendar/disable', auth.verifyToken, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { calendarSyncEnabled: false });
    res.json({ message: 'Calendar sync disabled' });
  } catch (error) {
    console.error('Error disabling calendar sync:', error);
    res.status(500).json({ error: 'Error disabling calendar sync' });
  }
});

router.post('/calendar/enable', auth.verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.googleRefreshToken) {
      return res.status(400).json({ error: 'Please authenticate with Google first' });
    }
    await User.findByIdAndUpdate(req.user._id, { calendarSyncEnabled: true });
    res.json({ message: 'Calendar sync enabled' });
  } catch (error) {
    console.error('Error enabling calendar sync:', error);
    res.status(500).json({ error: 'Error enabling calendar sync' });
  }
});

router.get('/calendar/test', auth.verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.googleRefreshToken) {
      return res.status(400).json({ error: 'No Google account connected' });
    }
    const result = await calendarService.testCalendarAccess(user);
    res.json(result);
  } catch (error) {
    console.error('Error testing calendar access:', error);
    res.status(500).json({ error: 'Error testing calendar access' });
  }
});

module.exports = router;


