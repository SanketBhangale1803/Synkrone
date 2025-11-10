const nodemailer = require('nodemailer');

class NotificationService {
  constructor() {
    // Email configuration
    this.emailTransporter = null;
    this.initializeEmail();
  }

  // Initialize email service
  initializeEmail() {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      this.emailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
      console.log('✅ Email notifications enabled');
    } else {
      console.log('⚠️  Email notifications disabled - missing credentials');
    }
  }

  // Send email notification
  async sendEmail(to, subject, message) {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured');
    }

    try {
      const mailOptions = {
        from: `"Synkrone Healthcare" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        html: this.generateEmailTemplate(subject, message),
        attachments: [{
          filename: 'logo.png',
          path: './public/images/logo.png',
          cid: 'logo'
        }]
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      console.log(`📧 Email sent to ${to}: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Test email configuration
  async testEmailConfiguration() {
    if (!this.emailTransporter) {
      return { success: false, error: 'Email service not configured - missing EMAIL_USER or EMAIL_PASSWORD' };
    }
    
    try {
      await this.emailTransporter.verify();
      console.log('Email server is ready to take our messages');
      return { success: true, message: 'Email configuration verified successfully' };
    } catch (error) {
      console.error('Email configuration error:', error);
      
      // Provide specific error messages for common Gmail issues
      if (error.code === 'EAUTH') {
        return { 
          success: false, 
          error: 'Gmail authentication failed. Make sure you are using an App Password, not your regular Gmail password.' 
        };
      }
      
      return { success: false, error: error.message };
    }
  }

  // Send web push notification (existing functionality)
  async sendWebPush(subscription, payload) {
    const webpush = require('web-push');
    
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      console.log('🔔 Web push notification sent');
      return { success: true };
    } catch (error) {
      console.error('Web push failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Universal notification method - sends via email and web push
  async sendNotification(user, title, message, options = {}) {
    const results = {};
    
    // Send web push if user has subscription
    if (user.pushSubscription && user.pushSubscription.endpoint && !options.skipWebPush) {
      results.webPush = await this.sendWebPush(user.pushSubscription, {
        title,
        body: message,
        icon: '/images/logo.png',
        badge: '/images/logo.png'
      });
    }

    // Send email if user has email and email is enabled
    if (user.email && !options.skipEmail) {
      results.email = await this.sendEmail(user.email, title, message);
    }

    return results;
  }

  // Generate HTML email template
  generateEmailTemplate(title, message) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #2D3748;
            background: #F7FAFC;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #ffffff;
          }
          .logo-container {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
          }
          .logo {
            width: 120px;
            height: auto;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 30px;
          }
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
            color: #ffffff;
          }
          .content {
            background: #ffffff;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            margin-bottom: 30px;
          }
          .content p {
            margin-bottom: 20px;
            font-size: 16px;
            color: #4A5568;
          }
          .details {
            background: #F7FAFC;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #E2E8F0;
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .detail-label {
            font-weight: 600;
            color: #4A5568;
          }
          .detail-value {
            color: #2D3748;
          }
          .cta-button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 14px 28px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            padding: 30px;
            color: #718096;
            font-size: 14px;
            border-top: 1px solid #E2E8F0;
          }
          .social-links {
            margin: 20px 0;
          }
          .social-link {
            display: inline-block;
            margin: 0 10px;
            color: #667eea;
            text-decoration: none;
          }
          .info-box {
            background: #EBF4FF;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          @media only screen and (max-width: 600px) {
            .container {
              width: 100%;
              padding: 10px;
            }
            .header {
              padding: 30px 20px;
            }
            .content {
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo-container">
            <img src="cid:logo" alt="Synkrone Logo" class="logo">
          </div>
          
          <div class="header">
            <h1>${title}</h1>
          </div>
          
          <div class="content">
            ${this.formatMessageContent(message)}

            <div class="info-box">
              <p style="margin: 0;">
                <strong>Important:</strong> Please arrive 10 minutes before your scheduled time.
                If you need to reschedule, please contact us at least 24 hours in advance.
              </p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.BASE_URL}/appointments" class="cta-button">
                View Appointment Details
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Synkrone Healthcare</strong></p>
            <p>Smart Appointment Scheduling</p>
            <div class="social-links">
              <a href="#" class="social-link">Facebook</a>
              <a href="#" class="social-link">Twitter</a>
              <a href="#" class="social-link">LinkedIn</a>
            </div>
            <p style="margin-top: 20px; font-size: 12px; color: #A0AEC0;">
              This is an automated message, please do not reply directly to this email.<br>
              For support, please contact us at support@synkrone.com
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Helper method to format message content
  formatMessageContent(message) {
    if (typeof message === 'string' && message.includes('Details:')) {
      // Parse the details section and format it nicely
      const [intro, details] = message.split('Details:');
      const detailLines = details.trim().split('\n').filter(line => line.trim());
      
      return `
        <p>${intro.trim()}</p>
        <div class="details">
          ${detailLines.map(line => {
            const [label, value] = line.split(':').map(s => s.trim().replace(/^- /, ''));
            return `
              <div class="detail-row">
                <span class="detail-label">${label}</span>
                <span class="detail-value">${value || ''}</span>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
    
    // For regular messages without details section
    return `<p>${message}</p>`;
  }
}

module.exports = new NotificationService();