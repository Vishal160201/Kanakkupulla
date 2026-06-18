document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('.nav-link');
  const views = document.querySelectorAll('.view-section');
  const pageTitle = document.getElementById('page-title');

  // Initialize Flatpickr
  flatpickr("#input-shoot-date", { dateFormat: "Y-m-d" });
  const filterDateStartPicker = flatpickr("#filter-date-start", { dateFormat: "Y-m-d" });
  const filterDateEndPicker = flatpickr("#filter-date-end", { dateFormat: "Y-m-d" });

  let currentCalendarView = 'month';

  // Initialize Month/Year Picker
  const monthPickerInput = document.getElementById('calendar-month-picker');
  const monthYearTrigger = document.getElementById('calendar-month-year');
  let monthPickerInstance = null;

  const initCalendarHeaderPicker = () => {
    if (!monthPickerInput || !monthYearTrigger) return;
    if (monthPickerInstance) monthPickerInstance.destroy();

    if (currentCalendarView === 'month') {
      monthPickerInstance = flatpickr(monthPickerInput, {
        positionElement: monthYearTrigger,
        plugins: [
          new monthSelectPlugin({ shorthand: true, dateFormat: "Y-m", altFormat: "F Y" })
        ],
        onChange: function(selectedDates) {
          if (selectedDates.length > 0) {
            currentDate.setMonth(selectedDates[0].getMonth());
            currentDate.setFullYear(selectedDates[0].getFullYear());
            renderCalendar();
          }
        }
      });
    } else if (currentCalendarView === 'week') {
      monthPickerInstance = flatpickr(monthPickerInput, {
        positionElement: monthYearTrigger,
        weekNumbers: true,
        plugins: [new weekSelect({})],
        onChange: function(selectedDates) {
          if (selectedDates.length > 0) {
            currentDate = new Date(selectedDates[0]);
            renderCalendar();
          }
        }
      });
    } else if (currentCalendarView === 'day') {
      monthPickerInstance = flatpickr(monthPickerInput, {
        positionElement: monthYearTrigger,
        dateFormat: "Y-m-d",
        onChange: function(selectedDates) {
          if (selectedDates.length > 0) {
            currentDate = new Date(selectedDates[0]);
            renderCalendar();
          }
        }
      });
    }
  };

  initCalendarHeaderPicker();

  if (monthYearTrigger) {
    monthYearTrigger.addEventListener('click', () => {
      if (monthPickerInstance) {
        monthPickerInstance.setDate(currentDate);
        monthPickerInstance.open();
      }
    });
  }

  // View switching logic
  const viewToggleBtns = document.querySelectorAll('.calendar-view-btn');
  viewToggleBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      viewToggleBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentCalendarView = e.target.getAttribute('data-view');
      initCalendarHeaderPicker();
      renderCalendar();
    });
  });

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      const targetViewId = link.getAttribute('data-view');
      if (!targetViewId) return;

      navLinks.forEach(nav => nav.classList.remove('active'));
      link.classList.add('active');

      const titleText = link.textContent.trim().replace(/^[^\s]+\s/, ''); // Strip emoji from text
      pageTitle.textContent = titleText === 'Dashboard' ? 'Studio Management' : titleText + ' Management';

      views.forEach(view => {
        if (view.id === targetViewId) {
          view.classList.add('active');
        } else {
          view.classList.remove('active');
        }
      });
    });
  });

  // Sub-view toggling logic for Bookings page
  const btnOverview = document.getElementById('btn-subview-overview');
  const btnTable = document.getElementById('btn-subview-table');
  const subviewOverview = document.getElementById('subview-overview');
  const subviewTable = document.getElementById('subview-table');
  const actionButtons = document.getElementById('bookings-action-buttons');

  if (btnOverview && btnTable && subviewOverview && subviewTable) {
    btnOverview.addEventListener('click', () => {
      btnOverview.classList.remove('btn-outline');
      btnOverview.classList.add('btn-primary');
      btnOverview.style.borderColor = '';
      
      btnTable.classList.remove('btn-primary');
      btnTable.classList.add('btn-outline');
      btnTable.style.borderColor = 'transparent';
      
      if (actionButtons) actionButtons.style.display = 'none';
      
      subviewTable.classList.remove('active');
      setTimeout(() => { subviewOverview.classList.add('active'); }, 10);
    });

    btnTable.addEventListener('click', () => {
      btnTable.classList.remove('btn-outline');
      btnTable.classList.add('btn-primary');
      btnTable.style.borderColor = '';
      
      btnOverview.classList.remove('btn-primary');
      btnOverview.classList.add('btn-outline');
      btnOverview.style.borderColor = 'transparent';
      
      if (actionButtons) actionButtons.style.display = 'flex';
      
      subviewOverview.classList.remove('active');
      setTimeout(() => { subviewTable.classList.add('active'); }, 10);
    });
  }

  // Calendar View Toggles Mockup
  const viewToggles = document.querySelectorAll('.view-toggle button');
  viewToggles.forEach(btn => {
    btn.addEventListener('click', () => {
      viewToggles.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Modal Logic
  const modal = document.getElementById('booking-modal');
  const fab = document.getElementById('fab-add-booking');
  const closeModalBtn = document.getElementById('modal-close');
  const cancelModalBtn = document.getElementById('modal-cancel');
  
  // Details Modal Logic
  const detailsModal = document.getElementById('booking-details-modal');
  const btnDetailsClose = document.getElementById('btn-details-close');
  const detailsModalCloseBtn = document.getElementById('details-modal-close');
  const btnEditBooking = document.getElementById('btn-edit-booking');
  const btnDeleteBooking = document.getElementById('btn-delete-booking');
  
  let activeEditBookingId = null;
  let activeDetailsBookingId = null;

  const openModal = () => { 
    if (modal) modal.classList.add('active'); 
  };
  
  const closeModal = () => { 
    if (modal) modal.classList.remove('active'); 
    activeEditBookingId = null;
    document.querySelector('.modal-title').textContent = "Create Studio Booking";
    const btnRegisterBooking = document.getElementById('btn-register-booking');
    if (btnRegisterBooking) btnRegisterBooking.innerHTML = `<i class="ph-fill ph-calendar-plus" style="margin-right: 5px;"></i> Register Booking`;
  };

  const openDetailsModal = (booking) => {
    activeDetailsBookingId = booking.id;
    
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

  const closeDetailsModal = () => {
    if (detailsModal) detailsModal.classList.remove('active');
    activeDetailsBookingId = null;
  };

  if (btnDetailsClose) btnDetailsClose.addEventListener('click', closeDetailsModal);
  if (detailsModalCloseBtn) detailsModalCloseBtn.addEventListener('click', closeDetailsModal);
  if (detailsModal) {
    detailsModal.addEventListener('click', (e) => {
      if (e.target === detailsModal) closeDetailsModal();
    });
  }

  if (fab) fab.addEventListener('click', () => {
    const inputClientName = document.getElementById('input-client-name');
    if (inputClientName) { inputClientName.value = ''; inputClientName.classList.remove('error'); }
    const inputTotal = document.getElementById('input-total');
    const inputAdvance = document.getElementById('input-advance');
    if (inputTotal) inputTotal.value = '';
    if (inputAdvance) inputAdvance.value = '';
    calculateOutstanding();
    openModal();
  });
  
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

  // Filter Modal Logic
  const filterModal = document.getElementById('filter-modal');
  const btnOpenFilters = document.getElementById('btn-open-filters');
  const btnFilterClose = document.getElementById('filter-modal-close');
  const btnFilterApply = document.getElementById('btn-filter-apply');
  const btnFilterReset = document.getElementById('btn-filter-reset');

  if (btnOpenFilters && filterModal) {
    btnOpenFilters.addEventListener('click', () => {
      // Categories
      const catCheckboxes = document.querySelectorAll('.filter-category-checkbox');
      catCheckboxes.forEach(cb => cb.checked = currentFilters.categories.includes(cb.value));
      
      // Statuses
      const statusCheckboxes = document.querySelectorAll('.filter-status-checkbox');
      statusCheckboxes.forEach(cb => cb.checked = currentFilters.statuses.includes(cb.value));
      
      // Texts
      const inputClient = document.getElementById('filter-client');
      if (inputClient) inputClient.value = currentFilters.clientName;
      
      const inputLocation = document.getElementById('filter-location');
      if (inputLocation) inputLocation.value = currentFilters.location;
      
      const inputDateStart = document.getElementById('filter-date-start');
      if (inputDateStart) inputDateStart.value = currentFilters.dateStart;
      
      const inputDateEnd = document.getElementById('filter-date-end');
      if (inputDateEnd) inputDateEnd.value = currentFilters.dateEnd;
      
      const inputAmountMin = document.getElementById('filter-amount-min');
      if (inputAmountMin) inputAmountMin.value = currentFilters.amountMin;
      
      const inputAmountMax = document.getElementById('filter-amount-max');
      if (inputAmountMax) inputAmountMax.value = currentFilters.amountMax;
      
      filterModal.classList.add('active');
    });
  }

  const closeFilterModal = () => { if (filterModal) filterModal.classList.remove('active'); };
  if (btnFilterClose) btnFilterClose.addEventListener('click', closeFilterModal);
  if (filterModal) filterModal.addEventListener('click', (e) => { if (e.target === filterModal) closeFilterModal(); });

  if (btnFilterApply) {
    btnFilterApply.addEventListener('click', () => {
      const catCheckboxes = document.querySelectorAll('.filter-category-checkbox:checked');
      currentFilters.categories = Array.from(catCheckboxes).map(cb => cb.value);
      
      const statusCheckboxes = document.querySelectorAll('.filter-status-checkbox:checked');
      currentFilters.statuses = Array.from(statusCheckboxes).map(cb => cb.value);
      
      const inputClient = document.getElementById('filter-client');
      currentFilters.clientName = inputClient ? inputClient.value.trim() : '';
      
      const inputLocation = document.getElementById('filter-location');
      currentFilters.location = inputLocation ? inputLocation.value.trim() : '';
      
      const inputDateStart = document.getElementById('filter-date-start');
      currentFilters.dateStart = inputDateStart ? inputDateStart.value : '';
      
      const inputDateEnd = document.getElementById('filter-date-end');
      currentFilters.dateEnd = inputDateEnd ? inputDateEnd.value : '';
      
      const inputAmountMin = document.getElementById('filter-amount-min');
      currentFilters.amountMin = inputAmountMin ? inputAmountMin.value : '';
      
      const inputAmountMax = document.getElementById('filter-amount-max');
      currentFilters.amountMax = inputAmountMax ? inputAmountMax.value : '';
      
      renderTable();
      updateFilterIndicator();
      closeFilterModal();
    });
  }

  const resetFilterModalInputs = () => {
    const catCheckboxes = document.querySelectorAll('.filter-category-checkbox');
    catCheckboxes.forEach(cb => cb.checked = false);
    
    const statusCheckboxes = document.querySelectorAll('.filter-status-checkbox');
    statusCheckboxes.forEach(cb => cb.checked = false);
    
    const inputClient = document.getElementById('filter-client');
    if (inputClient) inputClient.value = '';
    
    const inputLocation = document.getElementById('filter-location');
    if (inputLocation) inputLocation.value = '';
    
    const inputDateStart = document.getElementById('filter-date-start');
    if (inputDateStart) {
      inputDateStart.value = '';
      if (inputDateStart._flatpickr) inputDateStart._flatpickr.clear();
    }
    
    const inputDateEnd = document.getElementById('filter-date-end');
    if (inputDateEnd) {
      inputDateEnd.value = '';
      if (inputDateEnd._flatpickr) inputDateEnd._flatpickr.clear();
    }
    
    const inputAmountMin = document.getElementById('filter-amount-min');
    if (inputAmountMin) inputAmountMin.value = '';
    
    const inputAmountMax = document.getElementById('filter-amount-max');
    if (inputAmountMax) inputAmountMax.value = '';
  };

  if (btnFilterReset) {
    btnFilterReset.addEventListener('click', resetFilterModalInputs);
  }

  // State

  // Close modal when clicking on overlay background
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // Financial Auto-Calculation
  const inputTotal = document.getElementById('input-total');
  const inputAdvance = document.getElementById('input-advance');
  const displayOutstanding = document.getElementById('display-outstanding');

  const calculateOutstanding = () => {
    if (inputTotal && inputAdvance && displayOutstanding) {
      const total = parseFloat(inputTotal.value) || 0;
      const advance = parseFloat(inputAdvance.value) || 0;
      const outstanding = Math.max(0, total - advance);
      
      // Format as currency (e.g. ₹15,000.00)
      displayOutstanding.textContent = '₹' + outstanding.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
  };

  if (inputTotal) inputTotal.addEventListener('input', calculateOutstanding);
  if (inputAdvance) inputAdvance.addEventListener('input', calculateOutstanding);

  // Add click ripple/feedback to all interactive elements
  const interactives = document.querySelectorAll('.interactive');
  interactives.forEach(el => {
    el.addEventListener('mousedown', () => { el.style.transform = 'scale(0.96)'; });
    el.addEventListener('mouseup', () => { el.style.transform = ''; });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });

  // Dynamic Calendar Logic
  const calendarGrid = document.getElementById('dynamic-calendar-grid');
  const calendarMonthYearText = document.getElementById('calendar-month-year-text');
  const btnPrevMonth = document.getElementById('btn-prev-month');
  const btnNextMonth = document.getElementById('btn-next-month');
  const inputShootDate = document.getElementById('input-shoot-date');
  const btnRegisterBooking = document.getElementById('btn-register-booking');
  const inputClientName = document.getElementById('input-client-name');

  let currentDate = new Date(2026, 5, 1); // June 2026 default as per mockup

  const defaultFilters = {
    categories: [],
    statuses: [],
    clientName: '',
    location: '',
    dateStart: '',
    dateEnd: '',
    amountMin: '',
    amountMax: ''
  };

  let currentFilters = JSON.parse(JSON.stringify(defaultFilters));

  const updateFilterIndicator = () => {
    const indicator = document.getElementById('active-filters-indicator');
    const textSpan = document.getElementById('active-filters-text');
    if (!indicator || !textSpan) return;

    let activeCount = 0;
    if (currentFilters.categories.length > 0) activeCount++;
    if (currentFilters.statuses.length > 0) activeCount++;
    if (currentFilters.clientName !== '') activeCount++;
    if (currentFilters.location !== '') activeCount++;
    if (currentFilters.dateStart !== '' || currentFilters.dateEnd !== '') activeCount++;
    if (currentFilters.amountMin !== '' || currentFilters.amountMax !== '') activeCount++;

    if (activeCount > 0) {
      indicator.style.display = 'flex';
      textSpan.textContent = `Filtered by ${activeCount} rule${activeCount > 1 ? 's' : ''}`;
    } else {
      indicator.style.display = 'none';
    }
  };

  const btnClearFilters = document.getElementById('btn-clear-filters');
  if (btnClearFilters) {
    btnClearFilters.addEventListener('click', () => {
      currentFilters = JSON.parse(JSON.stringify(defaultFilters));
      resetFilterModalInputs();
      renderTable();
      updateFilterIndicator();
    });
  }

  // State
  let bookings = [
    {
      id: 'ABK-1203',
      title: 'sdaddad',
      category: 'Fashion',
      date: '2026-06-26',
      time: '10:00 AM',
      location: 'Kanakkupulla Studio',
      phone: '+91 9876543210',
      email: 'hello@email.com',
      package: '23,000.00',
      advance: '12,000.00',
      due: '11,000.00',
      status: 'Confirmed'
    },
    {
      id: 'ABK-1092',
      title: 'Sarah & Tom Johnson',
      category: 'Wedding',
      date: '2026-06-10', // Moved to June to show on the default calendar view
      time: '10:00 AM',
      location: 'Taj Connemara',
      phone: '',
      email: '',
      package: '',
      advance: '',
      due: '',
      status: 'Confirmed'
    }
  ];

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Wedding': return { icon: 'ph-camera', class: '' };
      case 'Fashion': return { icon: 'ph-sparkle', class: 'orange' };
      case 'Baby & Kids': return { icon: 'ph-baby', class: 'orange' };
      case 'Corporate': return { icon: 'ph-buildings', class: '' };
      default: return { icon: 'ph-calendar-star', class: '' };
    }
  };

  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'Fashion': return 'badge-green';
      case 'Wedding': return '';
      default: return '';
    }
  };

  const renderMonthView = (year, month, monthNames) => {
    calendarGrid.className = 'calendar-grid';
    calendarGrid.innerHTML = '';

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(d => {
      const header = document.createElement('div');
      header.className = 'calendar-day-header';
      header.textContent = d;
      calendarGrid.appendChild(header);
    });

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDayDate = new Date(year, month + 1, 0).getDate();
    const prevLastDayDate = new Date(year, month, 0).getDate();
    
    // Previous month filler
    for (let i = firstDayIndex; i > 0; i--) {
      const day = prevLastDayDate - i + 1;
      const cell = document.createElement('div');
      cell.className = 'calendar-cell text-muted';
      cell.innerHTML = `<div class="calendar-date">${day}</div>`;
      calendarGrid.appendChild(cell);
    }
    
    // Current month cells
    const today = new Date();
    for (let i = 1; i <= lastDayDate; i++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-cell interactive';
      
      const paddedMonth = String(month + 1).padStart(2, '0');
      const paddedDay = String(i).padStart(2, '0');
      const dateString = `${year}-${paddedMonth}-${paddedDay}`;
      
      const dayBookings = bookings.filter(b => b.date === dateString);
      const isToday = i === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      
      const dateContent = isToday 
        ? `<div class="calendar-date" style="color: var(--brand-orange); font-weight: 800;">${i} <span style="font-size: 0.7rem; margin-left: 5px;">Today</span></div>`
        : `<div class="calendar-date" style="${dayBookings.length > 0 ? 'font-weight: 800;' : ''}">${i}</div>`;
        
      cell.innerHTML = dateContent;
      
      if (dayBookings.length > 0) {
        dayBookings.forEach(b => {
          const cat = getCategoryIcon(b.category);
          const evDiv = document.createElement('div');
          evDiv.className = `calendar-event ${cat.class}`;
          evDiv.innerHTML = `<i class="ph-fill ${cat.icon}"></i> ${b.category}`;
          evDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            openDetailsModal(b);
          });
          cell.appendChild(evDiv);
        });
      }

      cell.addEventListener('mousedown', () => { cell.style.transform = 'scale(0.96)'; });
      cell.addEventListener('mouseup', () => { cell.style.transform = ''; });
      cell.addEventListener('mouseleave', () => { cell.style.transform = ''; });

      cell.addEventListener('click', () => {
        if (inputShootDate) {
          inputShootDate.value = dateString;
          if (inputShootDate._flatpickr) inputShootDate._flatpickr.setDate(dateString);
        }
        openModal();
      });

      calendarGrid.appendChild(cell);
    }
  };

  const getVerticalEvents = (dateString) => {
    const dayBookings = bookings.filter(b => b.date === dateString);
    let html = '';
    dayBookings.forEach(b => {
      let startHour = 10; // default
      if (b.time) {
        const match = b.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match) {
          let h = parseInt(match[1]);
          if (match[3].toUpperCase() === 'PM' && h < 12) h += 12;
          if (match[3].toUpperCase() === 'AM' && h === 12) h = 0;
          startHour = h;
        }
      }
      // Assuming rendering 8 AM to 8 PM (12 hours)
      // 60px per hour
      const topOffset = (startHour - 8) * 60;
      if (topOffset >= 0 && topOffset < 12 * 60) {
        const catClass = getCategoryBadgeClass(b.category);
        const bg = catClass === 'badge-green' ? '#e6f4ea' : (b.category === 'Wedding' ? '#e8f0fe' : '#fef2eb');
        const color = catClass === 'badge-green' ? '#137333' : (b.category === 'Wedding' ? '#1a73e8' : '#e65100');
        
        html += `<div class="event-block" style="top: ${topOffset}px; height: 50px; background-color: ${bg}; color: ${color};" data-id="${b.id}">
          <div class="event-block-title">${b.title}</div>
          <div class="event-block-time">${b.time}</div>
        </div>`;
      }
    });
    return html;
  };

  const renderWeekView = (year, month, monthNames) => {
    calendarGrid.className = 'calendar-time-grid';
    calendarGrid.innerHTML = '';

    const firstDateOfWeek = new Date(currentDate);
    const dayOfWeek = firstDateOfWeek.getDay();
    firstDateOfWeek.setDate(firstDateOfWeek.getDate() - dayOfWeek);

    const timeAxis = document.createElement('div');
    timeAxis.className = 'time-axis';
    for (let h = 8; h <= 19; h++) {
      const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
      const ampm = h >= 12 ? 'PM' : 'AM';
      timeAxis.innerHTML += `<div class="time-slot-label">${displayH} ${ampm}</div>`;
    }
    calendarGrid.appendChild(timeAxis);

    const scheduleContainer = document.createElement('div');
    scheduleContainer.className = 'schedule-container';

    let headerHtml = '<div class="schedule-header week-columns">';
    let bodyHtml = '<div class="schedule-body week-columns">';

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 7; i++) {
      const loopDate = new Date(firstDateOfWeek);
      loopDate.setDate(loopDate.getDate() + i);
      const loopY = loopDate.getFullYear();
      const loopM = String(loopDate.getMonth() + 1).padStart(2, '0');
      const loopD = String(loopDate.getDate()).padStart(2, '0');
      const dateString = `${loopY}-${loopM}-${loopD}`;

      const isToday = loopDate.toDateString() === new Date().toDateString();
      const titleColor = isToday ? 'color: var(--brand-orange);' : '';

      headerHtml += `<div class="schedule-header-cell" style="${titleColor}">${days[i]} ${loopDate.getDate()}</div>`;
      bodyHtml += `<div class="day-column" data-date="${dateString}">`;
      bodyHtml += getVerticalEvents(dateString);
      bodyHtml += `</div>`;
    }
    headerHtml += '</div>';
    bodyHtml += '</div>';

    scheduleContainer.innerHTML = headerHtml + bodyHtml;
    calendarGrid.appendChild(scheduleContainer);

    // Add click listeners to event blocks
    setTimeout(() => {
      document.querySelectorAll('.event-block').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = el.getAttribute('data-id');
          const b = bookings.find(x => x.id === id);
          if (b) openDetailsModal(b);
        });
      });
      document.querySelectorAll('.day-column').forEach(el => {
        el.addEventListener('click', () => {
          const dateString = el.getAttribute('data-date');
          if (inputShootDate) {
            inputShootDate.value = dateString;
            if (inputShootDate._flatpickr) inputShootDate._flatpickr.setDate(dateString);
          }
          openModal();
        });
      });
    }, 0);
  };

  const renderDayView = (year, month, monthNames) => {
    calendarGrid.className = 'calendar-time-grid';
    calendarGrid.innerHTML = '';

    const timeAxis = document.createElement('div');
    timeAxis.className = 'time-axis';
    for (let h = 8; h <= 19; h++) {
      const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
      const ampm = h >= 12 ? 'PM' : 'AM';
      timeAxis.innerHTML += `<div class="time-slot-label">${displayH} ${ampm}</div>`;
    }
    calendarGrid.appendChild(timeAxis);

    const scheduleContainer = document.createElement('div');
    scheduleContainer.className = 'schedule-container';

    const loopY = currentDate.getFullYear();
    const loopM = String(currentDate.getMonth() + 1).padStart(2, '0');
    const loopD = String(currentDate.getDate()).padStart(2, '0');
    const dateString = `${loopY}-${loopM}-${loopD}`;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[currentDate.getDay()];

    const isToday = currentDate.toDateString() === new Date().toDateString();
    const titleColor = isToday ? 'color: var(--brand-orange);' : '';

    let headerHtml = `<div class="schedule-header">
      <div class="schedule-header-cell" style="${titleColor}">${dayName}, ${monthNames[month]} ${currentDate.getDate()}, ${year}</div>
    </div>`;
    
    let bodyHtml = `<div class="schedule-body" style="grid-template-columns: 1fr;">`;
    bodyHtml += `<div class="day-column" data-date="${dateString}">`;
    bodyHtml += getVerticalEvents(dateString);
    bodyHtml += `</div></div>`;

    scheduleContainer.innerHTML = headerHtml + bodyHtml;
    calendarGrid.appendChild(scheduleContainer);

    // Add click listeners
    setTimeout(() => {
      document.querySelectorAll('.event-block').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = el.getAttribute('data-id');
          const b = bookings.find(x => x.id === id);
          if (b) openDetailsModal(b);
        });
      });
      document.querySelector('.day-column').addEventListener('click', () => {
        if (inputShootDate) {
          inputShootDate.value = dateString;
          if (inputShootDate._flatpickr) inputShootDate._flatpickr.setDate(dateString);
        }
        openModal();
      });
    }, 0);
  };

  const renderCalendar = () => {
    if (!calendarGrid || !calendarMonthYearText) return;
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    if (currentCalendarView === 'month') {
      calendarMonthYearText.textContent = `${monthNames[month]} ${year}`;
      renderMonthView(year, month, monthNames);
    } else if (currentCalendarView === 'week') {
      const firstDateOfWeek = new Date(currentDate);
      const dayOfWeek = firstDateOfWeek.getDay();
      firstDateOfWeek.setDate(firstDateOfWeek.getDate() - dayOfWeek);
      
      const lastDateOfWeek = new Date(firstDateOfWeek);
      lastDateOfWeek.setDate(lastDateOfWeek.getDate() + 6);
      
      let weekText = '';
      if (firstDateOfWeek.getMonth() === lastDateOfWeek.getMonth()) {
        weekText = `${shortMonths[firstDateOfWeek.getMonth()]} ${firstDateOfWeek.getDate()} – ${lastDateOfWeek.getDate()}, ${firstDateOfWeek.getFullYear()}`;
      } else if (firstDateOfWeek.getFullYear() === lastDateOfWeek.getFullYear()) {
        weekText = `${shortMonths[firstDateOfWeek.getMonth()]} ${firstDateOfWeek.getDate()} – ${shortMonths[lastDateOfWeek.getMonth()]} ${lastDateOfWeek.getDate()}, ${firstDateOfWeek.getFullYear()}`;
      } else {
        weekText = `${shortMonths[firstDateOfWeek.getMonth()]} ${firstDateOfWeek.getDate()}, ${firstDateOfWeek.getFullYear()} – ${shortMonths[lastDateOfWeek.getMonth()]} ${lastDateOfWeek.getDate()}, ${lastDateOfWeek.getFullYear()}`;
      }
      calendarMonthYearText.textContent = weekText;
      
      renderWeekView(year, month, monthNames);
    } else if (currentCalendarView === 'day') {
      calendarMonthYearText.textContent = `${monthNames[month]} ${currentDate.getDate()}, ${year}`;
      renderDayView(year, month, monthNames);
    }
  };

  const renderUpcomingDetails = () => {
    const container = document.getElementById('dynamic-upcoming-details');
    if (!container) return;
    container.innerHTML = '';
    
    // Sort bookings by date string (simple sort)
    const sorted = [...bookings].sort((a, b) => a.date.localeCompare(b.date));
    
    sorted.forEach(b => {
      // Format date for display: Jun 26, 2026
      const d = new Date(b.date);
      const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
      const badgeClass = getCategoryBadgeClass(b.category);
      const bgStyle = badgeClass === '' ? 'style="background: var(--bg-main);"' : '';
      
      let html = `
        <div class="detail-card interactive">
          <div class="detail-header">
            <span class="badge ${badgeClass}" ${bgStyle}>${b.category}</span>
            <span class="detail-id">ID: ${b.id}</span>
          </div>
          <h4 class="detail-title">${b.title}</h4>
          <div class="detail-meta">
            <div class="detail-meta-item"><i class="ph-fill ph-clock icon-3d-styled"></i> ${displayDate} - ${b.time}</div>
            <div class="detail-meta-item"><i class="ph-fill ph-map-pin icon-3d-styled"></i> ${b.location || 'TBD'}</div>`;
            
      if (b.phone) html += `<div class="detail-meta-item"><i class="ph-fill ph-phone icon-3d-styled"></i> ${b.phone}</div>`;
      if (b.email) html += `<div class="detail-meta-item"><i class="ph-fill ph-envelope icon-3d-styled"></i> ${b.email}</div>`;
      
      html += `</div>`;
      
      if (b.package && b.advance && b.due) {
        html += `
          <div class="detail-financials">
            <div class="fin-item">
              <span class="fin-label">Package</span>
              <span class="fin-value">₹${b.package}</span>
            </div>
            <div class="fin-item">
              <span class="fin-label">Advance</span>
              <span class="fin-value">₹${b.advance}</span>
            </div>
            <div class="fin-item" style="align-items: flex-end;">
              <span class="fin-label">Due</span>
              <span class="fin-value">₹${b.due}</span>
            </div>
          </div>`;
      }
      
      html += `
          <div class="detail-footer">
            <div class="detail-avatars">
              <div class="mini-avatar">${b.title.charAt(0).toUpperCase()}</div>
              <i class="ph-fill ph-user-circle icon-3d-styled" style="font-size: 1.5rem; color: #6b7280;"></i>
            </div>
            <div class="detail-status">
              <div class="status-dot"></div> ${b.status}
            </div>
          </div>
        </div>
      `;
      
      // Convert html string to nodes to preserve event listeners
      const div = document.createElement('div');
      div.innerHTML = html.trim();
      const card = div.firstChild;
      
      card.addEventListener('mousedown', () => { card.style.transform = 'scale(0.96)'; });
      card.addEventListener('mouseup', () => { card.style.transform = ''; });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
      card.addEventListener('click', () => openDetailsModal(b));
      
      container.appendChild(card);
    });
  };

  const renderTable = () => {
    const tableContainer = document.getElementById('dynamic-bookings-table');
    if (!tableContainer) return;
    tableContainer.innerHTML = '';
    
    let filteredBookings = bookings.filter(b => {
      // Category filter
      if (currentFilters.categories.length > 0 && !currentFilters.categories.includes(b.category)) return false;
      
      // Status filter
      if (currentFilters.statuses.length > 0 && !currentFilters.statuses.includes(b.status)) return false;
      
      // Client name filter
      if (currentFilters.clientName && !b.title.toLowerCase().includes(currentFilters.clientName.toLowerCase())) return false;
      
      // Location filter
      const bLocation = b.location || '';
      if (currentFilters.location && !bLocation.toLowerCase().includes(currentFilters.location.toLowerCase())) return false;
      
      // Date Range filter
      if (currentFilters.dateStart || currentFilters.dateEnd) {
        const bDate = new Date(b.date);
        bDate.setHours(0,0,0,0);
        if (currentFilters.dateStart) {
          const sDate = new Date(currentFilters.dateStart);
          sDate.setHours(0,0,0,0);
          if (bDate < sDate) return false;
        }
        if (currentFilters.dateEnd) {
          const eDate = new Date(currentFilters.dateEnd);
          eDate.setHours(0,0,0,0);
          if (bDate > eDate) return false;
        }
      }
      
      // Amount Range filter
      if (currentFilters.amountMin || currentFilters.amountMax) {
        const amt = parseFloat(b.package) || 0;
        if (currentFilters.amountMin && amt < parseFloat(currentFilters.amountMin)) return false;
        if (currentFilters.amountMax && amt > parseFloat(currentFilters.amountMax)) return false;
      }
      
      return true;
    });
    
    const sorted = [...filteredBookings].sort((a, b) => a.date.localeCompare(b.date));
    
    sorted.forEach(b => {
      const d = new Date(b.date);
      const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
      const badgeClass = getCategoryBadgeClass(b.category);
      const bgStyle = badgeClass === '' ? 'style="background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;"' : '';
      
      let statusDotClass = 'blue';
      if (b.status === 'Confirmed') statusDotClass = 'green';
      else if (b.status === 'Pending') statusDotClass = 'red';
      else if (b.status === 'Partial') statusDotClass = 'orange';

      let html = `
        <div class="table-row interactive" style="cursor: pointer;">
          <div class="cell-client">
            <div class="avatar-sm">${b.title.charAt(0).toUpperCase()}</div>
            <div class="client-info">
              <h4>${b.title}</h4>
              <p>${b.id}</p>
            </div>
          </div>
          <div><span class="badge ${badgeClass}" ${bgStyle}>${b.category}</span></div>
          <div class="cell-date">
            <h4>${displayDate}</h4>
            <p>${b.time}</p>
          </div>
          <div class="cell-location">
            <i class="ph-fill ph-map-pin"></i> ${b.location || 'TBD'}
          </div>
          <div class="cell-amount">₹${b.package || '0.00'}</div>
          <div class="cell-status">
            <div class="status-dot-sm ${statusDotClass}"></div> ${b.status}
          </div>
          <div class="cell-action"><i class="ph-bold ph-dots-three-vertical" style="font-size: 1.2rem;"></i></div>
        </div>
      `;
      
      const div = document.createElement('div');
      div.innerHTML = html.trim();
      const row = div.firstChild;
      
      row.addEventListener('click', () => openDetailsModal(b));
      
      tableContainer.appendChild(row);
    });
  };

  // Delete Action
  if (btnDeleteBooking) {
    btnDeleteBooking.addEventListener('click', () => {
      if (activeDetailsBookingId) {
        bookings = bookings.filter(b => b.id !== activeDetailsBookingId);
        closeDetailsModal();
        renderCalendar();
        renderUpcomingDetails();
        renderTable();
        updateSuggestions();
        closeModal();
      }
    });
  }

  // Edit Action
  if (btnEditBooking) {
    btnEditBooking.addEventListener('click', () => {
      const b = bookings.find(x => x.id === activeDetailsBookingId);
      if (b) {
        activeEditBookingId = b.id;
        closeDetailsModal();
        
        // Populate create form
        if (inputClientName) inputClientName.value = b.title;
        if (inputShootDate) {
          inputShootDate.value = b.date;
          if (inputShootDate._flatpickr) inputShootDate._flatpickr.setDate(b.date);
        }
        const selectCat = document.querySelector('.form-group select');
        if (selectCat) selectCat.value = b.category;
        
        const inputTotal = document.getElementById('input-total');
        const inputAdvance = document.getElementById('input-advance');
        if (inputTotal) inputTotal.value = b.package ? b.package.replace(/,/g, '') : '';
        if (inputAdvance) inputAdvance.value = b.advance ? b.advance.replace(/,/g, '') : '';
        calculateOutstanding();
        
        document.querySelector('.modal-title').textContent = "Edit Studio Booking";
        if (btnRegisterBooking) btnRegisterBooking.innerHTML = `<i class="ph-fill ph-floppy-disk" style="margin-right: 5px;"></i> Save Changes`;
        
        openModal();
      }
    });
  }

  if (btnPrevMonth) {
    btnPrevMonth.addEventListener('click', () => {
      if (currentCalendarView === 'month') {
        currentDate.setMonth(currentDate.getMonth() - 1);
      } else if (currentCalendarView === 'week') {
        currentDate.setDate(currentDate.getDate() - 7);
      } else if (currentCalendarView === 'day') {
        currentDate.setDate(currentDate.getDate() - 1);
      }
      renderCalendar();
    });
  }

  if (btnNextMonth) {
    btnNextMonth.addEventListener('click', () => {
      if (currentCalendarView === 'month') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else if (currentCalendarView === 'week') {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (currentCalendarView === 'day') {
        currentDate.setDate(currentDate.getDate() + 1);
      }
      renderCalendar();
    });
  }

  const updateSuggestions = () => {
    const clientSuggestions = document.getElementById('client-suggestions');
    const locationSuggestions = document.getElementById('location-suggestions');
    if (!clientSuggestions || !locationSuggestions) return;

    const clients = [...new Set(bookings.map(b => b.title))].filter(Boolean);
    clientSuggestions.innerHTML = clients.map(c => `<option value="${c}">`).join('');

    const locations = [...new Set(bookings.map(b => b.location))].filter(Boolean);
    locationSuggestions.innerHTML = locations.map(l => `<option value="${l}">`).join('');
  };

  renderCalendar();
  renderUpcomingDetails();
  renderTable();
  updateSuggestions();

  // Dynamic autocomplete datalists
  const dynamicDatalistInputs = document.querySelectorAll('input[data-list-id]');
  dynamicDatalistInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      const listId = e.target.getAttribute('data-list-id');
      if (e.target.value.length > 0) {
        e.target.setAttribute('list', listId);
      } else {
        e.target.removeAttribute('list');
      }
    });
  });

  // Clear error styling when typing
  if (inputClientName) {
    inputClientName.addEventListener('input', () => {
      inputClientName.classList.remove('error');
    });
  }

  // Register Booking Button Logic
  if (btnRegisterBooking) {
    btnRegisterBooking.addEventListener('click', () => {
      const clientName = inputClientName ? inputClientName.value.trim() : '';
      if (!clientName) {
        if (inputClientName) {
          inputClientName.classList.add('error');
          inputClientName.focus();
        }
        return;
      }
      
      if (activeEditBookingId) {
        const b = bookings.find(x => x.id === activeEditBookingId);
        if (b) {
          b.title = clientName;
          b.category = document.querySelector('.form-group select') ? document.querySelector('.form-group select').value : 'Wedding';
          b.date = inputShootDate ? inputShootDate.value : '2026-06-18';
          b.package = document.getElementById('input-total') ? document.getElementById('input-total').value : '';
          b.advance = document.getElementById('input-advance') ? document.getElementById('input-advance').value : '';
          
          if (b.package && b.advance) {
            const p = parseFloat(b.package) || 0;
            const a = parseFloat(b.advance) || 0;
            b.due = Math.max(0, p - a).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            b.package = p.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            b.advance = a.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }
        }
      } else {
        // Add to bookings array
        const newBooking = {
          id: 'ABK-' + Math.floor(1000 + Math.random() * 9000),
          title: clientName,
          category: document.querySelector('.form-group select') ? document.querySelector('.form-group select').value : 'Wedding',
          date: inputShootDate ? inputShootDate.value : '2026-06-18',
          time: '10:00 AM', 
          location: 'Kanakkupulla Studio',
          phone: '',
          email: '',
          package: document.getElementById('input-total') ? document.getElementById('input-total').value : '',
          advance: document.getElementById('input-advance') ? document.getElementById('input-advance').value : '',
          due: '', 
          status: 'Confirmed'
        };
        
        if (newBooking.package && newBooking.advance) {
          const p = parseFloat(newBooking.package) || 0;
          const a = parseFloat(newBooking.advance) || 0;
          newBooking.due = Math.max(0, p - a).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          newBooking.package = p.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          newBooking.advance = a.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        bookings.push(newBooking);
      }
      
      renderCalendar();
      renderUpcomingDetails();
      renderTable();
      updateSuggestions();
      
      // Reset form
      if (inputClientName) {
        inputClientName.value = '';
        inputClientName.classList.remove('error');
      }
      if (inputShootDate) {
        inputShootDate.value = '2026-06-18';
        if (inputShootDate._flatpickr) inputShootDate._flatpickr.setDate('2026-06-18');
      }
      const inputTotal = document.getElementById('input-total');
      const inputAdvance = document.getElementById('input-advance');
      if (inputTotal) { inputTotal.value = ''; calculateOutstanding(); }
      if (inputAdvance) inputAdvance.value = '';
      
      closeModal();
    });
  }

});
