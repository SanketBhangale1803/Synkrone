// Update appointment status
function updateStatus(appointmentId, status) {
  if (status === 'cancelled' && !confirm('Are you sure you want to cancel this appointment?')) {
    return;
  }
  
  fetch('/doctor/update-status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      appointmentId,
      status
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showNotification(data.message, 'success');
      
      // Remove the appointment card from the DOM
      const appointmentCard = document.querySelector(`[data-appointment-id="${appointmentId}"]`);
      if (appointmentCard) {
        appointmentCard.style.transition = 'all 0.3s ease';
        appointmentCard.style.opacity = '0';
        appointmentCard.style.transform = 'translateX(-100%)';
        setTimeout(() => {
          appointmentCard.remove();
          updateSectionCounters();
        }, 300);
      }
    } else {
      showNotification('Error updating appointment', 'error');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    showNotification('Error updating appointment', 'error');
  });
}

// Complete appointment with notes
function completeAppointment(appointmentId) {
  document.getElementById('completeAppointmentId').value = appointmentId;
  showModal('completeModal');
}

function closeCompleteModal() {
  hideModal('completeModal');
  document.getElementById('doctorNotes').value = '';
}

// Edit notes
function editNotes(appointmentId) {
  document.getElementById('notesAppointmentId').value = appointmentId;
  
  // Get current notes if any
  const appointmentCard = document.querySelector(`[data-appointment-id="${appointmentId}"]`);
  const notesElement = appointmentCard.querySelector('.notes-preview span');
  if (notesElement) {
    document.getElementById('updateNotes').value = notesElement.textContent.replace('...', '');
  }
  
  showModal('notesModal');
}

function closeNotesModal() {
  hideModal('notesModal');
  document.getElementById('updateNotes').value = '';
}

// Modal functions
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.style.display = 'flex';
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
  
  // Animate in
  setTimeout(() => {
    modal.querySelector('.modal-content').style.animation = 'modalSlideIn 0.3s ease';
  }, 10);
}

function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove('show');
  document.body.style.overflow = 'auto';
  
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
}

// Handle complete form submission
document.getElementById('completeForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const appointmentId = document.getElementById('completeAppointmentId').value;
  const doctorNotes = document.getElementById('doctorNotes').value;
  
  fetch('/doctor/update-status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      appointmentId,
      status: 'completed',
      doctorNotes
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showNotification('Appointment completed successfully', 'success');
      closeCompleteModal();
      
      // Remove the appointment card from the DOM
      const appointmentCard = document.querySelector(`[data-appointment-id="${appointmentId}"]`);
      if (appointmentCard) {
        appointmentCard.style.transition = 'all 0.3s ease';
        appointmentCard.style.opacity = '0';
        appointmentCard.style.transform = 'translateX(-100%)';
        setTimeout(() => {
          appointmentCard.remove();
          updateSectionCounters();
        }, 300);
      }
    } else {
      showNotification('Error completing appointment', 'error');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    showNotification('Error completing appointment', 'error');
  });
});

// Handle notes form submission
document.getElementById('notesForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const appointmentId = document.getElementById('notesAppointmentId').value;
  const doctorNotes = document.getElementById('updateNotes').value;
  
  fetch('/doctor/update-status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      appointmentId,
      status: 'in-progress',
      doctorNotes
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showNotification('Notes updated successfully', 'success');
      closeNotesModal();
      
      // Update the notes display in the card
      const appointmentCard = document.querySelector(`[data-appointment-id="${appointmentId}"]`);
      let notesElement = appointmentCard.querySelector('.notes-preview span');
      if (notesElement) {
        notesElement.textContent = doctorNotes.substring(0, 30) + '...';
      } else if (doctorNotes.trim()) {
        // Create notes element if it doesn't exist
        const patientDetails = appointmentCard.querySelector('.patient-details');
        const notesDiv = document.createElement('div');
        notesDiv.className = 'notes-preview';
        notesDiv.innerHTML = `
          <i class="bi bi-journal-text"></i>
          <span>${doctorNotes.substring(0, 30)}...</span>
        `;
        patientDetails.appendChild(notesDiv);
      }
    } else {
      showNotification('Error updating notes', 'error');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    showNotification('Error updating notes', 'error');
  });
});

