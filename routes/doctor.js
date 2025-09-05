var express = require('express');
var router = express.Router();
const { Appointment } = require('../models');

// Helper function to calculate doctor stats
async function calculateDoctorStats() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const allAppointments = await Appointment.find({});
    
    // Calculate basic stats
    const totalAppointments = allAppointments.length;
    const pendingAppointments = allAppointments.filter(apt => !apt.status || apt.status === 'pending').length;
    const todayAppointments = allAppointments.filter(apt => apt.date === today).length;
    const completedAppointments = allAppointments.filter(apt => apt.status === 'completed').length;
    const inProgressAppointments = allAppointments.filter(apt => apt.status === 'in-progress').length;
    const cancelledAppointments = allAppointments.filter(apt => apt.status === 'cancelled' || apt.status === 'rejected').length;
    
    // Calculate completion rate
    const completionRate = totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0;
    
    // Calculate weekly goal (assuming 40 appointments per week is the goal)
    const weeklyGoal = 40;
    const thisWeekAppointments = allAppointments.filter(apt => {
      const aptDate = new Date(apt.date);
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      return aptDate >= weekStart && aptDate < weekEnd;
    }).length;
    
    // Calculate average session time (mock data for now)
    const avgSessionTime = '25m';
    
    // Calculate patient satisfaction (mock data for now)
    const patientSatisfaction = 4.8;
    
    return {
      pending: pendingAppointments,
      today: todayAppointments,
      completed: completedAppointments,
      inProgress: inProgressAppointments,
      cancelled: cancelledAppointments,
      total: totalAppointments,
      completionRate,
      weeklyGoal,
      thisWeekAppointments,
      avgSessionTime,
      patientSatisfaction
    };
  } catch (error) {
    console.error('Error calculating doctor stats:', error);
    return {
      pending: 0,
      today: 0,
      completed: 0,
      inProgress: 0,
      cancelled: 0,
      total: 0,
      completionRate: 0,
      weeklyGoal: 40,
      thisWeekAppointments: 0,
      avgSessionTime: '25m',
      patientSatisfaction: 4.8
    };
  }
}

/* GET doctor dashboard */
router.get('/', async function(req, res, next) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get appointments by status
    const pendingAppointments = await Appointment.find({ 
      $or: [{ status: 'pending' }, { status: { $exists: false } }] 
    }).sort({ date: 1, time: 1 }).limit(10);
    
    const todayAppointments = await Appointment.find({ date: today }).sort({ time: 1 });
    const inProgressAppointments = await Appointment.find({ status: 'in-progress' }).sort({ createdAt: -1 });
    
    // Calculate comprehensive stats
    const stats = await calculateDoctorStats();
    
    // Get all appointments for the main grid
    const allAppointments = await Appointment.find({}).sort({ date: 1, time: 1 });
    
    res.render('doctor', { 
      title: 'Doctor Dashboard - Zynk',
      appointments: allAppointments,  // Add this line
      pendingAppointments,
      todayAppointments,
      inProgressAppointments,
      stats
    });
  } catch (error) {
    console.error('Error loading doctor dashboard:', error);
    res.render('doctor', { 
      title: 'Doctor Dashboard - Zynk',
      appointments: [],  // Add this line
      pendingAppointments: [],
      todayAppointments: [],
      inProgressAppointments: [],
      stats: await calculateDoctorStats()
    });
  }
});

/* POST update appointment status */
router.post('/update-status', async function(req, res, next) {
  try {
    const { appointmentId, status, doctorNotes } = req.body;
    
    if (!appointmentId || !status) {
      return res.status(400).json({ error: 'Appointment ID and status are required' });
    }
    
    const updateData = { 
      status,
      doctorNotes: doctorNotes || ''
    };
    
    // Add resolution timestamp for completed appointments
    if (status === 'completed') {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = 'Dr. Smith'; // This could be dynamic based on logged-in doctor
    }
    
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (updatedAppointment) {
      res.json({ 
        success: true, 
        message: `Appointment ${status} successfully`,
        appointment: updatedAppointment 
      });
    } else {
      res.status(404).json({ error: 'Appointment not found' });
    }
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({ error: 'Error updating appointment status' });
  }
});

/* GET appointment details for doctor */
router.get('/appointment/:id', async function(req, res, next) {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (appointment) {
      res.json({ success: true, appointment });
    } else {
      res.status(404).json({ error: 'Appointment not found' });
    }
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ error: 'Error fetching appointment' });
  }
});

