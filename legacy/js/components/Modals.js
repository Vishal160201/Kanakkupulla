export let activeEditBookingId = null;
export let activeDetailsBookingId = null;

export const setActiveEditBookingId = (id) => activeEditBookingId = id;
export const setActiveDetailsBookingId = (id) => activeDetailsBookingId = id;

export const openModal = () => {
  const modal = document.getElementById('booking-modal');
  if (modal) modal.classList.add('active');
};

export const closeModal = () => {
  const modal = document.getElementById('booking-modal');
  if (modal) modal.classList.remove('active');
  activeEditBookingId = null;
  const modalTitle = document.querySelector('.modal-title');
  if (modalTitle) modalTitle.textContent = "Create Studio Booking";
  const btnRegisterBooking = document.getElementById('btn-register-booking');
  if (btnRegisterBooking) btnRegisterBooking.innerHTML = `<i class="ph-fill ph-calendar-plus" style="margin-right: 5px;"></i> Register Booking`;
};

export const openDetailsModal = (booking) => {
  activeDetailsBookingId = booking.id;
  const detailsModal = document.getElementById('booking-details-modal');
  
  document.getElementById('details-client-name').textContent = booking.title;
  document.getElementById('details-avatar').textContent = booking.title.charAt(0).toUpperCase();
  document.getElementById('details-category').textContent = booking.category;
  document.getElementById('details-id').textContent = booking.id;
  document.getElementById('details-status').textContent = booking.status;
  
  const d = new Date(booking.date);
  const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  document.getElementById('details-schedule').textContent = `${displayDate} - ${booking.time}`;
  
  document.getElementById('details-location').textContent = booking.location || 'TBD';
  document.getElementById('details-package').textContent = booking.package ? `₹${booking.package}` : 'Not set';
  document.getElementById('details-advance').textContent = booking.advance ? `₹${booking.advance}` : 'Not set';
  document.getElementById('details-outstanding').textContent = booking.due ? `₹${booking.due}` : '₹0.00';
  document.getElementById('details-phone').textContent = booking.phone || 'Not recorded';
  document.getElementById('details-email').textContent = booking.email || 'Not recorded';
  
  if (detailsModal) detailsModal.classList.add('active');
};

export const closeDetailsModal = () => {
  const detailsModal = document.getElementById('booking-details-modal');
  if (detailsModal) detailsModal.classList.remove('active');
  activeDetailsBookingId = null;
};

// Form Helpers
const parseCurrency = (str) => parseFloat(str.replace(/,/g, '')) || 0;
const formatCurrencyInput = (num) => num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const calculateOutstanding = () => {
  const inputTotal = document.getElementById('input-total');
  const inputAdvance = document.getElementById('input-advance');
  const inputOutstanding = document.getElementById('input-outstanding');
  
  if (!inputTotal || !inputAdvance || !inputOutstanding) return;

  const total = parseCurrency(inputTotal.value);
  const advance = parseCurrency(inputAdvance.value);
  const outstanding = Math.max(0, total - advance);
  
  if (total > 0 || advance > 0) {
    inputOutstanding.value = formatCurrencyInput(outstanding);
  } else {
    inputOutstanding.value = '';
  }
};

