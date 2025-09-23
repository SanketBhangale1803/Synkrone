const mongoose = require('mongoose');
const Appointment = require('./appointment');
const Hospital = require('./hospital');
const connectDB = require('./database');

module.exports = {
    Appointment,
    Hospital,
    connectDB,
    mongoose
};