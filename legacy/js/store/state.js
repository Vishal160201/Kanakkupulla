import { initialBookings } from '../data/mockData.js';

class Store {
  constructor() {
    this.state = {
      bookings: [...initialBookings],
      currentDate: new Date(),
      currentCalendarView: 'month',
      currentFilters: {
        categories: [],
        statuses: [],
        dateRange: { start: '', end: '' },
        searchQuery: ''
      }
    };
    this.listeners = [];
  }

  getState() {
    return this.state;
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(listener => listener(this.state));
  }
}

export const store = new Store();
