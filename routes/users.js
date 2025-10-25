const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/users');

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

module.exports = router;


