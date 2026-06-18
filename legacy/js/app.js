import { store } from './store/state.js';
import { initModals } from './components/Modals.js';
import { initAutocomplete } from './components/Autocomplete.js';
import { initBookingTable } from './components/BookingTable.js';
import { initCalendarWidget } from './components/CalendarWidget.js';

document.addEventListener('DOMContentLoaded', () => {
  // Navigation Routing Logic
  const navLinks = document.querySelectorAll('.nav-link');
  const views = document.querySelectorAll('.view-section');
  const pageTitle = document.getElementById('page-title');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetViewId = link.getAttribute('data-view');
      if (!targetViewId) return;

      navLinks.forEach(nav => nav.classList.remove('active'));
      link.classList.add('active');

      const titleText = link.textContent.trim().replace(/^[^\s]+\s/, ''); 
      if (pageTitle) pageTitle.textContent = titleText === 'Dashboard' ? 'Studio Management' : titleText + ' Management';

      views.forEach(view => {
        if (view.id === targetViewId) view.classList.add('active');
        else view.classList.remove('active');
      });
    });
  });

  // Bookings Tab Subview Toggling Logic (Overview vs List View)
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

  // Initialize Flatpickr for forms
  flatpickr("#input-shoot-date", { dateFormat: "Y-m-d" });
  flatpickr("#filter-date-start", { dateFormat: "Y-m-d" });
  flatpickr("#filter-date-end", { dateFormat: "Y-m-d" });

  // Initialize Components
  initModals(store);
  initAutocomplete(store);
  initBookingTable(store);
  initCalendarWidget(store);
});
