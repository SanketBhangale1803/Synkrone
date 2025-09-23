const express = require('express');
const passport = require('passport');
const User = require('../models/users');
const router = express.Router();

router.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    // Redirect authenticated users to their appropriate dashboard
    if (req.user.role === 'doctor') return res.redirect('/doctor');
    if (req.user.role === 'admin') return res.redirect('/insights');
    return res.redirect('/dashboard');
  }
  res.redirect('/login'); // Redirect to login instead of home
});

router.get('/login', (req, res) => {
  res.render('login', { error: req.flash('error') });
});

router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user) => {
    if (err || !user) return res.redirect('/login');
    req.logIn(user, (err2) => {
      if (err2) return res.redirect('/login');
      // Route by role
      if (user.role === 'doctor') return res.redirect('/doctor');
      if (user.role === 'admin') return res.redirect('/insights');
      return res.redirect('/dashboard');
    });
  })(req, res, next);
});

router.get('/register', (req, res) => {
  res.render('register', { error: null });
});

router.post('/register', async (req, res) => {
  const { username, fullname, email, password, role, hospitalId, specialization } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.render('register', { error: 'Username already exists' });
    }

    const user_id = Date.now().toString();
    const newUser = new User({ user_id, username, fullname, email, role: role || 'user', hospitalId: role === 'doctor' ? hospitalId : undefined, specialization });
    await User.register(newUser, password);

    res.redirect('/login');
  } catch (err) {
    res.render('register', { error: 'Error registering user' });
  }
});

router.get('/dashboard', async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect('/login');

  const { Appointment } = require('../models');
  const today = new Date().toISOString().split('T')[0];

  const query = { userId: req.user._id };
  const all = await Appointment.find(query);
  const stats = {
    todayAppointments: all.filter(a => a.date === today).length,
    totalAppointments: all.length,
    urgentAppointments: all.filter(a => a.type === 'urgent').length,
    regularAppointments: all.filter(a => a.type === 'regular').length
  };

  res.render('index', { title: 'Patient Dashboard', user: req.user, stats });
});

router.get('/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect('/');
    });
  });
});

const { Appointment } = require('../models');

router.post('/appointments', async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect('/login');

  const { name, phone, date, time, type } = req.body;

  if (!name || !phone || !date || !time || !type) {
    return res.render('dashboard', { user: req.user, stats: {}, error: 'All fields are required' });
  }

  try {
    const newAppointment = new Appointment({ name, phone, date, time, type });
    const savedAppointment = await newAppointment.save();

    req.session.lastAppointment = savedAppointment;

    // Ensure session is saved before redirect
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.render('dashboard', { user: req.user, stats: {}, error: 'Error saving session' });
      }
      res.redirect('/confirmation');
    });
  } catch (err) {
    console.error(err);
    res.render('dashboard', { user: req.user, stats: {}, error: 'Error creating appointment' });
  }
});

router.get('/confirmation', (req, res) => {
  const appointmentData = req.session?.lastAppointment;
  if (!appointmentData) return res.redirect('/dashboard');
  res.render('confirmation', { title: 'Appointment Confirmed', appointmentData });
});

module.exports = router;