// Update section counters
function updateSectionCounters() {
  const pendingCards = document.querySelectorAll('.appointment-card.pending-card').length;
  const inProgressCards = document.querySelectorAll('.appointment-card.progress-card').length;
  
  // Update counter badges
  const pendingBadge = document.querySelector('.pending-section .count-badge');
  const progressBadge = document.querySelector('.progress-section .count-badge');
  
  if (pendingBadge) {
    pendingBadge.textContent = pendingCards;
  }
  
  if (progressBadge) {
    progressBadge.textContent = inProgressCards;
  }
  
  // Update header stats
  const headerPendingCount = document.querySelector('.highlight');
  if (headerPendingCount) {
    headerPendingCount.textContent = `${pendingCards} pending`;
  }
}

// Show notification
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(notification => notification.remove());
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  
  const iconMap = {
    success: 'bi-check-circle-fill',
    error: 'bi-exclamation-triangle-fill',
    warning: 'bi-exclamation-triangle-fill',
    info: 'bi-info-circle-fill'
  };
  
  const titleMap = {
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Info'
  };
  
  notification.innerHTML = `
    <div class="notification-icon">
      <i class="bi ${iconMap[type]}"></i>
    </div>
    <div class="notification-content">
      <div class="notification-title">${titleMap[type]}</div>
      <div class="notification-message">${message}</div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.animation = 'slideInRight 0.3s ease';
  }, 100);
  
  // Auto remove after 4 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// Filter functionality
document.addEventListener('DOMContentLoaded', function() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  
  filterButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons
      filterButtons.forEach(btn => btn.classList.remove('active'));
      
      // Add active class to clicked button
      this.classList.add('active');
      
      const filter = this.dataset.filter;
      const appointmentCards = document.querySelectorAll('.appointment-card');
      
      appointmentCards.forEach(card => {
        if (filter === 'all') {
          card.style.display = 'block';
        } else if (filter === 'urgent') {
          const isUrgent = card.querySelector('.appointment-type.urgent');
          card.style.display = isUrgent ? 'block' : 'none';
        } else if (filter === 'today') {
          const today = new Date().toISOString().split('T')[0];
          const cardDate = card.querySelector('.date').textContent;
          // Simple date comparison - you might want to make this more robust
          card.style.display = cardDate.includes(new Date().getDate().toString()) ? 'block' : 'none';
        }
      });
    });
  });
});

// Session timers for in-progress appointments
function startSessionTimers() {
  const timers = document.querySelectorAll('.timer');
  
  timers.forEach(timer => {
    const startTime = new Date(timer.dataset.start);
    
    setInterval(() => {
      const now = new Date();
      const diff = now - startTime;
      
      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
  });
}

// Close modals when clicking outside
window.onclick = function(event) {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    if (event.target === modal) {
      hideModal(modal.id);
    }
  });
}

// Quick action button functionality
document.addEventListener('DOMContentLoaded', function() {
  const quickActionBtn = document.querySelector('.quick-action-btn');
  if (quickActionBtn) {
    quickActionBtn.addEventListener('click', function() {
      // Redirect to appointments page or show quick schedule modal
      window.location.href = '/appointments';
    });
  }
  
  // Initialize session timers
  startSessionTimers();
  
  // Notification bell click
  const notificationBtn = document.querySelector('.notification-btn');
  if (notificationBtn) {
    notificationBtn.addEventListener('click', function() {
      showNotification('No new notifications', 'info');
    });
  }
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideOutRight {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }
`;
document.head.appendChild(style);

// View more completed appointments
document.addEventListener('click', function(e) {
  if (e.target.closest('.view-more-btn')) {
    // Show all completed appointments or redirect to full list
    showNotification('Loading more appointments...', 'info');
    // You can implement pagination or redirect to full appointments page
  }
});

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
  // Escape key to close modals
  if (e.key === 'Escape') {
    const openModals = document.querySelectorAll('.modal.show');
    openModals.forEach(modal => {
      hideModal(modal.id);
    });
  }
  
  // Ctrl/Cmd + N for quick schedule
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    document.querySelector('.quick-action-btn')?.click();
  }
});

// DOM Elements
const searchInput = document.getElementById('searchAppointments');
const filterButtons = document.querySelectorAll('.filter-btn');
const appointmentsGrid = document.querySelector('.appointments-grid');

// Stats Elements
const totalAppointments = document.getElementById('totalAppointments');
const pendingAppointments = document.getElementById('pendingAppointments');
const completedAppointments = document.getElementById('completedAppointments');
const cancelledAppointments = document.getElementById('cancelledAppointments');

