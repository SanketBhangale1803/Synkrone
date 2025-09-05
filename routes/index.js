var express = require('express');
var router = express.Router();
const { Appointment } = require('../models');

// Helper function to calculate stats
async function calculateStats() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const totalAppointments = await Appointment.countDocuments();
    const todayAppointments = await Appointment.countDocuments({ date: today });
    const urgentAppointments = await Appointment.countDocuments({ type: 'urgent' });
    const regularAppointments = await Appointment.countDocuments({ type: 'regular' });
    
    return {
      todayAppointments,
      totalAppointments,
      urgentAppointments,
      regularAppointments
    };
  } catch (error) {
    console.error('Error calculating stats:', error);
    return {
      todayAppointments: 0,
      totalAppointments: 0,
      urgentAppointments: 0,
      regularAppointments: 0
    };
  }
}

// Complete the generateRecentActivity function
function generateRecentActivity(appointments) {
  return appointments.map(apt => {
    const timeDiff = new Date() - new Date(apt.createdAt);
    const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
    
    let timeLabel;
    if (hoursAgo < 1) {
      timeLabel = 'Just now';
    } else if (hoursAgo < 24) {
      timeLabel = `${hoursAgo} hours ago`;
    } else {
      const daysAgo = Math.floor(hoursAgo / 24);
      timeLabel = `${daysAgo} days ago`;
    }
    
    return {
      type: 'scheduled',
      title: `${apt.name} scheduled ${apt.type} appointment`,
      time: timeLabel,
      icon: apt.type === 'urgent' ? 'exclamation-triangle' : 
            apt.type === 'follow' ? 'arrow-repeat' : 'calendar-check'
    };
  });
}

/* GET home page. */
router.get('/', async function(req, res, next) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const allAppointments = await Appointment.find({}).sort({ createdAt: -1 });
    
    const stats = {
      todayAppointments: allAppointments.filter(apt => apt.date === today).length,
      totalAppointments: allAppointments.length,
      urgentAppointments: allAppointments.filter(apt => apt.type === 'urgent').length,
      regularAppointments: allAppointments.filter(apt => apt.type === 'regular').length,
      followUpAppointments: allAppointments.filter(apt => apt.type === 'follow').length,
      completionRate: allAppointments.length > 0 ? Math.round((allAppointments.filter(apt => apt.status === 'completed').length / allAppointments.length) * 100) : 0
    };
    
    res.render('dashboard', { 
      title: 'Zynk - Smart Dashboard',
      stats: stats,
      appointments: allAppointments
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.render('dashboard', { 
      title: 'Zynk - Smart Dashboard',
      stats: {
        todayAppointments: 0,
        totalAppointments: 0,
        urgentAppointments: 0,
        regularAppointments: 0,
        followUpAppointments: 0,
        completionRate: 0
      },
      appointments: []
    });
  }
});

/* POST to create a new appointment. */
router.post('/', async function(req, res, next) {
  try {
    const { name, phone, date, time, type } = req.body;
    if (!name || !phone || !date || !time || !type) {
      return res.status(400).send('All fields are required!');
    }
    
    const newAppointment = new Appointment({
      name,
      phone,
      date,
      time,
      type
    });
    
    const savedAppointment = await newAppointment.save();
    console.log(`Appointment created:`, savedAppointment);
    
    req.session = req.session || {};
    req.session.lastAppointment = savedAppointment;
    
    res.redirect('/confirmation');
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).send('Error creating appointment');
  }
});

/* GET confirmation page. */
router.get('/confirmation', function(req, res, next) {
  const appointmentData = req.session?.lastAppointment || {
    name: 'Guest',
    phone: 'N/A',
    date: 'N/A',
    time: 'N/A',
    type: 'regular'
  };
  res.render('confirmation', { title: 'Appointment Confirmed', appointmentData });
});

/* GET appointments page */
router.get('/appointments', async function(req, res, next) {
  try {
    const allAppointments = await Appointment.find({}).sort({ date: 1, time: 1 });
    
    // Calculate stats for appointments page
    const stats = {
      total: allAppointments.length,
      pending: allAppointments.filter(apt => !apt.status || apt.status === 'pending').length,
      completed: allAppointments.filter(apt => apt.status === 'completed').length,
      cancelled: allAppointments.filter(apt => apt.status === 'cancelled').length,
      inProgress: allAppointments.filter(apt => apt.status === 'in-progress').length
    };
    
    res.render('appointments', {
      title: 'All Appointments - Zynk',
      appointments: allAppointments,
      stats: stats
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.render('appointments', {
      title: 'All Appointments - Zynk',
      appointments: [],
      stats: { total: 0, pending: 0, completed: 0, cancelled: 0, inProgress: 0 }
    });
  }
});

// Add route to handle appointment status updates
router.put('/appointments/:id/status', async function(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const appointment = await Appointment.findByIdAndUpdate(
      id, 
      { 
        status: status,
        updatedAt: new Date(),
        ...(status === 'completed' && { resolvedAt: new Date() })
      }, 
      { new: true }
    );
    
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    
    res.json({ success: true, appointment });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add route to handle appointment updates
router.put('/appointments/:id', async function(req, res, next) {
  try {
    const { id } = req.params;
    const { name, phone, date, time, type } = req.body;
    
    const appointment = await Appointment.findByIdAndUpdate(
      id, 
      { 
        name,
        phone,
        date,
        time,
        type,
        updatedAt: new Date()
      }, 
      { new: true }
    );
    
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    
    res.json({ success: true, appointment });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add route to handle appointment deletion
router.delete('/appointments/:id', async function(req, res, next) {
  try {
    const { id } = req.params;
    
    const appointment = await Appointment.findByIdAndDelete(id);
    
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    
    res.json({ success: true, message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add route to handle appointment notes update
router.put('/appointments/:id/notes', async function(req, res, next) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const appointment = await Appointment.findByIdAndUpdate(
      id, 
      { 
        doctorNotes: notes,
        updatedAt: new Date()
      }, 
      { new: true }
    );
    
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    
    res.json({ success: true, appointment });
  } catch (error) {
    console.error('Error updating appointment notes:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;