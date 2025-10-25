// Create test appointments for email notification testing
require('dotenv').config();
const mongoose = require('mongoose');
const Appointment = require('./models/appointment');
const { v4: uuidv4 } = require('uuid');

async function createTestAppointments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zynk_appointments');
    console.log('🧪 Creating Test Appointments for Email Notifications\n');

    const now = new Date();
    
    // Create appointments at different intervals for testing
    const testAppointments = [
      {
        name: 'Test Patient 1-Day',
        phone: '555-0001',
        date: getDateString(new Date(now.getTime() + 24 * 60 * 60 * 1000)), // 1 day from now
        time: getTimeString(new Date(now.getTime() + 24 * 60 * 60 * 1000)),
        type: 'regular',
        confirmationNumber: uuidv4().split('-')[0].toUpperCase(),
        emailNotificationsEnabled: true,
        confirmationEmailSent: true,
        userId: '68f119b7c5582887aa596036', // Replace with actual user ID
        doctorId: '68e1c2db59ad2c92d49dc873', // Replace with actual doctor ID
        hospitalId: '68e1c2b759ad2c92d49dc86a', // Replace with actual hospital ID
        status: 'approved'
      },
      {
        name: 'Test Patient 12-Hour',
        phone: '555-0002',
        date: getDateString(new Date(now.getTime() + 12 * 60 * 60 * 1000)), // 12 hours from now
        time: getTimeString(new Date(now.getTime() + 12 * 60 * 60 * 1000)),
        type: 'regular',
        confirmationNumber: uuidv4().split('-')[0].toUpperCase(),
        emailNotificationsEnabled: true,
        confirmationEmailSent: true,
        userId: '68f119b7c5582887aa596036',
        doctorId: '68e1c2db59ad2c92d49dc873',
        hospitalId: '68e1c2b759ad2c92d49dc86a',
        status: 'approved'
      },
      {
        name: 'Test Patient 1-Hour',
        phone: '555-0003',
        date: getDateString(new Date(now.getTime() + 1 * 60 * 60 * 1000)), // 1 hour from now
        time: getTimeString(new Date(now.getTime() + 1 * 60 * 60 * 1000)),
        type: 'urgent',
        confirmationNumber: uuidv4().split('-')[0].toUpperCase(),
        emailNotificationsEnabled: true,
        confirmationEmailSent: true,
        userId: '68f119b7c5582887aa596036',
        doctorId: '68e1c2db59ad2c92d49dc873',
        hospitalId: '68e1c2b759ad2c92d49dc86a',
        status: 'approved'
      }
    ];

    for (const aptData of testAppointments) {
      const appointment = new Appointment(aptData);
      await appointment.save();
      console.log(`✅ Created test appointment: ${aptData.name}`);
      console.log(`   Date/Time: ${aptData.date} at ${aptData.time}`);
      console.log(`   Confirmation: ${aptData.confirmationNumber}`);
      console.log(`   Email Notifications: ${aptData.emailNotificationsEnabled}`);
      console.log('');
    }

    console.log('🎉 Test appointments created successfully!');
    console.log('\n📧 Email Reminder Schedule:');
    console.log('- 1-Day reminder will be sent ~24 hours before appointment');
    console.log('- 12-Hour reminder will be sent ~12 hours before appointment');
    console.log('- 1-Hour reminder will be sent ~1 hour before appointment');
    console.log('\n⏰ Cron job runs every 5 minutes to check for reminders');
    console.log('🔍 Check server logs for "Running email reminder check" messages');

  } catch (error) {
    console.error('❌ Error creating test appointments:', error);
  } finally {
    await mongoose.disconnect();
  }
}

function getDateString(date) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

function getTimeString(date) {
  return date.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format
}

createTestAppointments();