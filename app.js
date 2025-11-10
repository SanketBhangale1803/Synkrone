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
const notificationService = require('./services/notificationService');

const app = express();

// Trust proxy (needed for secure cookies with ngrok)
app.set('trust proxy', 1);

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
    secure: true, // Required for ngrok HTTPS
    httpOnly: true,
    sameSite: 'none', // Required for ngrok HTTPS
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

// New unified notification test endpoint
app.post('/api/notifications/test', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  
  try {
    const { title, message, channels } = req.body;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const options = {
      skipEmail: channels && !channels.includes('email'),
      skipWebPush: channels && !channels.includes('webPush')
    };

    const results = await notificationService.sendNotification(
      user,
      title || 'Test Notification',
      message || 'This is a test notification from Synkrone.',
      options
    );

    res.json({ 
      success: true, 
      message: 'Notifications sent!',
      results 
    });
  } catch (err) {
    console.error('Error sending test notifications:', err);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});

// Test email configuration endpoint
app.post('/api/notifications/test-email-config', async (req, res) => {
  try {
    const testResult = await notificationService.testEmailConfiguration();
    if (testResult && testResult.success) {
      res.json({ success: true, message: 'Email configuration is working' });
    } else {
      res.json({ success: false, error: testResult ? testResult.error : 'Email service not configured' });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// System status endpoint
app.get('/api/notifications/status', async (req, res) => {
  try {
    const user = req.user ? await User.findById(req.user._id) : null;
    
    res.json({
      authenticated: !!req.user,
      email: !!process.env.EMAIL_USER && !!process.env.EMAIL_PASSWORD,
      webPush: !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY,
      user: user ? {
        email: user.email,
        notificationPreferences: user.notificationPreferences
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Appointment reminder cron job - now with multi-channel support
cron.schedule("*/5 * * * *", async () => {
  const now = new Date();
  console.log(`Running appointment reminder check at ${now.toISOString()}`);
  
  try {
    const appointments = await Appointment.find({
      status: { $nin: ['cancelled', 'completed'] }
    }).populate('userId doctorId hospitalId');

    for (const apt of appointments) {
      if (!apt.date || !apt.time) continue;

      try {
        const [y, m, d] = apt.date.split('-').map(Number);
        const [hh, mm] = apt.time.split(':').map(Number);
        const aptTime = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);

        const diffMinutes = (aptTime - now) / 1000 / 60;
        
        let reminderType = null;
        let shouldSend = false;

        // 1 day before (1440 minutes)
        if (Math.abs(diffMinutes - 1440) <= 15 && !apt.remindersSent?.oneDayBefore) {
          reminderType = 'oneDayBefore';
          shouldSend = true;
        }
        // 1 hour before (60 minutes)
        else if (Math.abs(diffMinutes - 60) <= 10 && !apt.remindersSent?.oneHourBefore) {
          reminderType = 'oneHourBefore';
          shouldSend = true;
        }

        if (shouldSend && reminderType && apt.userId) {
          const title = `Appointment Reminder - ${reminderType.replace(/([A-Z])/g, ' $1')}`;
          const message = `Your appointment with Dr. ${apt.doctorId?.fullname || 'Doctor'} at ${apt.hospitalId?.name || 'Hospital'} is scheduled for ${apt.date} at ${apt.time}.`;

          await notificationService.sendNotification(apt.userId, title, message);

          // Mark reminder as sent
          await Appointment.findByIdAndUpdate(apt._id, {
            [`remindersSent.${reminderType}`]: true
          });

          console.log(`${reminderType} reminder sent for appointment ${apt._id}`);
        }
      } catch (error) {
        console.error(`Error processing appointment ${apt._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in reminder cron job:', error);
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
