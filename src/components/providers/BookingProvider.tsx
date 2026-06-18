"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Booking, FilterState } from '@/types';

interface BookingContextType {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  addBooking: (booking: Booking) => void;
  updateBooking: (id: string, booking: Booking) => void;
  deleteBooking: (id: string) => void;
  
  // Modal States
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  isFilterModalOpen: boolean;
  setIsFilterModalOpen: (open: boolean) => void;
  activeDetailsId: string | null;
  setActiveDetailsId: (id: string | null) => void;
  activeEditId: string | null;
  setActiveEditId: (id: string | null) => void;
  selectedDateForNew: string | null;
  setSelectedDateForNew: (date: string | null) => void;
}

const defaultFilters: FilterState = {
  categories: [],
  statuses: [],
  clientName: '',
  location: '',
  dateStart: '',
  dateEnd: '',
  amountMin: '',
  amountMax: ''
};

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children, initialBookings = [] }: { children: ReactNode, initialBookings?: Booking[] }) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeDetailsId, setActiveDetailsId] = useState<string | null>(null);
  const [activeEditId, setActiveEditId] = useState<string | null>(null);
  const [selectedDateForNew, setSelectedDateForNew] = useState<string | null>(null);

  const addBooking = (booking: Booking) => setBookings((prev) => [booking, ...prev]);
  const updateBooking = (id: string, newBooking: Booking) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? newBooking : b)));
  };
  const deleteBooking = (id: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <BookingContext.Provider value={{ 
      bookings, setBookings, 
      filters, setFilters, 
      addBooking, updateBooking, deleteBooking,
      isAddModalOpen, setIsAddModalOpen,
      isFilterModalOpen, setIsFilterModalOpen,
      activeDetailsId, setActiveDetailsId,
      activeEditId, setActiveEditId,
      selectedDateForNew, setSelectedDateForNew
    }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBookings() {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBookings must be used within a BookingProvider');
  }
  return context;
}
