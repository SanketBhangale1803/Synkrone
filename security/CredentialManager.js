const CryptoJS = require('crypto-js');
const fs = require('fs');
const path = require('path');

class CredentialManager {
  constructor() {
    // Generate or load encryption key
    this.encryptionKey = this.getOrCreateEncryptionKey();
  }

  /**
   * Get or create a secure encryption key
   */
  getOrCreateEncryptionKey() {
    const keyPath = path.join(__dirname, 'encryption.key');
    
    try {
      if (fs.existsSync(keyPath)) {
        return fs.readFileSync(keyPath, 'utf8').trim();
      } else {
        // Generate a new 256-bit key
        const key = CryptoJS.lib.WordArray.random(256/8).toString();
        fs.writeFileSync(keyPath, key, { mode: 0o600 }); // Restrict file permissions
        console.log('🔑 New encryption key generated and saved');
        return key;
      }
    } catch (error) {
      console.error('Error managing encryption key:', error);
      // Fallback to environment-based key
      return process.env.ENCRYPTION_KEY || 'fallback-key-change-in-production';
    }
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(plaintext) {
    try {
      const encrypted = CryptoJS.AES.encrypt(plaintext, this.encryptionKey).toString();
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(ciphertext) {
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, this.encryptionKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decrypted) {
        throw new Error('Invalid encryption key or corrupted data');
      }
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt email credentials and save to secure file
   */
  encryptAndSaveCredentials(email, password) {
    try {
      const encryptedEmail = this.encrypt(email);
      const encryptedPassword = this.encrypt(password);
      
      const credentials = {
        email: encryptedEmail,
        password: encryptedPassword,
        encrypted: true,
        timestamp: new Date().toISOString()
      };

      const credentialsPath = path.join(__dirname, 'credentials.encrypted');
      fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2), { mode: 0o600 });
      
      console.log('✅ Credentials encrypted and saved securely');
      return true;
    } catch (error) {
      console.error('Error saving encrypted credentials:', error);
      return false;
    }
  }

  /**
   * Load and decrypt email credentials
   */
  loadAndDecryptCredentials() {
    try {
      const credentialsPath = path.join(__dirname, 'credentials.encrypted');
      
      if (!fs.existsSync(credentialsPath)) {
        // Fallback to environment variables
        return {
          email: process.env.EMAIL_USER,
          password: process.env.EMAIL_PASSWORD,
          source: 'environment'
        };
      }

      const encryptedData = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      
      if (!encryptedData.encrypted) {
        throw new Error('Credentials file is not encrypted');
      }

      const email = this.decrypt(encryptedData.email);
      const password = this.decrypt(encryptedData.password);

      return {
        email: email,
        password: password,
        source: 'encrypted_file',
        timestamp: encryptedData.timestamp
      };
    } catch (error) {
      console.error('Error loading encrypted credentials:', error);
      
      // Fallback to environment variables
      console.log('Falling back to environment variables');
      return {
        email: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD,
        source: 'environment_fallback'
      };
    }
  }

  /**
   * Verify that credentials can be decrypted successfully
   */
  verifyCredentials() {
    try {
      const credentials = this.loadAndDecryptCredentials();
      
      if (!credentials.email || !credentials.password) {
        return { valid: false, error: 'Missing email or password' };
      }

      if (credentials.email.includes('your-') || credentials.password.includes('your-')) {
        return { valid: false, error: 'Placeholder credentials detected' };
      }

      return { 
        valid: true, 
        source: credentials.source,
        hasEmail: !!credentials.email,
        hasPassword: !!credentials.password,
        timestamp: credentials.timestamp
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Clear all stored credentials and keys (for security reset)
   */
  clearAll() {
    try {
      const credentialsPath = path.join(__dirname, 'credentials.encrypted');
      const keyPath = path.join(__dirname, 'encryption.key');

      if (fs.existsSync(credentialsPath)) {
        fs.unlinkSync(credentialsPath);
      }

      if (fs.existsSync(keyPath)) {
        fs.unlinkSync(keyPath);
      }

      console.log('🧹 All encrypted credentials and keys cleared');
      return true;
    } catch (error) {
      console.error('Error clearing credentials:', error);
      return false;
    }
  }
}

module.exports = CredentialManager;