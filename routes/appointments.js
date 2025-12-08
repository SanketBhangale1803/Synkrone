var express = require('express');
var router = express.Router();
const { Appointment } = require('../models');
const User = require('../models/users');
const Hospital = require('../models/hospital');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const calendarService = require('../services/calendarService');
const notificationService = require('../services/notificationService');

// Helper function to calculate appointment stats
async function calculateAppointmentStats() {
  try {
    const allAppointments = await Appointment.find({});
    
    return {
      total: allAppointments.length,
      pending: allAppointments.filter(apt => !apt.status || apt.status === 'pending').length,
      completed: allAppointments.filter(apt => apt.status === 'completed').length,
      cancelled: allAppointments.filter(apt => apt.status === 'cancelled').length,
      inProgress: allAppointments.filter(apt => apt.status === 'in-progress').length
    };
  } catch (error) {
    console.error('Error calculating stats:', error);
    return { total: 0, pending: 0, completed: 0, cancelled: 0, inProgress: 0 };
  }
}

/* GET appointments page. */
router.get('/', auth.verifyToken, async function(req, res, next) {
  try {
    const { status, search, sort } = req.query;
    
    // Build query
    let query = {};

    // Ownership filtering
    if (req.user.role === 'user') {
      query.userId = req.user._id;
    } else if (req.user.role === 'doctor') {
      query.doctorId = req.user._id; // assuming doctor users share _id with User
    }
    
    // Filter by status
    if (status && status !== 'all') {
      if (status === 'pending') {
        query.$or = [{ status: 'pending' }, { status: { $exists: false } }];
      } else {
        query.status = status;
      }
    }
    
    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Sort options
    let sortOption = { date: 1, time: 1 };
    if (sort === 'name') sortOption = { name: 1 };
    if (sort === 'date-desc') sortOption = { date: -1, time: -1 };
    if (sort === 'created') sortOption = { createdAt: -1 };
    
    const appointments = await Appointment.find(query).sort(sortOption);
    const stats = await calculateAppointmentStats();
    
    res.render('appointments', { 
      title: 'Appointments - Zynk',
      appointments,
      stats,
      filters: { status, search, sort }
    });
  } catch (error) {
    console.error('Error loading appointments:', error);
    res.render('appointments', { 
      title: 'Appointments - Zynk',
      appointments: [],
      stats: { total: 0, pending: 0, completed: 0, cancelled: 0, inProgress: 0 },
      filters: {}
    });
  }
});

