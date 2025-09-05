const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  phone: { 
    type: String, 
    required: true,
    trim: true
  },
  date: { 
    type: String, 
    required: true 
  },
  time: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    required: true, 
    enum: ['regular', 'urgent', 'follow'],
    default: 'regular'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'rescheduled', 'completed', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true
  },
  doctorNotes: {
    type: String,
    trim: true
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: String
  },
  rescheduleReason: {
    type: String,
    trim: true
  },
  rejectionReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
appointmentSchema.index({ patient: 1, date: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);