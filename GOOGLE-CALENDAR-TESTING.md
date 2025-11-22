# Testing Google Calendar Integration

## Prerequisites

1. **Google Cloud Console Setup**:
   - Google Calendar API enabled
   - OAuth 2.0 credentials created
   - Redirect URI configured: `http://localhost:3000/auth/google/complete`

2. **Environment Variables** in `.env`:
   ```env
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/complete
   ```

3. **Server Running**:
   ```bash
   npm start
   ```

## Test Scenarios

### 1. Google OAuth Sign-In

**Test**: User signs in with Google and grants calendar permissions

**Steps**:
1. Navigate to: `http://localhost:3000/auth/google`
2. Sign in with your Google account
3. Grant permissions when prompted (profile + calendar)
4. Should redirect to home page after successful auth

**Verify**:
```bash
# Check user in MongoDB has calendar fields set
# Using MongoDB shell or Compass:
db.users.findOne({ googleId: { $exists: true } })
# Should show:
# - googleId
# - googleRefreshToken
# - googleAccessToken
# - calendarSyncEnabled: true
```

### 2. Create Appointment with Calendar Event

**Test**: Book appointment and verify it appears in Google Calendar

**Steps**:
1. Get your JWT token after logging in
2. Get a doctor ID and hospital ID from database
3. Send POST request:

```bash
curl -X POST http://localhost:3000/appointments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test Patient",
    "phone": "5551234567",
    "date": "2024-02-20",
    "time": "14:00",
    "type": "Consultation",
    "doctorId": "DOCTOR_ID_HERE",
    "hospitalId": "HOSPITAL_ID_HERE",
    "notes": "Calendar sync test"
  }'
```

**Verify**:
1. Check response has `calendarEventId`:
   ```json
   {
     "success": true,
     "appointmentId": "...",
     "appointment": {
       "calendarEventId": "some_google_event_id",
       ...
     }
   }
   ```

2. Open Google Calendar in browser (use same Google account)
3. Navigate to February 20, 2024 at 2:00 PM
4. Should see event: "Appointment: Consultation"
5. Event details should include doctor and hospital info

### 3. Update Appointment

**Test**: Modify appointment and verify calendar event updates

**Steps**:
```bash
curl -X PUT http://localhost:3000/appointments/APPOINTMENT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test Patient",
    "phone": "5551234567",
    "date": "2024-02-22",
    "time": "10:00",
    "type": "Follow-up"
  }'
```

**Verify**:
1. Check Google Calendar
2. Event should now be on February 22, 2024 at 10:00 AM
3. Title should be "Appointment: Follow-up"

### 4. Delete Appointment

**Test**: Cancel appointment and verify calendar event is removed

**Steps**:
```bash
curl -X DELETE http://localhost:3000/appointments/APPOINTMENT_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Verify**:
1. Refresh Google Calendar
2. Event should no longer appear
3. Check appointment is deleted from database

### 5. Check Calendar Status

**Test**: Verify calendar sync status for user

**Steps**:
```bash
curl -X GET http://localhost:3000/users/calendar/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response**:
```json
{
  "calendarSyncEnabled": true,
  "hasGoogleAccount": true
}
```

### 6. Test Calendar Access

**Test**: Verify Google Calendar API connection is working

**Steps**:
```bash
curl -X GET http://localhost:3000/users/calendar/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Calendar access verified",
  "calendarName": "Primary"
}
```

### 7. Disable Calendar Sync

**Test**: Turn off calendar sync for user

**Steps**:
```bash
curl -X POST http://localhost:3000/users/calendar/disable \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Verify**:
1. Create a new appointment
2. Should NOT appear in Google Calendar
3. Check status endpoint shows `calendarSyncEnabled: false`

### 8. Re-enable Calendar Sync

**Test**: Turn calendar sync back on

**Steps**:
```bash
curl -X POST http://localhost:3000/users/calendar/enable \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Verify**:
1. Create a new appointment
2. Should appear in Google Calendar again
3. Status endpoint shows `calendarSyncEnabled: true`

## Using Postman/Insomnia

### Setup Collection

1. **Create Environment Variables**:
   - `base_url`: `http://localhost:3000`
   - `jwt_token`: Your JWT token after login
   - `appointment_id`: Store after creating appointment

2. **Import Requests**:

**Login** (to get token):
```
POST {{base_url}}/users/login
Body: {"username": "your_username", "password": "your_password"}
```

**Create Appointment**:
```
POST {{base_url}}/appointments
Headers: Authorization: Bearer {{jwt_token}}
Body: {...appointment data...}
```

**Update Appointment**:
```
PUT {{base_url}}/appointments/{{appointment_id}}
Headers: Authorization: Bearer {{jwt_token}}
Body: {...updated data...}
```

**Delete Appointment**:
```
DELETE {{base_url}}/appointments/{{appointment_id}}
Headers: Authorization: Bearer {{jwt_token}}
```

## Troubleshooting Tests

### Appointments not appearing in calendar
1. Check server logs for errors
2. Verify `calendarSyncEnabled: true` in user document
3. Run `/users/calendar/test` to verify API access
4. Check if `googleRefreshToken` exists for user

### "Invalid credentials" error
1. User needs to re-authenticate with Google
2. Navigate to `/auth/google` again
3. Grant permissions

### Token refresh errors
1. Check `.env` has correct `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
2. Verify OAuth consent screen is configured
3. Check Google Cloud Console for API quota limits

### Calendar events not updating
1. Ensure appointment has `calendarEventId` stored
2. Check server logs for calendar API errors
3. Verify user still has valid refresh token

## Test Data Cleanup

After testing, clean up test data:

### Remove Test Appointments from Database
```javascript
// In MongoDB shell
db.appointments.deleteMany({ notes: /calendar sync test/i })
```

### Remove Calendar Events
Calendar events should auto-delete when appointments are removed, but you can manually clean:
1. Open Google Calendar
2. Delete any test events manually

### Reset User Calendar Sync
```javascript
// In MongoDB shell
db.users.updateOne(
  { username: "test_user" },
  { $set: { calendarSyncEnabled: false } }
)
```

## Success Criteria

✅ All tests should pass with:
- Appointments created successfully
- Calendar events appear in Google Calendar with correct details
- Updates reflect in both database and calendar
- Deletions remove events from calendar
- Calendar sync can be enabled/disabled
- No errors in server logs during normal operations
