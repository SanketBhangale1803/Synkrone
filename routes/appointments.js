var express = require('express');
var router = express.Router();
const { Appointment } = require('../models');

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
router.get('/', async function(req, res, next) {
  try {
    const { status, search, sort } = req.query;
    
    // Build query
    let query = {};
    
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
router.post('/', async function(req, res, next) {
  try {
    const { name, phone, date, time, type, notes } = req.body;
    
    // Validation
    if (!name || !phone || !date || !time || !type) {
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
      name,
      phone,
      date,
      time,
      type,
      notes: notes || ''
    });
    
    await newAppointment.save();
    
    req.session.flash = { type: 'success', message: 'Appointment created successfully!' };
    res.redirect('/appointments');
  } catch (error) {
    console.error('Error creating appointment:', error);
    req.session.flash = { type: 'error', message: 'Error creating appointment' };
    res.redirect('/appointments');
  }
});

/* PUT update appointment status */
router.put('/:id/status', async function(req, res, next) {
  try {
    const { id } = req.params;
    const { status, doctorNotes } = req.body;
    
    const updateData = { status };
    if (doctorNotes) updateData.doctorNotes = doctorNotes;
    
    // Add resolution timestamp for completed appointments
    if (status === 'completed') {
      updateData.resolvedAt = new Date();
    }
    
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
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
router.put('/:id', async function(req, res, next) {
  try {
    const { id } = req.params;
    const { name, phone, date, time, type, notes } = req.body;
    
    const updateData = { name, phone, date, time, type };
    if (notes !== undefined) updateData.notes = notes;
    
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
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
router.delete('/:id', async function(req, res, next) {
  try {
    const { id } = req.params;
    
    const deletedAppointment = await Appointment.findByIdAndDelete(id);
    
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
router.get('/:id', async function(req, res, next) {
  try {
    const { id } = req.params;
    
    const appointment = await Appointment.findById(id);
    
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