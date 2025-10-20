// Debug script to check appointments and email notification status
require('dotenv').config();
const mongoose = require('mongoose');
const Appointment = require('./models/appointment');
const User = require('./models/users');

async function debugAppointments() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zynk_appointments');
    console.log('📊 Debugging Appointment Email Notifications\n');

    // Get all appointments
    const allAppointments = await Appointment.find({}).sort({ createdAt: -1 });
    console.log(`📋 Total appointments in database: ${allAppointments.length}\n`);

    if (allAppointments.length === 0) {
      console.log('❌ No appointments found in database');
      console.log('💡 Create an appointment first, then enable email notifications');
      return;
    }

    console.log('🔍 Appointment Analysis:\n');

    for (const apt of allAppointments) {
      console.log(`📅 Appointment ID: ${apt._id}`);
      console.log(`   Patient: ${apt.name}`);
      console.log(`   Date: ${apt.date} at ${apt.time}`);
      console.log(`   Status: ${apt.status || 'pending'}`);
      console.log(`   📧 Email Notifications Enabled: ${apt.emailNotificationsEnabled || false}`);
      console.log(`   ✅ Confirmation Email Sent: ${apt.confirmationEmailSent || false}`);
      
      if (apt.reminderEmailsSent) {
        console.log(`   📬 Reminders Sent:`);
        console.log(`      1-Day: ${apt.reminderEmailsSent.oneDayBefore || false}`);
        console.log(`      12-Hour: ${apt.reminderEmailsSent.twelveHoursBefore || false}`);
        console.log(`      1-Hour: ${apt.reminderEmailsSent.oneHourBefore || false}`);
      }

      // Check user info
      const user = await User.findById(apt.userId);
      if (user) {
        console.log(`   👤 User Email: ${user.email}`);
      } else {
        console.log(`   ❌ User not found for ID: ${apt.userId}`);
      }

      // Calculate time until appointment
      if (apt.date && apt.time) {
        try {
          const [y, m, d] = apt.date.split('-').map(Number);
          const [hh, mm] = apt.time.split(':').map(Number);
          const aptTime = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
          const now = new Date();
          const diffMinutes = (aptTime - now) / 1000 / 60;
          const diffHours = diffMinutes / 60;
          const diffDays = diffHours / 24;

          console.log(`   ⏰ Time until appointment: ${diffDays.toFixed(1)} days (${diffHours.toFixed(1)} hours, ${diffMinutes.toFixed(0)} minutes)`);
          
          if (diffMinutes < 0) {
            console.log(`   ⚠️  Appointment is in the past`);
          }
        } catch (e) {
          console.log(`   ❌ Error parsing appointment time: ${e.message}`);
        }
      }

      console.log('   ' + '─'.repeat(50));
    }

    // Check cron job criteria
    console.log('\n🤖 Cron Job Analysis:');
    const emailEnabledApts = await Appointment.find({
      emailNotificationsEnabled: true,
      status: { $nin: ['cancelled', 'completed'] }
    });

    console.log(`📧 Appointments with email notifications enabled: ${emailEnabledApts.length}`);
    
    if (emailEnabledApts.length === 0) {
      console.log('❌ No appointments have email notifications enabled!');
      console.log('💡 Solution: Go to appointment confirmation page and click "Enable Email Notifications"');
    }

    const now = new Date();
    console.log(`🕐 Current time: ${now.toISOString()}`);
    console.log(`📅 Current date: ${now.toLocaleDateString()}`);

    console.log('\n🔍 Reminder Eligibility Check:');
    for (const apt of emailEnabledApts) {
      console.log(`\n📅 Checking appointment ${apt._id}:`);
      
      if (apt.date && apt.time) {
        const [y, m, d] = apt.date.split('-').map(Number);
        const [hh, mm] = apt.time.split(':').map(Number);
        const aptTime = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
        const diffMinutes = (aptTime - now) / 1000 / 60;

        console.log(`   Appointment time: ${aptTime.toISOString()}`);
        console.log(`   Minutes until appointment: ${diffMinutes.toFixed(1)}`);

        // Check each reminder window
        const oneDayWindow = Math.abs(diffMinutes - 1440) <= 15;
        const twelveHourWindow = Math.abs(diffMinutes - 720) <= 15;
        const oneHourWindow = Math.abs(diffMinutes - 60) <= 10;

        console.log(`   1-Day reminder window (1440±15 min): ${oneDayWindow} - Already sent: ${apt.reminderEmailsSent?.oneDayBefore || false}`);
        console.log(`   12-Hour reminder window (720±15 min): ${twelveHourWindow} - Already sent: ${apt.reminderEmailsSent?.twelveHoursBefore || false}`);
        console.log(`   1-Hour reminder window (60±10 min): ${oneHourWindow} - Already sent: ${apt.reminderEmailsSent?.oneHourBefore || false}`);

        if (oneDayWindow && !apt.reminderEmailsSent?.oneDayBefore) {
          console.log(`   🎯 WOULD SEND: 1-Day reminder`);
        }
        if (twelveHourWindow && !apt.reminderEmailsSent?.twelveHoursBefore) {
          console.log(`   🎯 WOULD SEND: 12-Hour reminder`);
        }
        if (oneHourWindow && !apt.reminderEmailsSent?.oneHourBefore) {
          console.log(`   🎯 WOULD SEND: 1-Hour reminder`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

debugAppointments();