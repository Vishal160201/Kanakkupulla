import { getCategoryIcon, getCategoryBadgeClass } from '../utils/formatters.js';
import { openModal, openDetailsModal } from './Modals.js';

export const initCalendarWidget = (store) => {
  const calendarGrid = document.getElementById('dynamic-calendar-grid');
  const calendarMonthYearText = document.getElementById('calendar-month-year-text');
  const inputShootDate = document.getElementById('input-shoot-date');
  const monthPickerInput = document.getElementById('calendar-month-picker');
  const monthYearTrigger = document.getElementById('calendar-month-year');
  let monthPickerInstance = null;

  const initCalendarHeaderPicker = () => {
    if (!monthPickerInput || !monthYearTrigger) return;
    if (monthPickerInstance) monthPickerInstance.destroy();
    
    const state = store.getState();
    const currentCalendarView = state.currentCalendarView;

    if (currentCalendarView === 'month') {
      monthPickerInstance = flatpickr(monthPickerInput, {
        positionElement: monthYearTrigger,
        plugins: [new monthSelectPlugin({ shorthand: true, dateFormat: "Y-m", altFormat: "F Y" })],
        onChange: function(selectedDates) {
          if (selectedDates.length > 0) {
            const d = new Date(selectedDates[0]);
            store.setState({ currentDate: d });
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
            store.setState({ currentDate: new Date(selectedDates[0]) });
          }
        }
      });
    } else if (currentCalendarView === 'day') {
      monthPickerInstance = flatpickr(monthPickerInput, {
        positionElement: monthYearTrigger,
        dateFormat: "Y-m-d",
        onChange: function(selectedDates) {
          if (selectedDates.length > 0) {
            store.setState({ currentDate: new Date(selectedDates[0]) });
          }
        }
      });
    }
  };

  initCalendarHeaderPicker();

  if (monthYearTrigger) {
    monthYearTrigger.addEventListener('click', () => {
      if (monthPickerInstance) {
        monthPickerInstance.setDate(store.getState().currentDate);
        monthPickerInstance.open();
      }
    });
  }

  const getVerticalEvents = (dateString, bookings) => {
    const dayBookings = bookings.filter(b => b.date === dateString);
    let html = '';
    dayBookings.forEach(b => {
      let startHour = 10;
      if (b.time) {
        const match = b.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match) {
          let h = parseInt(match[1]);
          if (match[3].toUpperCase() === 'PM' && h < 12) h += 12;
          if (match[3].toUpperCase() === 'AM' && h === 12) h = 0;
          startHour = h;
        }
      }
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

  const renderMonthView = (year, month, monthNames, bookings) => {
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
    
    for (let i = firstDayIndex; i > 0; i--) {
      const day = prevLastDayDate - i + 1;
      const cell = document.createElement('div');
      cell.className = 'calendar-cell text-muted';
      cell.innerHTML = `<div class="calendar-date">${day}</div>`;
      calendarGrid.appendChild(cell);
    }
    
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
          evDiv.addEventListener('click', (e) => { e.stopPropagation(); openDetailsModal(b); });
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

  const renderWeekView = (currentDate, year, month, monthNames, bookings) => {
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
      bodyHtml += getVerticalEvents(dateString, bookings);
      bodyHtml += `</div>`;
    }
    headerHtml += '</div>';
    bodyHtml += '</div>';

    scheduleContainer.innerHTML = headerHtml + bodyHtml;
    calendarGrid.appendChild(scheduleContainer);

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

  const renderDayView = (currentDate, year, month, monthNames, bookings) => {
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
    bodyHtml += getVerticalEvents(dateString, bookings);
    bodyHtml += `</div></div>`;

    scheduleContainer.innerHTML = headerHtml + bodyHtml;
    calendarGrid.appendChild(scheduleContainer);

    setTimeout(() => {
      document.querySelectorAll('.event-block').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = el.getAttribute('data-id');
          const b = bookings.find(x => x.id === id);
          if (b) openDetailsModal(b);
        });
      });
      const dayCol = document.querySelector('.day-column');
      if (dayCol) {
        dayCol.addEventListener('click', () => {
          if (inputShootDate) {
            inputShootDate.value = dateString;
            if (inputShootDate._flatpickr) inputShootDate._flatpickr.setDate(dateString);
          }
          openModal();
        });
      }
    }, 0);
  };

  const renderCalendar = (state) => {
    if (!calendarGrid || !calendarMonthYearText) return;
    
    const { currentDate, currentCalendarView, bookings } = state;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    if (currentCalendarView === 'month') {
      calendarMonthYearText.textContent = `${monthNames[month]} ${year}`;
      renderMonthView(year, month, monthNames, bookings);
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
      
      renderWeekView(currentDate, year, month, monthNames, bookings);
    } else if (currentCalendarView === 'day') {
      calendarMonthYearText.textContent = `${monthNames[month]} ${currentDate.getDate()}, ${year}`;
      renderDayView(currentDate, year, month, monthNames, bookings);
    }
  };

  const btnPrevMonth = document.getElementById('btn-prev-month');
  const btnNextMonth = document.getElementById('btn-next-month');
  
  if (btnPrevMonth) {
    btnPrevMonth.addEventListener('click', () => {
      const state = store.getState();
      const d = new Date(state.currentDate);
      if (state.currentCalendarView === 'month') d.setMonth(d.getMonth() - 1);
      else if (state.currentCalendarView === 'week') d.setDate(d.getDate() - 7);
      else if (state.currentCalendarView === 'day') d.setDate(d.getDate() - 1);
      store.setState({ currentDate: d });
    });
  }

  if (btnNextMonth) {
    btnNextMonth.addEventListener('click', () => {
      const state = store.getState();
      const d = new Date(state.currentDate);
      if (state.currentCalendarView === 'month') d.setMonth(d.getMonth() + 1);
      else if (state.currentCalendarView === 'week') d.setDate(d.getDate() + 7);
      else if (state.currentCalendarView === 'day') d.setDate(d.getDate() + 1);
      store.setState({ currentDate: d });
    });
  }

  const viewToggleBtns = document.querySelectorAll('.calendar-view-btn');
  viewToggleBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      viewToggleBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      store.setState({ currentCalendarView: e.target.getAttribute('data-view') });
      initCalendarHeaderPicker();
    });
  });

  store.subscribe(renderCalendar);
  renderCalendar(store.getState());
};
