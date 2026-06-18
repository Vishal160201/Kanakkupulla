"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Booking, FilterState } from '@/types';

interface BookingContextType {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  
  // Modal States
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  isFilterModalOpen: boolean;
  setIsFilterModalOpen: (open: boolean) => void;
  
  activeDetailsBooking: Booking | null;
  setActiveDetailsBooking: (booking: Booking | null) => void;
  activeEditBooking: Booking | null;
  setActiveEditBooking: (booking: Booking | null) => void;
  
  isDeleteConfirmOpen: boolean;
  setIsDeleteConfirmOpen: (open: boolean) => void;

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

export function BookingProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeDetailsBooking, setActiveDetailsBooking] = useState<Booking | null>(null);
  const [activeEditBooking, setActiveEditBooking] = useState<Booking | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedDateForNew, setSelectedDateForNew] = useState<string | null>(null);

  return (
    <BookingContext.Provider value={{ 
      filters, setFilters, 
      isAddModalOpen, setIsAddModalOpen,
      isFilterModalOpen, setIsFilterModalOpen,
      activeDetailsBooking, setActiveDetailsBooking,
      activeEditBooking, setActiveEditBooking,
      isDeleteConfirmOpen, setIsDeleteConfirmOpen,
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
