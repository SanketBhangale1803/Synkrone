//cron job for push notifications
//const Appointment = require('views/appointments.ejs');


const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
require('dotenv').config();

// Import passport configuration
require('./config/passport');
const passport = require('passport');

const User = require('./models/users');
const { connectDB } = require('./models');

const indexRouter = require('./routes/index');
const appointmentsRouter = require('./routes/appointments');
const doctorRouter = require('./routes/doctor');
const { router: insightsRouter } = require('./routes/insights');
const authApiRouter = require('./routes/users');
const doctorsApiRouter = require('./routes/doctors');
const hospitalsApiRouter = require('./routes/hospitals');
// Removed authRouter since Google OAuth routes are now in index.js

const webpush = require('web-push');
const cron = require('node-cron');
const Appointment = require('./models/appointment');
const Hospital = require('./models/hospital');

const app = express();

connectDB();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(session({
  secret: process.env.SESSION_SECRET || 'sanket',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/zynk_appointments',
    ttl: 24 * 60 * 60
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

// Push Notifications Setup

webpush.setVapidDetails(
  'mailto:youremail@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);


let subscriptions = []; // in production, store in DB

// Endpoint for client subscription
app.post("/subscribe", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  try {
    await User.findByIdAndUpdate(req.user._id, {
      pushSubscription: req.body
    });
    res.status(201).json({ message: "Subscription saved" });
  } catch (err) {
    console.error("Error saving subscription:", err);
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

// Expose VAPID public key to clients so they can subscribe
app.get('/vapidPublicKey', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY || '';
  res.json({ publicKey: key });
});

// Test push endpoint for QA - sends a test notification to the logged-in user
app.post('/api/push/test', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.pushSubscription || !user.pushSubscription.endpoint) {
      return res.status(404).json({ error: 'No push subscription found for user' });
    }

    const payload = {
      title: 'Test Appointment Reminder',
      body: req.body?.body || 'This is a test notification for your Synkrone appointment reminders.'
    };

    await sendNotification(user.pushSubscription, payload);
    res.json({ success: true, message: 'Test push sent' });
  } catch (err) {
    console.error('Error sending test push:', err);
    res.status(500).json({ error: 'Failed to send test push' });
  }
});

app.use('/appointments', appointmentsRouter);
app.use('/api/appointments', appointmentsRouter); // Add API route
app.use('/', indexRouter);
app.use('/doctor', doctorRouter);
app.use('/insights', insightsRouter);
app.use('/api/auth', authApiRouter);
app.use('/api/doctors', doctorsApiRouter);
app.use('/api/hospitals', hospitalsApiRouter);
// Removed app.use('/auth', authRouter);

app.use(function(req, res, next) {
  next(createError(404));
});

app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// Function to send notification
async function sendNotification(subscription, dataToSend) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(dataToSend));
  } catch (err) {
    if (err.statusCode === 410) {
      console.log("Subscription expired, removing from DB");
      await User.updateOne(
        { "pushSubscription.endpoint": subscription.endpoint },
        { $unset: { pushSubscription: "" } }
      );
    } else {
      console.error("Push error:", err);
    }
  }
}

module.exports = app;

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