export const initModals = (store) => {
  const modal = document.getElementById('booking-modal');
  const detailsModal = document.getElementById('booking-details-modal');
  const filterModal = document.getElementById('filter-modal');
  
  // Close details
  const btnDetailsClose = document.getElementById('btn-details-close');
  const detailsModalCloseBtn = document.querySelector('#booking-details-modal .modal-close');
  if (btnDetailsClose) btnDetailsClose.addEventListener('click', closeDetailsModal);
  if (detailsModalCloseBtn) detailsModalCloseBtn.addEventListener('click', closeDetailsModal);
  if (detailsModal) detailsModal.addEventListener('click', (e) => { if (e.target === detailsModal) closeDetailsModal(); });

  // Add/Edit Booking Modal 
  const fab = document.getElementById('fab-add-booking');
  if (fab) fab.addEventListener('click', () => {
    const inputClientName = document.getElementById('input-client-name');
    if (inputClientName) { inputClientName.value = ''; inputClientName.classList.remove('error'); }
    document.getElementById('input-total').value = '';
    document.getElementById('input-advance').value = '';
    calculateOutstanding();
    openModal();
  });
  
  const closeModalBtn = document.getElementById('modal-close-btn');
  const cancelModalBtn = document.getElementById('btn-cancel-modal');
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // Currency calculation
  const inputTotal = document.getElementById('input-total');
  const inputAdvance = document.getElementById('input-advance');
  if (inputTotal) inputTotal.addEventListener('input', calculateOutstanding);
  if (inputAdvance) inputAdvance.addEventListener('input', calculateOutstanding);

  // Filters Modal
  const btnOpenFilters = document.getElementById('btn-open-filters');
  const btnFilterClose = document.getElementById('filter-modal-close');
  const btnFilterApply = document.getElementById('btn-filter-apply');
  const btnFilterReset = document.getElementById('btn-filter-reset');

  const closeFilterModal = () => { if (filterModal) filterModal.classList.remove('active'); };
  if (btnFilterClose) btnFilterClose.addEventListener('click', closeFilterModal);
  if (filterModal) filterModal.addEventListener('click', (e) => { if (e.target === filterModal) closeFilterModal(); });

  if (btnOpenFilters) {
    btnOpenFilters.addEventListener('click', () => {
      const currentFilters = store.getState().currentFilters;
      document.querySelectorAll('.filter-category-checkbox').forEach(cb => cb.checked = currentFilters.categories.includes(cb.value));
      document.querySelectorAll('.filter-status-checkbox').forEach(cb => cb.checked = currentFilters.statuses.includes(cb.value));
      document.getElementById('filter-client').value = currentFilters.clientName || '';
      document.getElementById('filter-location').value = currentFilters.location || '';
      document.getElementById('filter-date-start').value = currentFilters.dateStart || '';
      document.getElementById('filter-date-end').value = currentFilters.dateEnd || '';
      document.getElementById('filter-amount-min').value = currentFilters.amountMin || '';
      document.getElementById('filter-amount-max').value = currentFilters.amountMax || '';
      filterModal.classList.add('active');
    });
  }

  const resetFilterModalInputs = () => {
    document.querySelectorAll('.filter-category-checkbox').forEach(cb => cb.checked = false);
    document.querySelectorAll('.filter-status-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('filter-client').value = '';
    document.getElementById('filter-location').value = '';
    
    const inputDateStart = document.getElementById('filter-date-start');
    if (inputDateStart) { inputDateStart.value = ''; if (inputDateStart._flatpickr) inputDateStart._flatpickr.clear(); }
    const inputDateEnd = document.getElementById('filter-date-end');
    if (inputDateEnd) { inputDateEnd.value = ''; if (inputDateEnd._flatpickr) inputDateEnd._flatpickr.clear(); }
    
    document.getElementById('filter-amount-min').value = '';
    document.getElementById('filter-amount-max').value = '';
  };

  if (btnFilterReset) btnFilterReset.addEventListener('click', resetFilterModalInputs);

  if (btnFilterApply) {
    btnFilterApply.addEventListener('click', () => {
      store.setState({
        currentFilters: {
          categories: Array.from(document.querySelectorAll('.filter-category-checkbox:checked')).map(cb => cb.value),
          statuses: Array.from(document.querySelectorAll('.filter-status-checkbox:checked')).map(cb => cb.value),
          clientName: document.getElementById('filter-client').value.trim(),
          location: document.getElementById('filter-location').value.trim(),
          dateStart: document.getElementById('filter-date-start').value,
          dateEnd: document.getElementById('filter-date-end').value,
          amountMin: document.getElementById('filter-amount-min').value,
          amountMax: document.getElementById('filter-amount-max').value
        }
      });
      closeFilterModal();
    });
  }

  // Register Booking Logic
  const btnRegisterBooking = document.getElementById('btn-register-booking');
  if (btnRegisterBooking) {
    btnRegisterBooking.addEventListener('click', () => {
      const inputClientName = document.getElementById('input-client-name');
      const clientName = inputClientName.value.trim();
      if (!clientName) {
        inputClientName.classList.add('error');
        inputClientName.focus();
        return;
      }
      
      const newBooking = {
        id: activeEditBookingId || ('ABK-' + Math.floor(1000 + Math.random() * 9000)),
        title: clientName,
        category: document.getElementById('input-category').value,
        date: document.getElementById('input-shoot-date').value || new Date().toISOString().split('T')[0],
        time: document.getElementById('input-shoot-time').value || '10:00 AM',
        location: document.getElementById('input-location').value.trim(),
        phone: document.getElementById('input-phone').value.trim(),
        email: document.getElementById('input-email').value.trim(),
        package: document.getElementById('input-total').value,
        advance: document.getElementById('input-advance').value,
        due: document.getElementById('input-outstanding').value,
        status: document.getElementById('input-status').value
      };

      const { bookings } = store.getState();
      if (activeEditBookingId) {
        const index = bookings.findIndex(b => b.id === activeEditBookingId);
        if (index > -1) bookings[index] = newBooking;
      } else {
        bookings.unshift(newBooking);
      }
      
      store.setState({ bookings: [...bookings] });
      closeModal();
    });
  }

  // Delete Booking Logic
  const btnDeleteBooking = document.getElementById('btn-delete-booking');
  if (btnDeleteBooking) {
    btnDeleteBooking.addEventListener('click', () => {
      if (!activeDetailsBookingId) return;
      if (confirm('Are you sure you want to delete this booking?')) {
        const { bookings } = store.getState();
        const updatedBookings = bookings.filter(b => b.id !== activeDetailsBookingId);
        store.setState({ bookings: updatedBookings });
        closeDetailsModal();
      }
    });
  }
};