/* POST to create a new appointment. */
router.post('/', auth.verifyToken, auth.requireRoles('user'), async function(req, res, next) {
  try {
    const { name, phone, date, time, type, notes, doctorId, hospitalId } = req.body;
    
    // Validation
    if (!name || !phone || !date || !time || !type || !doctorId || !hospitalId) {
      req.session.flash = { type: 'error', message: 'All required fields must be filled' };
      return res.redirect('/appointments');
    }
    
    const conflictingAppointment = await Appointment.findOne({
      doctorId: doctorId,
      date: date,
      time: time,
      status: { $nin: ['cancelled', 'rejected'] } // Exclude cancelled/rejected appointments
    });
    
    if (conflictingAppointment) {
      req.session.flash = { 
        type: 'error', 
        message: `This time slot is already booked. Please select a different time.` 
      };
      return res.redirect('/appointments');
    }
    
    // 🔥 NEW: Additional validation - check if user already has an appointment at this time
    const userConflict = await Appointment.findOne({
      userId: req.user._id,
      date: date,
      time: time,
      status: { $nin: ['cancelled', 'rejected'] }
    });
    
    if (userConflict) {
      req.session.flash = { 
        type: 'error', 
        message: `You already have an appointment at this time. Please select a different time.` 
      };
      return res.redirect('/appointments');
    }
    
    // Fetch doctor and hospital details for the notification
    const doctor = await User.findById(doctorId);
    const hospital = await Hospital.findById(hospitalId);
    
    const newAppointment = new Appointment({
      userId: req.user._id,
      doctorId,
      hospitalId,
      name,
      phone,
      date,
      time,
      type,
      notes: notes || '',
      confirmationNumber: uuidv4().split('-')[0].toUpperCase(),
      emailNotificationsEnabled: true // Enable email notifications by default
    });
    
    const saved = await newAppointment.save();
    
    // 🔥 NEW: Send email notification
    try {
      if (req.user.email) {
        const emailTitle = `Appointment Confirmation - ${saved.confirmationNumber}`;
        const emailMessage = `
          <h2>Your Appointment is Confirmed!</h2>
          <p><strong>Confirmation Number:</strong> ${saved.confirmationNumber}</p>
          <p><strong>Date:</strong> ${saved.date}</p>
          <p><strong>Time:</strong> ${saved.time}</p>
          <p><strong>Doctor:</strong> Dr. ${doctor?.fullname || 'N/A'}</p>
          <p><strong>Specialization:</strong> ${doctor?.specialization || 'N/A'}</p>
          <p><strong>Hospital:</strong> ${hospital?.name || 'N/A'}</p>
          <p><strong>Type:</strong> ${saved.type}</p>
          ${saved.notes ? `<p><strong>Notes:</strong> ${saved.notes}</p>` : ''}
          <br>
          <p>Please arrive 10 minutes early for your appointment.</p>
        `;
        
        const emailResult = await notificationService.sendEmail(req.user.email, emailTitle, emailMessage);
        if (emailResult.success) {
          console.log(`✅ Confirmation email sent to ${req.user.email}`);
          saved.confirmationEmailSent = true;
          await saved.save();
        } else {
          console.error('Failed to send confirmation email:', emailResult.error);
        }
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Continue with appointment creation even if email fails
    }

    // 🔥 NEW: Create calendar event
    try {
      if (req.user.calendarSyncEnabled && req.user.googleRefreshToken) {
        const calendarResult = await calendarService.createAppointmentEvent(req.user, saved, doctor, hospital);
        if (calendarResult.success) {
          console.log(`📅 Calendar event created: ${calendarResult.eventId}`);
          saved.calendarEventId = calendarResult.eventId;
          await saved.save();
        } else {
          console.error('Failed to create calendar event:', calendarResult.error);
        }
      } else {
        console.log('Calendar sync not enabled for user or missing Google tokens');
      }
    } catch (calendarError) {
      console.error('Calendar creation error:', calendarError);
      // Continue with appointment creation even if calendar fails
    }
    
    // Save for confirmation page
    req.session.lastAppointment = saved;
    return req.session.save(() => res.redirect('/confirmation'));
  } catch (error) {
    console.error('Error creating appointment:', error);
    req.session.flash = { type: 'error', message: 'Error creating appointment' };
    res.redirect('/appointments');
  }
});

/* PUT update appointment status */
// Patients can cancel their own appointments; doctors/admin can update any status
router.put('/:id/status', auth.verifyToken, async function(req, res, next) {
  try {
    const { id } = req.params;
    const { status, doctorNotes } = req.body;
    
    // First, find the appointment to check ownership
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    // 🔥 FIXED: Improved ownership and role-based access control
    if (req.user.role === 'user') {
      // Patients can only cancel their own appointments
      if (status !== 'cancelled') {
        return res.status(403).json({ error: 'Patients can only cancel their appointments' });
      }
      
      // Verify ownership for patients
      if (appointment.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'You can only cancel your own appointments' });
      }
      
      // Check if appointment can be cancelled
      if (appointment.status === 'completed' || appointment.status === 'cancelled') {
        return res.status(400).json({ error: 'Cannot cancel completed or already cancelled appointments' });
      }
    } else if (req.user.role === 'doctor') {
      // Doctors can update appointments assigned to them
      if (appointment.doctorId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'You can only update appointments assigned to you' });
      }
    } else if (req.user.role !== 'admin') {
      // Only users, doctors, and admins can update status
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const updateData = { status };
    if (doctorNotes && ['doctor', 'admin'].includes(req.user.role)) {
      updateData.doctorNotes = doctorNotes;
    }
    
    // Add resolution timestamp for completed appointments
    if (status === 'completed') {
      updateData.resolvedAt = new Date();
    }
    
    // Update the appointment
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (updatedAppointment) {
      // Delete calendar event if patient cancelled their appointment
      if (status === 'cancelled' && req.user.role === 'user') {
        try {
          if (updatedAppointment.calendarEventId && req.user.googleRefreshToken) {
            await calendarService.deleteAppointmentEvent(req.user, updatedAppointment.calendarEventId);
            console.log(`📅 Calendar event deleted for cancelled appointment`);
          }
        } catch (calendarError) {
          console.error('Error deleting calendar event:', calendarError);
          // Continue with cancellation even if calendar deletion fails
        }
      }
      
      // Send cancellation email if patient cancelled
      if (status === 'cancelled' && req.user.role === 'user' && req.user.email) {
        try {
          const emailTitle = `Appointment Cancelled - ${updatedAppointment.confirmationNumber}`;
          const emailMessage = `
            <h2>Your Appointment Has Been Cancelled</h2>
            <p><strong>Confirmation Number:</strong> ${updatedAppointment.confirmationNumber}</p>
            <p><strong>Date:</strong> ${updatedAppointment.date}</p>
            <p><strong>Time:</strong> ${updatedAppointment.time}</p>
            <p>Your appointment has been successfully cancelled. If you need to reschedule, please book a new appointment.</p>
          `;
          
          await notificationService.sendEmail(req.user.email, emailTitle, emailMessage);
          console.log(`✅ Cancellation email sent to ${req.user.email}`);
        } catch (emailError) {
          console.error('Error sending cancellation email:', emailError);
          // Continue with cancellation even if email fails
        }
      }
      
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

/* PUT update appointment details */
router.put('/:id', auth.verifyToken, async function(req, res, next) {
  try {
    const { id } = req.params;
    const { name, phone, date, time, type, notes } = req.body;
    
    const updateData = { name, phone, date, time, type };
    if (notes !== undefined) updateData.notes = notes;
    
    const ownershipFilter = req.user.role === 'user' ? { _id: id, userId: req.user._id } :
                            req.user.role === 'doctor' ? { _id: id, doctorId: req.user._id } :
                            { _id: id };

    const updatedAppointment = await Appointment.findOneAndUpdate(
      ownershipFilter,
      updateData,
      { new: true, runValidators: true }
    ).populate('doctorId', 'username email').populate('hospitalId', 'name address');
    
    if (updatedAppointment) {
      // Update calendar event if it exists
      if (updatedAppointment.calendarEventId && updatedAppointment.userId) {
        try {
          const User = require('../models/users');
          const user = await User.findById(updatedAppointment.userId);
          if (user && user.googleRefreshToken) {
            await calendarService.updateAppointmentEvent(user, updatedAppointment);
          }
        } catch (calendarError) {
          console.error('Error updating calendar event:', calendarError);
          // Continue with appointment update even if calendar update fails
        }
      }

      res.json({ 
        success: true, 
        message: 'Appointment updated successfully',
        appointment: updatedAppointment 
      });
    } else {
      res.status(404).json({ error: 'Appointment not found' });
    }
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Error updating appointment' });
  }
});

/* DELETE appointment */
// Patients can cancel their own; doctors/admin can cancel theirs/any
router.delete('/:id', auth.verifyToken, async function(req, res, next) {
  try {
    const { id } = req.params;
    const ownershipFilter = req.user.role === 'user' ? { _id: id, userId: req.user._id } :
                            req.user.role === 'doctor' ? { _id: id, doctorId: req.user._id } :
                            { _id: id };

    const deletedAppointment = await Appointment.findOneAndDelete(ownershipFilter);
    
    if (deletedAppointment) {
      // Delete calendar event if it exists
      if (deletedAppointment.calendarEventId && deletedAppointment.userId) {
        try {
          const User = require('../models/users');
          const user = await User.findById(deletedAppointment.userId);
          if (user && user.googleRefreshToken) {
            await calendarService.deleteAppointmentEvent(user, deletedAppointment.calendarEventId);
          }
        } catch (calendarError) {
          console.error('Error deleting calendar event:', calendarError);
          // Continue with appointment deletion even if calendar deletion fails
        }
      }

      res.json({ 
        success: true, 
        message: 'Appointment deleted successfully'
      });
    } else {
      res.status(404).json({ error: 'Appointment not found' });
    }
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: 'Error deleting appointment' });
  }
});

