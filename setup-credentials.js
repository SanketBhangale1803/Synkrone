/**
 * Secure Credential Setup Script
 * Run this script to encrypt and store your Gmail credentials securely
 * 
 * Usage: node setup-credentials.js
 */

const CredentialManager = require('./security/CredentialManager');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function setupCredentials() {
  console.log('🔐 Secure Email Credential Setup');
  console.log('==================================');
  console.log('This script will encrypt and store your Gmail credentials securely.');
  console.log('Your credentials will be encrypted using AES-256 encryption.\n');

  try {
    // Get credentials from user
    const email = await askQuestion('Enter your Gmail email address: ');
    
    // Hide password input (note: this won't hide in basic terminal, but provides security reminder)
    console.log('\nIMPORTANT: Make sure to use your Gmail App Password, not your regular password!');
    console.log('To create an App Password:');
    console.log('1. Go to https://myaccount.google.com/security');
    console.log('2. Enable 2-Step Verification if not already enabled');
    console.log('3. Go to "App passwords" and generate a new password for "Mail"');
    console.log('4. Use that 16-character password below\n');
    
    const password = await askQuestion('Enter your Gmail App Password (16 characters): ');

    if (password.length !== 16) {
      console.log('❌ Warning: Gmail App Passwords are typically 16 characters long.');
      const confirm = await askQuestion('Continue anyway? (y/n): ');
      if (confirm.toLowerCase() !== 'y') {
        console.log('Setup cancelled.');
        rl.close();
        return;
      }
    }

    // Display what will be encrypted
    console.log('\n📋 Credentials to encrypt:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${'*'.repeat(password.length)} (${password.length} characters)`);
    
    const confirm = await askQuestion('\nEncrypt and save these credentials? (y/n): ');
    
    if (confirm.toLowerCase() === 'y') {
      // Encrypt and save credentials
      const credentialManager = new CredentialManager();
      await credentialManager.encryptAndSaveCredentials(email, password);
      
      console.log('\n✅ Success! Your credentials have been encrypted and saved securely.');
      console.log('📁 Encrypted credentials stored in: ./config/encrypted-credentials.json');
      console.log('🔑 Encryption key stored in: .env file (CREDENTIAL_ENCRYPTION_KEY)');
      
      console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
      console.log('1. Keep your .env file secure and never commit it to version control');
      console.log('2. The encrypted-credentials.json file is safe to backup');
      console.log('3. If you lose the encryption key, you\'ll need to re-run this setup');
      console.log('4. Your original Gmail password is not stored anywhere');
      
      // Test the credentials
      console.log('\n🧪 Testing encrypted credentials...');
      const testResult = await credentialManager.loadAndDecryptCredentials();
      
      if (testResult.email === email) {
        console.log('✅ Credential encryption/decryption test successful!');
      } else {
        console.log('❌ Credential test failed. Please re-run the setup.');
      }
      
    } else {
      console.log('Setup cancelled.');
    }
    
  } catch (error) {
    console.error('❌ Error during credential setup:', error.message);
  }

  rl.close();
}

// Handle Ctrl+C gracefully
rl.on('SIGINT', () => {
  console.log('\n\nSetup cancelled by user.');
  rl.close();
  process.exit(0);
});

// Run the setup
setupCredentials();