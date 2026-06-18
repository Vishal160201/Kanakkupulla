import { Booking } from '../types';

export const initialBookings: Booking[] = [
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
    date: '2026-06-10',
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
