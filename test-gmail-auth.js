// Gmail Authentication Test Script
require('dotenv').config();
const nodemailer = require('nodemailer');

async function testGmailAuth() {
  console.log('🧪 Testing Gmail Authentication...\n');
  
  // Check if credentials are set
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('❌ EMAIL_USER and EMAIL_PASSWORD not found in .env file');
    console.log('📝 Please add them to your .env file:\n');
    console.log('EMAIL_USER=your-email@gmail.com');
    console.log('EMAIL_PASSWORD=your-16-character-app-password\n');
    return;
  }
  
  // Check for placeholder values
  if (process.env.EMAIL_USER.includes('your-') || process.env.EMAIL_PASSWORD.includes('your-')) {
    console.log('❌ Found placeholder values in .env file');
    console.log('📝 Please replace placeholders with real credentials:\n');
    console.log(`Current EMAIL_USER: ${process.env.EMAIL_USER}`);
    console.log(`Current EMAIL_PASSWORD: ${process.env.EMAIL_PASSWORD}\n`);
    return;
  }
  
  console.log(`📧 Testing with: ${process.env.EMAIL_USER}`);
  console.log(`🔐 Password length: ${process.env.EMAIL_PASSWORD.length} characters\n`);
  
  // Create transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
  
  try {
    // Test connection
    console.log('🔄 Testing connection...');
    await transporter.verify();
    console.log('✅ Gmail authentication successful!');
    console.log('🎉 You can now use email notifications in your app.\n');
    
    // Optional: Send test email to yourself
    console.log('📬 Sending test email...');
    const testEmail = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: 'Synkrone Email Test - Success!',
      html: `
        <h2>🎉 Gmail Setup Successful!</h2>
        <p>Your email notifications are now configured correctly.</p>
        <p><strong>Test completed at:</strong> ${new Date().toLocaleString()}</p>
        <p>You can now use the email notification features in your Synkrone appointment system.</p>
      `
    };
    
    const result = await transporter.sendMail(testEmail);
    console.log(`✅ Test email sent successfully! Message ID: ${result.messageId}`);
    console.log('📥 Check your inbox for the test email.\n');
    
  } catch (error) {
    console.log('❌ Gmail authentication failed!');
    console.log(`Error: ${error.message}\n`);
    
    if (error.code === 'EAUTH') {
      console.log('🔧 This is an authentication error. Common solutions:');
      console.log('1. Make sure 2-Factor Authentication is enabled on your Google account');
      console.log('2. Generate a new App Password: https://myaccount.google.com/apppasswords');
      console.log('3. Use the 16-character App Password, NOT your regular Gmail password');
      console.log('4. Make sure your email address is correct');
      console.log('5. Remove any spaces from the app password\n');
      
      console.log('📖 For detailed instructions, see: GMAIL_TROUBLESHOOTING.md');
    }
  }
}

testGmailAuth();