/* GET appointment details */
router.get('/:id', auth.verifyToken, async function(req, res, next) {
  try {
    const { id } = req.params;
    const ownershipFilter = req.user.role === 'user' ? { _id: id, userId: req.user._id } :
                            req.user.role === 'doctor' ? { _id: id, doctorId: req.user._id } :
                            { _id: id };

    const appointment = await Appointment.findOne(ownershipFilter);
    
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

/* GET available time slots for a specific doctor and date */
router.get('/available-slots/:doctorId/:date', auth.verifyToken, async function(req, res, next) {
  try {
    const { doctorId, date } = req.params;
    
    const allTimeSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
      '15:00', '15:30', '16:00', '16:30', '17:00'
    ];
    
    const bookedAppointments = await Appointment.find({
      doctorId: doctorId,
      date: date,
      status: { $nin: ['cancelled', 'rejected'] }
    }).select('time');
    
    const bookedTimes = bookedAppointments.map(apt => apt.time);
    
    const availableSlots = allTimeSlots.filter(slot => !bookedTimes.includes(slot));
    
    const userAppointments = await Appointment.find({
      userId: req.user._id,
      date: date,
      status: { $nin: ['cancelled', 'rejected'] }
    }).select('time');
    
    const userBookedTimes = userAppointments.map(apt => apt.time);
    
    res.json({ 
      success: true, 
      availableSlots,
      bookedSlots: bookedTimes,
      userConflicts: userBookedTimes
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ error: 'Error fetching available time slots' });
  }
});

module.exports = router;