const express = require('express');
const passport = require('passport');
const User = require('../models/users');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

router.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    // Redirect authenticated users to their appropriate dashboard
    if (req.user.role === 'doctor') return res.redirect('/doctor');
    //if (req.user.role === 'admin') return res.redirect('/insights');
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

    // Validate required fields based on role
    if (role === 'doctor') {
      if (!specialization) {
        return res.render('register', { error: 'Specialization is required for doctors' });
      }
      if (!hospitalId) {
        return res.render('register', { error: 'Hospital selection is required for doctors' });
      }
    }

    const user_id = Date.now().toString();
    const userData = { 
      user_id, 
      username, 
      fullname, 
      email, 
      role: role // Use the selected role directly, no fallback to 'user'
    };

    // Add doctor-specific fields if role is doctor
    if (role === 'doctor') {
      userData.hospitalId = hospitalId;
      userData.specialization = specialization;
    }

    const newUser = new User(userData);
    await User.register(newUser, password);

    res.redirect('/login');
  } catch (err) {
    console.error('Registration error:', err);
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

// Google OAuth routes
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback', 
  (req, res, next) => {
    passport.authenticate('google', {
      failureRedirect: '/login',
      failureFlash: true
    }, (err, user, info) => {
      if (err) {
        req.flash('error', 'Authentication error occurred');
        return res.redirect('/login');
      }
      
      if (!user) {
        // Authentication failed - show the error message
        req.flash('error', info?.message || 'Authentication failed. Please try again.');
        return res.redirect('/login');
      }
      
      // Check if this is a new Google user needing role selection
      if (user.isNewGoogleUser) {
        // Store temp user data in session for role selection
        req.session.tempGoogleUser = {
          googleId: user.googleId,
          fullname: user.fullname,
          email: user.email,
          avatar: user.avatar
        };
        return res.redirect('/auth/google/role-selection');
      }
      
      // Authentication successful for existing user - log them in
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          req.flash('error', 'Error logging in. Please try again.');
          return res.redirect('/login');
        }
        
        // Redirect based on role
        if (user.role === 'doctor') {
          res.redirect('/doctor');
        } else if (user.role === 'admin') {
          res.redirect('/insights');
        } else {
          res.redirect('/dashboard');
        }
      });
    })(req, res, next);
  }
);

// Role selection page for new Google users
router.get('/auth/google/role-selection', (req, res) => {
  if (!req.session.tempGoogleUser) {
    return res.redirect('/login');
  }
  res.render('google-role-selection', { error: req.flash('error') });
});

// Complete Google registration with role selection
router.post('/auth/google/complete', async (req, res) => {
  try {
    const tempUser = req.session.tempGoogleUser;
    if (!tempUser) {
      req.flash('error', 'Session expired. Please try again.');
      return res.redirect('/login');
    }

    const { role, specialization, hospitalId } = req.body;
    if (!role) {
      req.flash('error', 'Please select a role.');
      return res.redirect('/auth/google/role-selection');
    }

    // Create the new user
    const newUser = new User({
      user_id: uuidv4(),
      username: tempUser.email,
      fullname: tempUser.fullname,
      email: tempUser.email,
      googleId: tempUser.googleId,
      avatar: tempUser.avatar,
      role: role,
      specialization: role === 'doctor' ? specialization : undefined,
      hospitalId: role === 'doctor' && hospitalId ? hospitalId : undefined
    });

    await newUser.save();

    // Clear temp user data
    delete req.session.tempGoogleUser;

    // Log the user in
    req.logIn(newUser, (err) => {
      if (err) {
        req.flash('error', 'Error logging in. Please try again.');
        return res.redirect('/login');
      }

      // Redirect based on role
      if (newUser.role === 'doctor') {
        res.redirect('/doctor');
      } else if (newUser.role === 'admin') {
        res.redirect('/insights');
      } else {
        res.redirect('/dashboard');
      }
    });

  } catch (error) {
    console.error('Google registration completion error:', error);
    req.flash('error', 'Error completing registration. Please try again.');
    res.redirect('/auth/google/role-selection');
  }
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