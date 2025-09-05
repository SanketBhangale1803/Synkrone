# Zynk - Smart Appointment Scheduler

A comprehensive appointment management system built with Node.js, Express, and MongoDB, featuring separate portals for patients and doctors with AI-powered insights.

## 🚀 Features

### Patient Portal
- **Dashboard Overview**: View appointment statistics and recent activity
- **Easy Scheduling**: Book appointments with date/time selection and type classification
- **Appointment Management**: View, edit, and cancel appointments
- **Health Tips**: Integrated health recommendations and tips
- **Responsive Design**: Mobile-friendly interface

### Doctor Portal
- **Professional Dashboard**: Track pending, in-progress, and completed appointments
- **Real-time Management**: Update appointment status with notes
- **Patient Information**: Comprehensive patient details and contact info
- **Session Tracking**: Built-in session timers for active consultations
- **Analytics**: Performance metrics and completion rates

### AI Insights
- **Smart Analytics**: AI-powered appointment trends and predictions
- **Interactive Chat**: AI assistant for data insights and recommendations
- **Performance Metrics**: Detailed statistics on appointment patterns
- **Custom Reports**: Generate reports for different time periods
- **Revenue Tracking**: Monitor financial performance and projections

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Frontend**: EJS templating, Vanilla JavaScript
- **Styling**: Custom CSS with responsive design
- **Icons**: Bootstrap Icons
- **Charts**: Chart.js for data visualization
- **Session Management**: Express Session

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Appointments
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up MongoDB**
   - Install MongoDB locally or use MongoDB Atlas
   - Update database connection in `models/database.js`

4. **Start the application**
   ```bash
   npm start
   ```

5. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`

## 🏗️ Project Structure

```
├── app.js                 # Main application file
├── package.json          # Dependencies and scripts
├── bin/
│   └── www               # Server startup script
├── models/
│   ├── index.js          # Model exports
│   ├── database.js       # Database connection
│   ├── appointment.js    # Appointment model
│   └── appointmentModel.js
├── routes/
│   ├── index.js          # Main routes (patient portal)
│   ├── appointments.js   # Appointment management routes
│   ├── doctor.js         # Doctor portal routes
│   ├── insights.js       # AI insights routes
│   └── users.js          # User management routes
├── views/
│   ├── index.ejs         # Patient dashboard
│   ├── appointments.ejs  # Appointments listing
│   ├── doctor.ejs        # Doctor portal
│   ├── insights.ejs      # AI insights dashboard
│   ├── confirmation.ejs  # Booking confirmation
│   └── error.ejs         # Error page
├── public/
│   ├── stylesheets/
│   │   ├── style.css           # Main styles
│   │   ├── doctor-portal.css   # Doctor portal styles
│   │   ├── ai-insights.css     # AI insights styles
│   │   └── appoitments.css     # Appointments page styles
│   ├── javascripts/
│   │   └── doctor-portal.js    # Doctor portal functionality
│   └── images/
```

## 📊 Database Schema

### Appointment Model
```javascript
{
  name: String,           // Patient name
  phone: String,          // Contact number
  date: String,           // Appointment date
  time: String,           // Appointment time
  type: String,           // regular | urgent | follow
  status: String,         // pending | confirmed | in-progress | completed | cancelled
  notes: String,          // Patient notes
  doctorNotes: String,    // Doctor consultation notes
  resolvedAt: Date,       // Completion timestamp
  resolvedBy: String,     // Doctor who completed
  createdAt: Date,        // Creation timestamp
  updatedAt: Date         // Last update timestamp
}
```

## 🎯 Key Features

### Appointment Types
- **Regular**: Standard checkups and consultations
- **Urgent**: Priority appointments requiring immediate attention
- **Follow-up**: Subsequent visits for ongoing treatment

### Status Management
- **Pending**: Newly created appointments
- **Confirmed**: Verified appointments
- **In-Progress**: Currently active consultations
- **Completed**: Finished appointments with notes
- **Cancelled**: Cancelled appointments

### AI Insights Features
- Appointment trend analysis
- Peak hour identification
- Revenue projections
- Patient behavior insights
- Demand predictions
- Performance recommendations

## 🔧 API Endpoints

### Patient Portal
- `GET /` - Dashboard
- `POST /` - Create appointment
- `GET /appointments` - View appointments
- `PUT /appointments/:id` - Update appointment
- `DELETE /appointments/:id` - Cancel appointment

### Doctor Portal
- `GET /doctor` - Doctor dashboard
- `POST /doctor/update-status` - Update appointment status
- `GET /doctor/appointment/:id` - Get appointment details
- `POST /doctor/appointment/:id/notes` - Add notes

### Insights
- `GET /insights` - AI insights dashboard
- `GET /insights/api/data` - Get analytics data
- `POST /insights/generate-report` - Generate custom reports

## 🎨 UI/UX Features

- **Modern Design**: Clean, professional interface
- **Responsive Layout**: Works on all device sizes
- **Interactive Elements**: Smooth animations and transitions
- **Color-coded Status**: Visual status indicators
- **Real-time Updates**: Dynamic content updates
- **Accessibility**: Screen reader friendly

## 🔒 Security Features

- Session management with Express Session
- Input validation and sanitization
- Error handling and logging
- Secure cookie configuration

## 📱 Responsive Design

The application is fully responsive with breakpoints for:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (< 768px)

## 🚦 Getting Started

1. **Patient Flow**:
   - Visit the dashboard
   - Fill out the appointment form
   - Select date, time, and type
   - Receive confirmation

2. **Doctor Flow**:
   - Access doctor portal
   - View pending appointments
   - Update status and add notes
   - Track completion metrics

3. **Analytics Flow**:
   - Visit insights dashboard
   - Interact with AI assistant
   - Generate custom reports
   - Track performance metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🐛 Known Issues

- Session persistence across server restarts
- Real-time notifications (planned feature)
- Email/SMS integration (planned feature)

## 🔮 Future Enhancements

- [ ] Real-time notifications
- [ ] Email/SMS reminders
- [ ] Payment integration
- [ ] Video consultation
- [ ] Multi-doctor support
- [ ] Advanced analytics
- [ ] Mobile app

## 📞 Support

For support and questions, please open an issue in the repository or contact the development team.