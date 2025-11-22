const { google } = require('googleapis');

class CalendarService {
  constructor() {
    this.oauth2Client = null;
    this.initializeOAuth();
  }

  // Initialize OAuth2 client
  initializeOAuth() {
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback'
      );
      console.log('✅ Google Calendar service initialized');
    } else {
      console.log('⚠️  Google Calendar disabled - missing OAuth credentials');
    }
  }

  // Set credentials for a specific user
  setUserCredentials(accessToken, refreshToken) {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized');
    }
    
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });
  }

  // Create a calendar event for an appointment
  async createAppointmentEvent(user, appointment, doctor, hospital) {
    try {
      if (!user.calendarSyncEnabled || !user.googleRefreshToken) {
        console.log('Calendar sync not enabled for user');
        return { success: false, reason: 'Calendar sync not enabled' };
      }

      // Set user credentials
      this.setUserCredentials(user.googleAccessToken, user.googleRefreshToken);

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      // Parse appointment date and time
      const [year, month, day] = appointment.date.split('-');
      const [hour, minute] = appointment.time.split(':');
      
      // Create start and end datetime
      const startDateTime = new Date(year, month - 1, day, hour, minute);
      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(endDateTime.getHours() + 1); // Default 1 hour duration

      const event = {
        summary: `Appointment with Dr. ${doctor?.fullname || 'Doctor'}`,
        location: hospital?.name || 'Hospital',
        description: `
Medical Appointment
Doctor: ${doctor?.fullname || 'N/A'}
Specialization: ${doctor?.specialization || 'N/A'}
Hospital: ${hospital?.name || 'N/A'}
Location: ${hospital?.location || 'N/A'}
Type: ${appointment.type}
Confirmation Number: ${appointment.confirmationNumber}
Notes: ${appointment.notes || 'None'}

Please arrive 10 minutes early.
        `.trim(),
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'America/New_York', // You can make this dynamic based on user
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'America/New_York',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 60 },      // 1 hour before
            { method: 'popup', minutes: 10 },      // 10 minutes before
          ],
        },
        colorId: appointment.type === 'urgent' ? '11' : '9', // Red for urgent, blue for regular
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        sendUpdates: 'all',
      });

      console.log(`📅 Calendar event created: ${response.data.id}`);
      return { 
        success: true, 
        eventId: response.data.id,
        eventLink: response.data.htmlLink 
      };

    } catch (error) {
      console.error('Error creating calendar event:', error);
      
      // Handle token refresh if needed
      if (error.code === 401 || error.message?.includes('invalid_grant')) {
        return { success: false, error: 'Calendar authorization expired. Please reconnect your calendar.' };
      }
      
      return { success: false, error: error.message };
    }
  }

  // Update a calendar event
  async updateAppointmentEvent(user, appointment, eventId, doctor, hospital) {
    try {
      if (!user.calendarSyncEnabled || !user.googleRefreshToken) {
        return { success: false, reason: 'Calendar sync not enabled' };
      }

      this.setUserCredentials(user.googleAccessToken, user.googleRefreshToken);
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      // Parse appointment date and time
      const [year, month, day] = appointment.date.split('-');
      const [hour, minute] = appointment.time.split(':');
      
      const startDateTime = new Date(year, month - 1, day, hour, minute);
      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(endDateTime.getHours() + 1);

      const event = {
        summary: `Appointment with Dr. ${doctor?.fullname || 'Doctor'}`,
        location: hospital?.name || 'Hospital',
        description: `
Medical Appointment
Doctor: ${doctor?.fullname || 'N/A'}
Specialization: ${doctor?.specialization || 'N/A'}
Hospital: ${hospital?.name || 'N/A'}
Type: ${appointment.type}
Status: ${appointment.status}
Confirmation Number: ${appointment.confirmationNumber}
Notes: ${appointment.notes || 'None'}
        `.trim(),
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'America/New_York',
        },
      };

      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: event,
        sendUpdates: 'all',
      });

      console.log(`📅 Calendar event updated: ${response.data.id}`);
      return { success: true, eventId: response.data.id };

    } catch (error) {
      console.error('Error updating calendar event:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete a calendar event
  async deleteAppointmentEvent(user, eventId) {
    try {
      if (!user.calendarSyncEnabled || !user.googleRefreshToken) {
        return { success: false, reason: 'Calendar sync not enabled' };
      }

      this.setUserCredentials(user.googleAccessToken, user.googleRefreshToken);
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
        sendUpdates: 'all',
      });

      console.log(`📅 Calendar event deleted: ${eventId}`);
      return { success: true };

    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return { success: false, error: error.message };
    }
  }

  // Test calendar access
  async testCalendarAccess(user) {
    try {
      if (!user.googleRefreshToken) {
        return { success: false, error: 'No calendar authorization found' };
      }

      this.setUserCredentials(user.googleAccessToken, user.googleRefreshToken);
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      // Try to list calendars to verify access
      const response = await calendar.calendarList.list({
        maxResults: 1
      });

      return { 
        success: true, 
        message: 'Calendar access verified',
        calendarCount: response.data.items?.length || 0
      };

    } catch (error) {
      console.error('Calendar access test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new CalendarService();
