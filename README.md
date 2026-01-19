![Synkrone Logo](public/images/logo.png)

# Synkrone - Smart Appointment Scheduler

Synkrone is a comprehensive appointment management system designed for modern healthcare scheduling. It features role-based authentication, Google Calendar integration, hospital management, and AI-powered insights.

## 🚀 Features

### 🔐 Authentication & User Management
- Multi-role system: Patients, Doctors, and Administrators
- Google OAuth integration for seamless login
- Role-based access control for secure endpoints
- Persistent sessions with MongoDB store
- Comprehensive registration with role selection

### 📧 Email & Push Notifications
- Secure email integration with AES-256 encryption
- Automated reminders: 1-day, 12-hour, and 1-hour before appointments
- Push notifications for real-time updates
- User opt-in for notifications
- Test endpoints for email and push notifications

### 🏥 Hospital Management
- Pre-seeded database with major US hospitals
- Doctor-hospital association
- Real-time hospital and doctor selection during registration
- RESTful API for hospital data management

### 👩‍⚕️ Doctor Portal
- Professional dashboard with appointment overview
- Advanced analytics: performance metrics and completion rates
- Appointment management: accept, reject, complete appointments
- Real-time status updates
- Schedule management: today's and upcoming appointments
- Doctor notes for consultations

### 👤 Patient Portal
- Dashboard overview with appointment statistics
- Smart scheduling with hospital and doctor selection
- Appointment management: view, edit, and cancel
- Integrated health tips
- Mobile-friendly responsive design

### 🤖 AI Insights
- AI-powered analytics for appointment trends and predictions
- Interactive charts and recommendations
- Performance metrics and custom reports
- Revenue tracking and projections

### 📅 Google Calendar Integration
- Automatic event creation, updates, and deletion
- OAuth 2.0 for secure authentication
- Real-time sync with Google Calendar
- User control to enable/disable calendar sync

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Passport.js (Local & Google OAuth 2.0)
- **Frontend**: EJS templating, Vanilla JavaScript
- **Styling**: Custom CSS with responsive design
- **Icons**: Bootstrap Icons
- **Charts**: Chart.js for data visualization
- **Security**: JWT tokens, bcrypt password hashing

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Synkrone
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file with:
   ```env
   MONGODB_URI=mongodb://localhost:27017/zynk_appointments
   SESSION_SECRET=your_session_secret
   JWT_SECRET=your_jwt_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   VAPID_PUBLIC_KEY=your_vapid_public_key
   VAPID_PRIVATE_KEY=your_vapid_private_key
   NODE_ENV=development
   ```

4. **Seed Hospital Data**
   ```bash
   node seedHospitals.js
   ```

5. **Start the application**
   ```bash
   npm start
   ```

6. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`

## 🏗️ Project Structure

```
├── app.js                 # Main application file
├── package.json          # Dependencies and scripts
├── seedHospitals.js      # Hospital data seeding script
├── bin/
│   └── www               # Server startup script
├── config/
│   └── passport.js       # Passport authentication strategies
├── middleware/
│   └── auth.js           # JWT and role-based authentication middleware
├── models/
│   ├── index.js          # Model exports
│   ├── database.js       # Database connection
│   ├── appointment.js    # Appointment model
│   ├── users.js          # User model
│   └── hospital.js       # Hospital model
├── routes/
│   ├── index.js          # Main routes
│   ├── appointments.js   # Appointment CRUD
│   ├── doctor.js         # Doctor portal routes
│   ├── insights.js       # AI insights routes
│   ├── users.js          # User API endpoints
│   ├── doctors.js        # Doctor API endpoints
│   ├── hospitals.js      # Hospital API endpoints
├── views/
│   ├── index.ejs         # Patient dashboard
│   ├── appointments.ejs  # Appointments listing
│   ├── doctor.ejs        # Doctor portal dashboard
│   ├── insights.ejs      # AI insights dashboard
│   ├── login.ejs         # Login page
│   ├── register.ejs      # Registration page
│   ├── confirmation.ejs  # Booking confirmation
│   └── error.ejs         # Error page
├── public/
│   ├── stylesheets/      # CSS files
│   ├── javascripts/      # JavaScript files
│   └── images/           # Static images
```

## 🔧 API Endpoints

### Authentication
- `POST /register` - User registration
- `POST /login` - Local authentication
- `GET /auth/google` - Google OAuth initiation
- `GET /auth/google/callback` - Google OAuth callback
- `POST /auth/google/complete` - Complete Google OAuth registration
- `GET /logout` - User logout

### Patient Portal
- `GET /dashboard` - Patient dashboard
- `POST /appointments` - Create appointment
- `GET /appointments` - View appointments
- `PUT /appointments/:id` - Update appointment
- `DELETE /appointments/:id` - Cancel appointment

### Doctor Portal
- `GET /doctor` - Doctor dashboard
- `POST /doctor/update-status` - Update appointment status
- `GET /doctor/analytics` - Doctor performance analytics

### Hospital & Doctor APIs
- `GET /api/hospitals` - Get all hospitals
- `GET /api/doctors?hospitalId=:id` - Get doctors by hospital

### Notifications
- `POST /api/notifications/test` - Test notifications
- `POST /api/notifications/test-email-config` - Test email configuration
- `GET /api/notifications/status` - Check notification system status

## 🔒 Security Features

- **Password Hashing**: bcrypt for secure password storage
- **JWT Tokens**: Secure API authentication
- **Session Security**: HttpOnly cookies and CSRF protection
- **Role-based Authorization**: Endpoint protection by user role
- **Input Validation**: Comprehensive data validation
- **Encrypted Credentials**: Email credentials secured with AES-256 encryption

## 📱 Responsive Design

- **Desktop**: Full-featured dashboards
- **Tablet**: Adapted layouts
- **Mobile**: Touch-optimized interfaces

## 🐛 Known Issues & Improvements

### Current Limitations
- Real-time notifications system (in development)
- Advanced scheduling conflicts detection
- Multi-language support

### Planned Features
- Real-time push notifications
- Video consultation platform
- Mobile application (React Native)
- Advanced analytics and reporting

## 📞 Support

For support, feature requests, or bug reports:
- Open an issue in the GitHub repository
- Contact the development team
- Review API documentation for integration guides

---

**Built with modern web technologies and best practices for healthcare appointment management.**