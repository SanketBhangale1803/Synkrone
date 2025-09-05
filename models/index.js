const mongoose = require('mongoose');
const Appointment = require('./appointment');
const connectDB = require('./database');

module.exports = {
    Appointment,
    connectDB,
    mongoose
};