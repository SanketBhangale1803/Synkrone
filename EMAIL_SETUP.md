# Email Configuration for Synkrone

This application now supports email notifications for appointment confirmations and reminders.

## Setup Instructions

1. **Create a Gmail App Password** (recommended) or use your email provider's SMTP settings:
   - Go to your Gmail account settings
   - Enable 2-factor authentication if not already enabled
   - Generate an "App Password" for this application
   - Copy the 16-character app password

2. **Create/Update your .env file** in the root directory with these variables:

```env
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password-here

# For other email providers, you can also use:
# SMTP_HOST=smtp.your-provider.com
# SMTP_PORT=587
```

3. **Alternative Email Providers:**
   
   For **Outlook/Hotmail**:
   ```env
   SMTP_HOST=smtp-mail.outlook.com
   SMTP_PORT=587
   EMAIL_USER=your-email@outlook.com
   EMAIL_PASSWORD=your-password
   ```
   
   For **Yahoo**:
   ```env
   SMTP_HOST=smtp.mail.yahoo.com
   SMTP_PORT=587
   EMAIL_USER=your-email@yahoo.com
   EMAIL_PASSWORD=your-app-password
   ```

4. **Test the Configuration:**
   - Restart your application after adding the environment variables
   - Create a test appointment and enable email notifications
   - Check your email for the confirmation

## Features

### Email Notifications Include:

1. **Confirmation Email** (sent immediately when user opts in):
   - Complete appointment details
   - Unique confirmation number
   - Doctor and hospital information
   - Professional HTML formatting

2. **Reminder Emails** (sent automatically):
   - **1 day before** the appointment
   - **12 hours before** the appointment  
   - **1 hour before** the appointment

### Security Features:

- Users must explicitly opt-in to email notifications
- Emails are only sent to the authenticated user's email address
- Confirmation numbers are unique and securely generated
- Email preferences are stored per appointment

## Troubleshooting

If emails are not being sent:

1. Check your .env file configuration
2. Verify your email provider settings
3. For Gmail, ensure you're using an App Password, not your regular password
4. Check the server logs for email sending errors
5. Test your email configuration by creating a test appointment

## Email Templates

The application includes professionally designed HTML email templates with:
- Responsive design that works on mobile and desktop
- Clear appointment information layout
- Branded Synkrone styling
- Easy-to-read confirmation numbers and details

For any issues with email setup, check the server console logs when creating appointments or contact your system administrator.