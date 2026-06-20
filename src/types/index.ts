export interface Booking {
  id: string;
  bookingNumber?: string | null;
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
  status: string;
  customData?: Record<string, any> | null;
  packageName?: string | null;
  inclusions?: any | null;
  notes?: string | null;
  attachments?: any | null;
  photographers?: any | null;
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
