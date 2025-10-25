const nodemailer = require('nodemailer');
const CredentialManager = require('../security/CredentialManager');
require('dotenv').config();

// Initialize credential manager for secure email authentication
const credentialManager = new CredentialManager();

// Function to get secure email configuration
function getEmailConfig() {
  try {
    const credentials = credentialManager.loadAndDecryptCredentials();
    
    if (!credentials.email || !credentials.password) {
      console.warn('⚠️  Email credentials not found in secure storage or environment variables');
      return null;
    }

    console.log(`🔐 Email credentials loaded from: ${credentials.source}`);
    
    return {
      service: 'gmail',
      auth: {
        user: credentials.email,
        pass: credentials.password
      }
    };
  } catch (error) {
    console.error('❌ Error loading email configuration:', error.message);
    return null;
  }
}

// Initialize email transporter with secure configuration
let transporter = null;
const emailConfig = getEmailConfig();

if (emailConfig) {
  transporter = nodemailer.createTransport(emailConfig);
  console.log('✅ Email transporter initialized with secure credentials');
} else {
  console.error('❌ Failed to initialize email transporter - missing credentials');
}

// Alternative configuration for other email services:
// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: process.env.SMTP_PORT || 587,
//   secure: false,
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASSWORD
//   }
// });

/**
 * Generate confirmation email HTML template
 */
