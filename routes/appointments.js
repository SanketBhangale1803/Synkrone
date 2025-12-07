var express = require('express');
var router = express.Router();
const { Appointment } = require('../models');
const User = require('../models/users');
const Hospital = require('../models/hospital');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const calendarService = require('../services/calendarService');
const { sendConfirmationEmail, sendReminderEmail } = require('../services/emailService');

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
    
    // Check for duplicate appointments
    const existingAppointment = await Appointment.findOne({
      name: name,
      date: date,
      time: time
    });
    
    if (existingAppointment) {
      req.session.flash = { type: 'error', message: 'An appointment already exists for this time slot' };
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
      confirmationNumber: uuidv4().split('-')[0].toUpperCase()
    });
    
    const saved = await newAppointment.save();
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
// Only doctors can update status
router.put('/:id/status', auth.verifyToken, auth.requireRoles('doctor', 'admin'), async function(req, res, next) {
  try {
    const { id } = req.params;
    const { status, doctorNotes } = req.body;
    
    const updateData = { status };
    if (doctorNotes) updateData.doctorNotes = doctorNotes;
    
    // Add resolution timestamp for completed appointments
    if (status === 'completed') {
      updateData.resolvedAt = new Date();
    }
    
    // Ownership/role check
    const ownershipFilter = req.user.role === 'user' ? { _id: id, userId: req.user._id } :
                            req.user.role === 'doctor' ? { _id: id, doctorId: req.user._id } :
                            { _id: id };

    const updatedAppointment = await Appointment.findOneAndUpdate(
      ownershipFilter,
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

module.exports = router;