/* GET doctor analytics */
router.get('/analytics', async function(req, res, next) {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const appointments = await Appointment.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    // Calculate analytics
    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;
    const urgentAppointments = appointments.filter(apt => apt.type === 'urgent').length;
    const regularAppointments = appointments.filter(apt => apt.type === 'regular').length;
    const followUpAppointments = appointments.filter(apt => apt.type === 'follow').length;
    
    // Calculate daily trends
    const dailyTrends = {};
    appointments.forEach(apt => {
      const date = apt.date;
      if (!dailyTrends[date]) {
        dailyTrends[date] = { total: 0, completed: 0, urgent: 0 };
      }
      dailyTrends[date].total++;
      if (apt.status === 'completed') dailyTrends[date].completed++;
      if (apt.type === 'urgent') dailyTrends[date].urgent++;
    });
    
    // Calculate time slot analysis
    const timeSlots = {};
    appointments.forEach(apt => {
      const hour = apt.time.split(':')[0];
      timeSlots[hour] = (timeSlots[hour] || 0) + 1;
    });
    
    const analytics = {
      period: days,
      totalAppointments,
      completedAppointments,
      urgentAppointments,
      regularAppointments,
      followUpAppointments,
      completionRate: totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0,
      dailyTrends: Object.entries(dailyTrends).map(([date, data]) => ({
        date,
        ...data
      })),
      timeSlots,
      peakHour: Object.keys(timeSlots).reduce((a, b) => timeSlots[a] > timeSlots[b] ? a : b, '09')
    };
    
    res.json({ success: true, analytics });
  } catch (error) {
    console.error('Error generating analytics:', error);
    res.status(500).json({ error: 'Error generating analytics' });
  }
});

/* POST add doctor notes */
router.post('/appointment/:id/notes', async function(req, res, next) {
  try {
    const { appointmentId } = req.params;
    const { doctorNotes } = req.body;
    
    if (!doctorNotes) {
      return res.status(400).json({ error: 'Doctor notes are required' });
    }
    
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { doctorNotes },
      { new: true, runValidators: true }
    );
    
    if (updatedAppointment) {
      res.json({ 
        success: true, 
        message: 'Notes added successfully',
        appointment: updatedAppointment 
      });
    } else {
      res.status(404).json({ error: 'Appointment not found' });
    }
  } catch (error) {
    console.error('Error adding doctor notes:', error);
    res.status(500).json({ error: 'Error adding doctor notes' });
  }
});

/* GET today's schedule */
router.get('/schedule/today', async function(req, res, next) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const todayAppointments = await Appointment.find({ date: today })
      .sort({ time: 1 });
    
    res.json({ 
      success: true, 
      date: today,
      appointments: todayAppointments 
    });
  } catch (error) {
    console.error('Error fetching today\'s schedule:', error);
    res.status(500).json({ error: 'Error fetching today\'s schedule' });
  }
});

/* GET upcoming appointments */
router.get('/schedule/upcoming', async function(req, res, next) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const upcomingAppointments = await Appointment.find({ 
      date: { $gte: today },
      status: { $ne: 'cancelled' }
    })
      .sort({ date: 1, time: 1 })
      .limit(20);
    
    res.json({ 
      success: true, 
      appointments: upcomingAppointments 
    });
  } catch (error) {
    console.error('Error fetching upcoming appointments:', error);
    res.status(500).json({ error: 'Error fetching upcoming appointments' });
  }
});

/* POST accept appointment */
router.post('/appointments/:id/accept', async function(req, res, next) {
  try {
    const { id } = req.params;
    
    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { 
        status: 'approved',
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );
    
    if (appointment) {
      res.redirect('/doctor?success=accepted');
    } else {
      res.status(404).json({ error: 'Appointment not found' });
    }
  } catch (error) {
    console.error('Error accepting appointment:', error);
    res.status(500).json({ error: 'Error accepting appointment' });
  }
});

/* POST reject appointment */
router.post('/appointments/:id/reject', async function(req, res, next) {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    
    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { 
        status: 'rejected',
        rejectionReason: rejectionReason || 'No reason provided',
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );
    
    if (appointment) {
      res.redirect('/doctor?success=rejected');
    } else {
      res.status(404).json({ error: 'Appointment not found' });
    }
  } catch (error) {
    console.error('Error rejecting appointment:', error);
    res.status(500).json({ error: 'Error rejecting appointment' });
  }
});

/* POST complete appointment */
router.post('/appointments/:id/complete', async function(req, res, next) {
  try {
    const { id } = req.params;
    const { doctorNotes } = req.body;
    
    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { 
        status: 'completed',
        doctorNotes: doctorNotes || '',
        resolvedAt: new Date(),
        resolvedBy: 'Dr. Smith',
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );
    
    if (appointment) {
      res.redirect('/doctor?success=completed');
    } else {
      res.status(404).json({ error: 'Appointment not found' });
    }
  } catch (error) {
    console.error('Error completing appointment:', error);
    res.status(500).json({ error: 'Error completing appointment' });
  }
});

/* GET current stats */
router.get('/stats', async function(req, res, next) {
  try {
    const stats = await calculateDoctorStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Error fetching stats' });
  }
});

module.exports = router;