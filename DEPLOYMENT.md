# 🚀 Deployment Setup Guide

## 📋 Prerequisites
- Node.js (v14 or higher)
- MongoDB database
- Gmail account with App Password enabled

## 🔧 Initial Setup

### 1. Clone Repository
```bash
git clone https://github.com/YourUsername/Synkrone.git
cd Synkrone
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
# Copy the environment template
cp .env.example .env

# Edit .env with your actual values
# Never commit the .env file to GitHub!
```

### 4. Configure Environment Variables
Edit `.env` file with your values:

```env
MONGODB_URI=mongodb://localhost:27017/zynk_appointments
SESSION_SECRET=your_super_secret_session_key_here
JWT_SECRET=your_super_secret_jwt_key_here
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
NODE_ENV=production
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

## 📧 Email Notification Setup

### 1. Gmail App Password Setup
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification if not already enabled
3. Go to "App passwords" section
4. Generate a new password for "Mail"
5. Copy the 16-character password

### 2. Secure Credential Configuration
```bash
# Run the secure credential setup script
node setup-credentials.js
```

Follow the interactive prompts:
- Enter your Gmail email address
- Enter your 16-character Gmail App Password
- Confirm encryption

This will:
- Encrypt your credentials using AES-256 encryption
- Store encrypted data in `config/encrypted-credentials.json`
- Add encryption key to your `.env` file

## 🗄️ Database Setup

### 1. Start MongoDB
Make sure MongoDB is running on your system.

### 2. Seed Hospital Data (Optional)
```bash
node seedHospitals.js
```

## 🏃‍♂️ Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The application will be available at `http://localhost:3000`

## 🔒 Security Notes

### ✅ Safe to Commit:
- `.env.example` (template file)
- `config/encrypted-credentials.json` (encrypted data)
- All application code files

### ❌ NEVER Commit:
- `.env` (contains actual secrets)
- `node_modules/`
- Any files with plain text passwords

### 🛡️ Security Features:
- Email credentials are encrypted using AES-256
- Environment variables for all sensitive data
- Comprehensive `.gitignore` for protection
- Separated encryption keys and encrypted data

## 🧪 Testing Email Notifications

1. Navigate to any appointment confirmation page
2. Enable email notifications when confirming appointment
3. Use the test buttons to verify email functionality:
   - Test Confirmation Email
   - Test 1-Day Reminder
   - Test 12-Hour Reminder  
   - Test 1-Hour Reminder

## 🚨 Troubleshooting

### Email Issues:
- Verify Gmail App Password is correct (16 characters)
- Check that 2-Step Verification is enabled on Google account
- Ensure encrypted credentials are properly set up
- Test email configuration using the test buttons

### Database Issues:
- Verify MongoDB is running
- Check MONGODB_URI in `.env` file
- Ensure database permissions are correct

### Authentication Issues:
- Verify Google OAuth credentials in `.env`
- Check session and JWT secrets are set
- Ensure all required environment variables are configured

## 📞 Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Test email functionality with the built-in test buttons
4. Ensure MongoDB is running and accessible

---

**⚠️ Important**: Always keep your `.env` file secure and never commit it to version control!