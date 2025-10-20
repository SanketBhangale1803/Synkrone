// Simple test to verify email service setup
const { testEmailConfiguration } = require('./services/emailService');

async function testEmailSetup() {
  console.log('Testing email configuration...');
  
  const result = await testEmailConfiguration();
  
  if (result.success) {
    console.log('✅ Email configuration is working!');
  } else {
    console.log('❌ Email configuration failed:', result.error);
    console.log('\n📧 Please make sure you have set up your .env file with:');
    console.log('EMAIL_USER=your-email@gmail.com');
    console.log('EMAIL_PASSWORD=your-app-password');
  }
}

testEmailSetup();