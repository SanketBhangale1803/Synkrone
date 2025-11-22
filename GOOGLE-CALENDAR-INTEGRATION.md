# Google Calendar Integration

## Overview
The Synkrone application automatically syncs appointments to users' Google Calendars when they sign in with Google OAuth.

## Features
- **Automatic Event Creation**: When a user books an appointment, it's automatically added to their Google Calendar
- **Event Updates**: Changes to appointment date/time are reflected in Google Calendar
- **Event Deletion**: Cancelled appointments are removed from Google Calendar
- **OAuth 2.0**: Secure authentication using Google's OAuth 2.0 with offline access

## Setup

### 1. Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/auth/google/complete` (development)
     - `https://yourdomain.com/auth/google/complete` (production)
   - Save the **Client ID** and **Client Secret**

### 2. Environment Variables

Add these to your `.env` file:

```env
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/complete
```

For production, update `GOOGLE_CALLBACK_URL` to your production domain.

### 3. Install Dependencies

The required package is already installed:
```bash
npm install googleapis
```

## How It Works

### User Authentication Flow

1. User clicks "Sign in with Google"
2. User is redirected to Google OAuth consent screen
3. User grants permission for:
   - Profile information (email, name)
   - Google Calendar access (create/edit/delete events)
4. Google redirects back with authorization code
5. Application exchanges code for access token and refresh token
6. Tokens are stored in user's database record
7. Calendar sync is automatically enabled

### Appointment Lifecycle

#### Creating an Appointment
```javascript
// When user books appointment
1. Appointment is created in database
2. If user has Google Calendar enabled:
   - Calendar event is created using Google Calendar API
   - Event ID is stored in appointment.calendarEventId
   - Event includes: date, time, doctor name, hospital info
```

#### Updating an Appointment
```javascript
// When appointment details change
1. Appointment is updated in database
2. If calendarEventId exists:
   - Google Calendar event is updated with new details
   - Handles date/time changes, type changes, etc.
```

#### Deleting an Appointment
```javascript
// When appointment is cancelled
1. Appointment is deleted from database
2. If calendarEventId exists:
   - Google Calendar event is deleted
   - User's calendar is cleaned up automatically
```

## API Endpoints

### Calendar Management

#### Get Calendar Status
```http
GET /users/calendar/status
Authorization: Bearer <token>

Response:
{
  "calendarSyncEnabled": true,
  "hasGoogleAccount": true
}
```

#### Disable Calendar Sync
```http
POST /users/calendar/disable
Authorization: Bearer <token>

Response:
{
  "message": "Calendar sync disabled"
}
```

#### Enable Calendar Sync
```http
POST /users/calendar/enable
Authorization: Bearer <token>

Response:
{
  "message": "Calendar sync enabled"
}
```

#### Test Calendar Access
```http
GET /users/calendar/test
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Calendar access verified",
  "calendarName": "Primary"
}
```

## Database Schema

### User Model Updates
```javascript
{
  googleId: String,              // Google OAuth user ID
  googleRefreshToken: String,    // Long-lived refresh token
  googleAccessToken: String,     // Short-lived access token
  calendarSyncEnabled: Boolean   // User preference for calendar sync
}
```

### Appointment Model Updates
```javascript
{
  calendarEventId: String,  // Google Calendar event ID
  // ... other appointment fields
}
```

## Error Handling

The calendar integration includes comprehensive error handling:

- **Token Expiration**: Automatically refreshes access tokens using refresh token
- **API Failures**: Appointments still work even if calendar sync fails
- **Missing Permissions**: Users must re-authenticate if permissions are revoked
- **Network Issues**: Gracefully degrades to non-calendar mode

Example error handling:
```javascript
try {
  await calendarService.createAppointmentEvent(user, appointment);
} catch (calendarError) {
  console.error('Calendar sync failed:', calendarError);
  // Appointment is still saved, just without calendar event
}
```

## Calendar Event Details

Events created in Google Calendar include:

- **Summary**: "Appointment: [Type]"
- **Description**: Doctor name and hospital information
- **Start Time**: Appointment date and time (1-hour duration)
- **Location**: Hospital address
- **Reminders**: 30 minutes and 24 hours before appointment

Example calendar event:
```
Summary: Appointment: Consultation
Description: Doctor: Dr. Smith at General Hospital
Location: 123 Main St, City, State
Start: 2024-02-15T10:00:00
End: 2024-02-15T11:00:00
Reminders: 30 min, 24 hours
```

## Testing

### Manual Testing

1. **Sign in with Google**:
   ```
   Navigate to: http://localhost:3000/auth/google
   Grant calendar permissions
   ```

2. **Create Appointment**:
   ```
   POST http://localhost:3000/appointments
   {
     "name": "John Doe",
     "phone": "1234567890",
     "date": "2024-02-15",
     "time": "10:00",
     "type": "Consultation",
     "doctorId": "...",
     "hospitalId": "..."
   }
   ```

3. **Check Google Calendar**:
   - Open Google Calendar in browser
   - Verify appointment appears with correct details

4. **Update Appointment**:
   ```
   PUT http://localhost:3000/appointments/:id
   {
     "date": "2024-02-20",
     "time": "14:00"
   }
   ```

5. **Verify Update**:
   - Refresh Google Calendar
   - Confirm event updated to new date/time

6. **Delete Appointment**:
   ```
   DELETE http://localhost:3000/appointments/:id
   ```

7. **Verify Deletion**:
   - Refresh Google Calendar
   - Confirm event no longer appears

### Test Calendar Access
```bash
curl -X GET http://localhost:3000/users/calendar/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### "Calendar access failed"
- Check if Google Calendar API is enabled in Google Cloud Console
- Verify OAuth credentials are correct in `.env`
- Ensure user has granted calendar permissions

### "Invalid credentials"
- User's refresh token may have expired
- Ask user to re-authenticate with Google
- Check if OAuth consent screen is configured correctly

### Events not appearing
- Verify `calendarSyncEnabled` is true for the user
- Check browser console and server logs for errors
- Test calendar access using `/users/calendar/test` endpoint

### Token refresh errors
- Ensure `accessType: 'offline'` is set in passport config
- Verify refresh token is being stored correctly
- Check Google Cloud Console for API quota limits

## Security Considerations

1. **Token Storage**: Refresh tokens are stored encrypted in MongoDB
2. **Scope Limitation**: Only requests calendar.events scope (read/write events only)
3. **User Consent**: Users must explicitly grant calendar permissions
4. **Revocation**: Users can revoke access from Google Account settings
5. **HTTPS**: Always use HTTPS in production for OAuth callbacks

## Production Deployment

1. Update environment variables:
   ```env
   GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/complete
   NODE_ENV=production
   ```

2. Add production redirect URI in Google Cloud Console

3. Enable HTTPS for your domain

4. Test OAuth flow in production environment

5. Monitor error logs for calendar sync issues

## Future Enhancements

- Bulk sync existing appointments to calendar
- Calendar event color coding by appointment type
- Meeting invitations to include doctors
- SMS/Email reminders synced with calendar
- Support for multiple calendars
- Two-way sync (calendar → appointments)