// Current appointment being acted upon
let currentAppointmentId = null;

// Initialize stats
function updateStats() {
    const appointments = document.querySelectorAll('.appointment-card');
    const today = new Date().toISOString().split('T')[0];
    
    let total = appointments.length;
    let pending = 0;
    let completed = 0;
    let cancelled = 0;

    appointments.forEach(apt => {
        const status = apt.dataset.status;
        if (status === 'pending') pending++;
        if (status === 'completed' && apt.querySelector('.appointment-date').textContent.trim() === today) completed++;
        if (['rejected', 'cancelled'].includes(status)) cancelled++;
    });

    totalAppointments.textContent = total;
    pendingAppointments.textContent = pending;
    completedAppointments.textContent = completed;
    cancelledAppointments.textContent = cancelled;
}

// Filter appointments
function filterAppointments(status) {
    const appointments = document.querySelectorAll('.appointment-card');
    
    appointments.forEach(apt => {
        if (status === 'all' || apt.dataset.status === status) {
            apt.style.display = 'block';
        } else {
            apt.style.display = 'none';
        }
    });
}

// Search appointments
function searchAppointments(query) {
    const appointments = document.querySelectorAll('.appointment-card');
    const searchTerm = query.toLowerCase();
    
    appointments.forEach(apt => {
        const patientName = apt.querySelector('.patient-info h3').textContent.toLowerCase();
        const patientEmail = apt.querySelector('.patient-contact a').textContent.toLowerCase();
        const appointmentDate = apt.querySelector('.appointment-date').textContent.toLowerCase();
        const appointmentType = apt.querySelector('.appointment-type').textContent.toLowerCase();
        
        if (patientName.includes(searchTerm) || 
            patientEmail.includes(searchTerm) || 
            appointmentDate.includes(searchTerm) ||
            appointmentType.includes(searchTerm)) {
            apt.style.display = 'block';
        } else {
            apt.style.display = 'none';
        }
    });
}

// Modal Handlers
function showRejectModal(appointmentId) {
    currentAppointmentId = appointmentId;
    document.getElementById('rejectModal').style.display = 'flex';
}

function closeRejectModal() {
    document.getElementById('rejectModal').style.display = 'none';
    document.getElementById('rejectForm').reset();
}

function showRescheduleModal(appointmentId) {
    currentAppointmentId = appointmentId;
    document.getElementById('rescheduleModal').style.display = 'flex';
}

function closeRescheduleModal() {
    document.getElementById('rescheduleModal').style.display = 'none';
    document.getElementById('rescheduleForm').reset();
}

function showCompleteModal(appointmentId) {
    currentAppointmentId = appointmentId;
    document.getElementById('completeModal').style.display = 'flex';
}

function closeCompleteModal() {
    document.getElementById('completeModal').style.display = 'none';
    document.getElementById('completeForm').reset();
}

// Form Submissions
document.getElementById('rejectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const rejectionReason = document.getElementById('rejectionReason').value;
    
    try {
        const response = await fetch(`/doctor/appointments/${currentAppointmentId}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rejectionReason })
        });
        
        if (response.ok) {
            window.location.reload();
        } else {
            throw new Error('Failed to reject appointment');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to reject appointment. Please try again.');
    }
});

document.getElementById('rescheduleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = {
        newDate: document.getElementById('newDate').value,
        newTime: document.getElementById('newTime').value,
        rescheduleReason: document.getElementById('rescheduleReason').value
    };
    
    try {
        const response = await fetch(`/doctor/appointments/${currentAppointmentId}/reschedule`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            window.location.reload();
        } else {
            throw new Error('Failed to reschedule appointment');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to reschedule appointment. Please try again.');
    }
});

document.getElementById('completeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = {
        doctorNotes: document.getElementById('doctorNotes').value,
        requiresFollowUp: document.getElementById('requiresFollowUp').checked
    };
    
    if (formData.requiresFollowUp) {
        formData.followUpDate = document.getElementById('followUpDate').value;
        formData.followUpReason = document.getElementById('followUpReason').value;
    }
    
    try {
        const response = await fetch(`/doctor/appointments/${currentAppointmentId}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            window.location.reload();
        } else {
            throw new Error('Failed to complete appointment');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to complete appointment. Please try again.');
    }
});

// Event Listeners
searchInput.addEventListener('input', (e) => {
    searchAppointments(e.target.value);
});

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        filterAppointments(button.dataset.filter);
    });
});

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateStats();
});