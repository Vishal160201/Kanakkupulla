import { getCategoryBadgeClass } from '../utils/formatters.js';
import { openDetailsModal } from './Modals.js';

export const updateFilterIndicator = (store) => {
  const { currentFilters } = store.getState();
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

export const renderUpcomingDetails = (store) => {
  const container = document.getElementById('dynamic-upcoming-details');
  if (!container) return;
  container.innerHTML = '';
  
  const { bookings } = store.getState();
  const sorted = [...bookings].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = sorted.slice(0, 3);
  
  if (upcoming.length === 0) {
    container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 20px;">No upcoming bookings</p>';
    return;
  }
  
  upcoming.forEach(b => {
    const d = new Date(b.date);
    const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const badgeClass = getCategoryBadgeClass(b.category);
    const bgStyle = badgeClass === '' ? 'style="background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;"' : '';
    
    let html = `
      <div class="booking-detail-card interactive">
        <div class="detail-header">
          <div class="client-info">
            <h4>${b.title}</h4>
            <p>${b.id}</p>
          </div>
          <span class="badge ${badgeClass}" ${bgStyle}>${b.category}</span>
        </div>
        <div class="detail-schedule">
          <div class="schedule-item">
            <i class="ph-fill ph-calendar-blank"></i> ${displayDate}
          </div>
          <div class="schedule-item">
            <i class="ph-fill ph-clock"></i> ${b.time}
          </div>
          <div class="schedule-item">
            <i class="ph-fill ph-map-pin"></i> ${b.location || 'TBD'}
          </div>
        </div>
    `;
    
    if (b.package || b.advance || b.due) {
      html += `
        <div class="detail-financials">
          <div class="fin-item">
            <span class="fin-label">Package</span>
            <span class="fin-value">₹${b.package}</span>
          </div>
          <div class="fin-item" style="align-items: center;">
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

export const renderTable = (store) => {
  const tableContainer = document.getElementById('dynamic-bookings-table');
  if (!tableContainer) return;
  tableContainer.innerHTML = '';
  
  const { bookings, currentFilters } = store.getState();

  let filteredBookings = bookings.filter(b => {
    if (currentFilters.categories.length > 0 && !currentFilters.categories.includes(b.category)) return false;
    if (currentFilters.statuses.length > 0 && !currentFilters.statuses.includes(b.status)) return false;
    if (currentFilters.clientName && !b.title.toLowerCase().includes(currentFilters.clientName.toLowerCase())) return false;
    const bLocation = b.location || '';
    if (currentFilters.location && !bLocation.toLowerCase().includes(currentFilters.location.toLowerCase())) return false;
    
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
    
    if (currentFilters.amountMin || currentFilters.amountMax) {
      const amt = parseFloat(b.package.replace(/,/g, '')) || 0;
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

export const initBookingTable = (store) => {
  store.subscribe(() => {
    renderTable(store);
    renderUpcomingDetails(store);
    updateFilterIndicator(store);
  });

  // Initial render
  renderTable(store);
  renderUpcomingDetails(store);
  updateFilterIndicator(store);
};
