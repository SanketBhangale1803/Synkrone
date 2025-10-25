// Development version with wider timing windows for easier testing
// Replace the cron job in app.js with this for testing purposes

// Email reminder system - checks every 5 minutes for appointments needing reminders
cron.schedule("*/5 * * * *", async () => {
  const now = new Date();
  console.log(`Running email reminder check at ${now.toISOString()}`);
  
  try {
    // Find appointments with email notifications enabled
    const appointments = await Appointment.find({
      emailNotificationsEnabled: true,
      status: { $nin: ['cancelled', 'completed'] } // Don't send reminders for cancelled/completed appointments
    });

    console.log(`Found ${appointments.length} appointments with email notifications enabled`);

    for (const apt of appointments) {
      // Parse appointment date/time reliably
      let aptTime = null;
      try {
        if (apt.date && apt.time) {
          const [y, m, d] = apt.date.split('-').map(Number);
          const [hh, mm] = apt.time.split(':').map(Number);
          aptTime = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
        }
      } catch (e) {
        console.error('Error parsing appointment date/time for appointment', apt._id, e);
        continue;
      }

      if (!aptTime) continue;

      const diffMinutes = (aptTime - now) / 1000 / 60; // minutes until appointment
      
      console.log(`Appointment ${apt._id}: ${diffMinutes.toFixed(1)} minutes until appointment`);
      
      // Check if we need to send any reminders
      let reminderType = null;
      let shouldSend = false;

      // DEVELOPMENT VERSION - Wider timing windows for easier testing
      
      // 1 day before (1440 minutes) - check within 2 hour window for testing
      if (Math.abs(diffMinutes - 1440) <= 120 && !apt.reminderEmailsSent.oneDayBefore) {
        reminderType = 'oneDayBefore';
        shouldSend = true;
        console.log(`📧 TRIGGERED: 1-Day reminder for appointment ${apt._id} (${diffMinutes.toFixed(1)} min away)`);
      }
      // 12 hours before (720 minutes) - check within 1 hour window for testing
      else if (Math.abs(diffMinutes - 720) <= 60 && !apt.reminderEmailsSent.twelveHoursBefore) {
        reminderType = 'twelveHoursBefore';
        shouldSend = true;
        console.log(`📧 TRIGGERED: 12-Hour reminder for appointment ${apt._id} (${diffMinutes.toFixed(1)} min away)`);
      }
      // 1 hour before (60 minutes) - check within 30 minute window for testing
      else if (Math.abs(diffMinutes - 60) <= 30 && !apt.reminderEmailsSent.oneHourBefore) {
        reminderType = 'oneHourBefore';
        shouldSend = true;
        console.log(`📧 TRIGGERED: 1-Hour reminder for appointment ${apt._id} (${diffMinutes.toFixed(1)} min away)`);
      }

      if (shouldSend && reminderType) {
        try {
          // Get user, doctor, and hospital information
          const user = await User.findById(apt.userId);
          const doctor = await User.findById(apt.doctorId);
          const hospital = await Hospital.findById(apt.hospitalId);

          if (!user || !user.email) {
            console.error(`No email found for user ${apt.userId} for appointment ${apt._id}`);
            continue;
          }

          if (!doctor || !hospital) {
            console.error(`Missing doctor or hospital data for appointment ${apt._id}`);
            continue;
          }

          // Send reminder email
          const emailResult = await sendReminderEmail(
            user.email,
            apt,
            doctor,
            hospital,
            reminderType
          );

          if (emailResult.success) {
            // Update the appointment to mark this reminder as sent
            const updateField = `reminderEmailsSent.${reminderType}`;
            await Appointment.findByIdAndUpdate(apt._id, {
              [updateField]: true
            });
            
            console.log(`✅ ${reminderType} reminder sent for appointment ${apt._id} to ${user.email}`);
          } else {
            console.error(`❌ Failed to send ${reminderType} reminder for appointment ${apt._id}:`, emailResult.error);
          }
        } catch (error) {
          console.error(`❌ Error processing ${reminderType} reminder for appointment ${apt._id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error in email reminder cron job:', error);
  }
});