function generateConfirmationEmail(appointmentData, doctorData, hospitalData) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .appointment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; margin: 10px 0; border-bottom: 1px solid #eee; padding-bottom: 8px; }
        .detail-label { font-weight: bold; color: #555; }
        .confirmation-number { background: #28a745; color: white; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Appointment Confirmed!</h1>
          <p>Your appointment has been successfully scheduled</p>
        </div>
        
        <div class="content">
          <div class="confirmation-number">
            <h2>Confirmation Number: ${appointmentData.confirmationNumber}</h2>
            <p>Please save this number for your records</p>
          </div>
          
          <div class="appointment-details">
            <h3>📅 Appointment Details</h3>
            
            <div class="detail-row">
              <span class="detail-label">Patient Name:</span>
              <span>${appointmentData.name}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Phone Number:</span>
              <span>${appointmentData.phone}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span>${new Date(appointmentData.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Time:</span>
              <span>${appointmentData.time}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Appointment Type:</span>
              <span>${appointmentData.type.charAt(0).toUpperCase() + appointmentData.type.slice(1)}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Doctor:</span>
              <span>${doctorData.fullname || doctorData.name || 'Dr. ' + doctorData.username}</span>
            </div>
            
            ${doctorData.specialization ? `
            <div class="detail-row">
              <span class="detail-label">Specialization:</span>
              <span>${doctorData.specialization}</span>
            </div>
            ` : ''}
            
            <div class="detail-row">
              <span class="detail-label">Hospital:</span>
              <span>${hospitalData.name}</span>
            </div>
            
            ${hospitalData.address ? `
            <div class="detail-row">
              <span class="detail-label">Address:</span>
              <span>${hospitalData.address}</span>
            </div>
            ` : ''}
            
            ${appointmentData.notes ? `
            <div class="detail-row">
              <span class="detail-label">Notes:</span>
              <span>${appointmentData.notes}</span>
            </div>
            ` : ''}
          </div>
          
          <div style="text-align: center;">
            <p><strong>🔔 You will receive reminder emails:</strong></p>
            <ul style="text-align: left; display: inline-block;">
              <li>1 day before your appointment</li>
              <li>12 hours before your appointment</li>
              <li>1 hour before your appointment</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>Thank you for choosing Synkrone for your healthcare needs!</p>
            <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
            <p><strong>Synkrone Healthcare</strong><br>
            Smart Appointment Scheduling</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate reminder email HTML template
 */
function generateReminderEmail(appointmentData, doctorData, hospitalData, reminderType) {
  const reminderTitles = {
    oneDayBefore: '🗓️ Reminder: Appointment Tomorrow',
    twelveHoursBefore: '⏰ Reminder: Appointment in 12 Hours',
    oneHourBefore: '🚨 Reminder: Appointment in 1 Hour'
  };

  const reminderMessages = {
    oneDayBefore: 'This is a friendly reminder that you have an appointment scheduled for tomorrow.',
    twelveHoursBefore: 'Your appointment is coming up in 12 hours. Please prepare accordingly.',
    oneHourBefore: 'Your appointment is starting in 1 hour. Please make your way to the hospital.'
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .appointment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; margin: 10px 0; border-bottom: 1px solid #eee; padding-bottom: 8px; }
        .detail-label { font-weight: bold; color: #555; }
        .confirmation-number { background: #007bff; color: white; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${reminderTitles[reminderType]}</h1>
          <p>${reminderMessages[reminderType]}</p>
        </div>
        
        <div class="content">
          <div class="confirmation-number">
            <h3>Confirmation Number: ${appointmentData.confirmationNumber}</h3>
          </div>
          
          <div class="appointment-details">
            <h3>📅 Appointment Details</h3>
            
            <div class="detail-row">
              <span class="detail-label">Patient Name:</span>
              <span>${appointmentData.name}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span>${new Date(appointmentData.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Time:</span>
              <span>${appointmentData.time}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Doctor:</span>
              <span>${doctorData.fullname || doctorData.name || 'Dr. ' + doctorData.username}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Hospital:</span>
              <span>${hospitalData.name}</span>
            </div>
            
            ${hospitalData.address ? `
            <div class="detail-row">
              <span class="detail-label">Address:</span>
              <span>${hospitalData.address}</span>
            </div>
            ` : ''}
            
            <div class="detail-row">
              <span class="detail-label">Appointment Type:</span>
              <span>${appointmentData.type.charAt(0).toUpperCase() + appointmentData.type.slice(1)}</span>
            </div>
          </div>
          
          <div class="footer">
            <p>Please arrive 15 minutes before your scheduled time.</p>
            <p>If you need to reschedule or cancel, please contact us immediately.</p>
            <p><strong>Synkrone Healthcare</strong><br>
            Smart Appointment Scheduling</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send confirmation email
 */
async function sendConfirmationEmail(userEmail, appointmentData, doctorData, hospitalData) {
  try {
    // Check if email transporter is initialized
    if (!transporter) {
      return { 
        success: false, 
        error: 'Email service not configured. Please run the credential setup tool.' 
      };
    }

    // Verify credentials are valid
    const verification = credentialManager.verifyCredentials();
    if (!verification.valid) {
      return { 
        success: false, 
        error: `Invalid email credentials: ${verification.error}` 
      };
    }

    // Get current credentials for the email
    const credentials = credentialManager.loadAndDecryptCredentials();

    const mailOptions = {
      from: `"Synkrone Healthcare" <${credentials.email}>`, // Professional sender name
      to: userEmail,
      subject: `Appointment Confirmed - ${appointmentData.confirmationNumber}`,
      html: generateConfirmationEmail(appointmentData, doctorData, hospitalData)
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Confirmation email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    
    // Provide helpful error messages for common Gmail issues
    if (error.code === 'EAUTH') {
      return { 
        success: false, 
        error: 'Gmail authentication failed. Please check GMAIL_TROUBLESHOOTING.md for setup instructions. Make sure you are using an App Password, not your regular Gmail password.' 
      };
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Send reminder email
 */
async function sendReminderEmail(userEmail, appointmentData, doctorData, hospitalData, reminderType) {
  try {
    // Check if email transporter is initialized
    if (!transporter) {
      return { 
        success: false, 
        error: 'Email service not configured. Please run the credential setup tool.' 
      };
    }

    // Verify credentials are valid
    const verification = credentialManager.verifyCredentials();
    if (!verification.valid) {
      return { 
        success: false, 
        error: `Invalid email credentials: ${verification.error}` 
      };
    }

    // Get current credentials for the email
    const credentials = credentialManager.loadAndDecryptCredentials();

    const subjects = {
      oneDayBefore: `Reminder: Appointment Tomorrow - ${appointmentData.confirmationNumber}`,
      twelveHoursBefore: `Reminder: Appointment in 12 Hours - ${appointmentData.confirmationNumber}`,
      oneHourBefore: `Reminder: Appointment in 1 Hour - ${appointmentData.confirmationNumber}`
    };

    const mailOptions = {
      from: `"Synkrone Healthcare" <${credentials.email}>`, // Professional sender name
      to: userEmail,
      subject: subjects[reminderType],
      html: generateReminderEmail(appointmentData, doctorData, hospitalData, reminderType)
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`${reminderType} reminder email sent successfully:`, result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(`Error sending ${reminderType} reminder email:`, error);
    
    // Provide helpful error messages for common Gmail issues
    if (error.code === 'EAUTH') {
      return { 
        success: false, 
        error: 'Gmail authentication failed. Please check GMAIL_TROUBLESHOOTING.md for setup instructions. Make sure you are using an App Password, not your regular Gmail password.' 
      };
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Test email configuration
 */
async function testEmailConfiguration() {
  try {
    if (!transporter) {
      return { success: false, error: 'Email transporter not initialized' };
    }
    
    await transporter.verify();
    console.log('Email server is ready to take our messages');
    
    const verification = credentialManager.verifyCredentials();
    return { 
      success: true, 
      credentialSource: verification.source,
      timestamp: verification.timestamp 
    };
  } catch (error) {
    console.error('Email configuration error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendConfirmationEmail,
  sendReminderEmail,
  testEmailConfiguration
};