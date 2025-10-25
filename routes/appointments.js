var express = require('express');
var router = express.Router();
const { Appointment } = require('../models');
const User = require('../models/users');
const Hospital = require('../models/hospital');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
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
      confirmationNumber: uuidv4().split('-')[0].toUpperCase() // Generate short confirmation number
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
    );
    
    if (updatedAppointment) {
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

/* POST enable email notifications for appointment */
router.post('/enable-email-notifications', auth.verifyToken, async function(req, res, next) {
  try {
    const { appointmentId } = req.body;
    
    if (!appointmentId) {
      return res.status(400).json({ error: 'Appointment ID is required' });
    }
    
    // Find the appointment and verify ownership
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      userId: req.user._id
    });
    
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    if (appointment.emailNotificationsEnabled && appointment.confirmationEmailSent) {
      return res.json({ 
        success: true, 
        message: 'Email notifications are already enabled for this appointment' 
      });
    }
    
    // Get doctor and hospital information
    const doctor = await User.findById(appointment.doctorId);
    const hospital = await Hospital.findById(appointment.hospitalId);
    
    if (!doctor || !hospital) {
      return res.status(500).json({ error: 'Unable to retrieve appointment details' });
    }
    
    // Send confirmation email
    const emailResult = await sendConfirmationEmail(
      req.user.email,
      appointment,
      doctor,
      hospital
    );
    
    if (emailResult.success) {
      // Update appointment to mark email notifications as enabled
      await Appointment.findByIdAndUpdate(appointmentId, {
        emailNotificationsEnabled: true,
        confirmationEmailSent: true
      });
      
      res.json({ 
        success: true, 
        message: 'Email notifications enabled and confirmation sent!',
        messageId: emailResult.messageId
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send confirmation email: ' + emailResult.error 
      });
    }
  } catch (error) {
    console.error('Error enabling email notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* POST test email notifications - FOR TESTING ONLY */
router.post('/test-email/:type', auth.verifyToken, async function(req, res, next) {
  try {
    const { type } = req.params;
    const { appointmentId } = req.body;
    
    if (!appointmentId) {
      return res.status(400).json({ error: 'Appointment ID is required' });
    }
    
    // Validate email type
    const validTypes = ['confirmation', 'oneDayBefore', 'twelveHoursBefore', 'oneHourBefore'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid email type' });
    }
    
    // Find the appointment and verify ownership
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      userId: req.user._id
    });
    
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    // Get doctor and hospital information
    const doctor = await User.findById(appointment.doctorId);
    const hospital = await Hospital.findById(appointment.hospitalId);
    
    if (!doctor || !hospital) {
      return res.status(500).json({ error: 'Unable to retrieve appointment details' });
    }
    
    let emailResult;
    let emailTypeLabel;
    
    if (type === 'confirmation') {
      emailResult = await sendConfirmationEmail(
        req.user.email,
        appointment,
        doctor,
        hospital
      );
      emailTypeLabel = 'Confirmation Email';
    } else {
      emailResult = await sendReminderEmail(
        req.user.email,
        appointment,
        doctor,
        hospital,
        type
      );
      
      const typeLabels = {
        oneDayBefore: '1-Day Reminder Email',
        twelveHoursBefore: '12-Hour Reminder Email',
        oneHourBefore: '1-Hour Reminder Email'
      };
      emailTypeLabel = typeLabels[type];
    }
    
    if (emailResult.success) {
      res.json({ 
        success: true, 
        message: `${emailTypeLabel} sent successfully!`,
        messageId: emailResult.messageId,
        sentTo: req.user.email
      });
    } else {
      res.status(500).json({ 
        error: `Failed to send ${emailTypeLabel.toLowerCase()}: ${emailResult.error}` 
      });
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Internal server error while sending test email' });
  }
});

module.exports = router;