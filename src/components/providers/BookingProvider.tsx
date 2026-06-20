"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Booking, FilterState } from '@/types';

interface BookingContextType {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  
  isFilterModalOpen: boolean;
  setIsFilterModalOpen: (open: boolean) => void;
  
  hasData: boolean;
  setHasData: (has: boolean) => void;
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
  const [hasData, setHasData] = useState(false);
  
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  return (
    <BookingContext.Provider value={{ 
      filters, setFilters, 
      isFilterModalOpen, setIsFilterModalOpen,
      hasData, setHasData
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
