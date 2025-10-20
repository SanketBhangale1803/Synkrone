// Quick Test: Trigger immediate email notifications for testing
require('dotenv').config();
const mongoose = require('mongoose');
const Appointment = require('./models/appointment');
const User = require('./models/users');
const Hospital = require('./models/hospital');
const { sendReminderEmail } = require('./services/emailService');

async function testImmediateNotifications() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zynk_appointments');
    console.log('🧪 Testing Immediate Email Notifications\n');

    // Find an appointment with email notifications enabled
    const appointment = await Appointment.findOne({
      emailNotificationsEnabled: true,
      status: { $nin: ['cancelled', 'completed'] }
    });

    if (!appointment) {
      console.log('❌ No appointments found with email notifications enabled');
      console.log('💡 Solution: Book an appointment and enable email notifications first');
      return;
    }

    console.log(`📅 Found appointment: ${appointment._id}`);
    console.log(`   Patient: ${appointment.name}`);
    console.log(`   Date: ${appointment.date} at ${appointment.time}`);

    // Get user, doctor, and hospital data
    const user = await User.findById(appointment.userId);
    const doctor = await User.findById(appointment.doctorId);
    const hospital = await Hospital.findById(appointment.hospitalId);

    if (!user || !doctor || !hospital) {
      console.log('❌ Missing user, doctor, or hospital data');
      return;
    }

    console.log(`👤 User Email: ${user.email}`);
    console.log(`👨‍⚕️ Doctor: ${doctor.fullname || doctor.username}`);
    console.log(`🏥 Hospital: ${hospital.name}\n`);

    // Test each reminder type
    const reminderTypes = ['oneDayBefore', 'twelveHoursBefore', 'oneHourBefore'];
    
    for (const reminderType of reminderTypes) {
      console.log(`📧 Testing ${reminderType} reminder...`);
      
      try {
        const result = await sendReminderEmail(
          user.email,
          appointment,
          doctor,
          hospital,
          reminderType
        );

        if (result.success) {
          console.log(`✅ ${reminderType} email sent successfully!`);
          console.log(`   Message ID: ${result.messageId}\n`);
        } else {
          console.log(`❌ Failed to send ${reminderType} email: ${result.error}\n`);
        }
      } catch (error) {
        console.log(`❌ Error sending ${reminderType} email: ${error.message}\n`);
      }
    }

    console.log('🎉 Manual email test completed!');
    console.log('📥 Check your email inbox for the test reminders.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testImmediateNotifications();