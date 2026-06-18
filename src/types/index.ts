export interface Booking {
  id: string;
  title: string;
  category: string;
  date: string;
  time: string;
  location: string;
  phone: string;
  email: string;
  package: string;
  advance: string;
  due: string;
  status: 'Confirmed' | 'Pending' | 'Partial';
}

export interface FilterState {
  categories: string[];
  statuses: string[];
  clientName: string;
  location: string;
  dateStart: string;
  dateEnd: string;
  amountMin: string;
  amountMax: string;
}
