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

app.use('/appointments', appointmentsRouter);
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

module.exports = app;

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});