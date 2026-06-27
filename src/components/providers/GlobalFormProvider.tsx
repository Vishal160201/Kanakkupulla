"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface GlobalFormContextType {
  isBookingFormOpen: boolean;
  bookingToEditId: string | null;
  bookingInitialDate: string | null;
  openBookingForm: (bookingId?: string, initialDate?: string) => void;
  closeBookingForm: () => void;
  
  isBookingDetailsOpen: boolean;
  bookingDetailsId: string | null;
  openBookingDetails: (bookingId: string) => void;
  closeBookingDetails: () => void;
  
  isTransactionFormOpen: boolean;
  transactionToEditId: string | null;
  openTransactionForm: (transactionId?: string) => void;
  closeTransactionForm: () => void;

  isTransactionDetailsOpen: boolean;
  transactionDetailsId: string | null;
  openTransactionDetails: (transactionId: string) => void;
  closeTransactionDetails: () => void;
  
  isGiftOrderDetailsOpen: boolean;
  giftOrderDetailsId: string | null;
  openGiftOrderDetails: (orderId: string) => void;
  closeGiftOrderDetails: () => void;
}

const GlobalFormContext = createContext<GlobalFormContextType | undefined>(undefined);

export function GlobalFormProvider({ children }: { children: ReactNode }) {
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [bookingToEditId, setBookingToEditId] = useState<string | null>(null);
  const [bookingInitialDate, setBookingInitialDate] = useState<string | null>(null);

  const [isBookingDetailsOpen, setIsBookingDetailsOpen] = useState(false);
  const [bookingDetailsId, setBookingDetailsId] = useState<string | null>(null);

  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [transactionToEditId, setTransactionToEditId] = useState<string | null>(null);

  const [isTransactionDetailsOpen, setIsTransactionDetailsOpen] = useState(false);
  const [transactionDetailsId, setTransactionDetailsId] = useState<string | null>(null);

  const [isGiftOrderDetailsOpen, setIsGiftOrderDetailsOpen] = useState(false);
  const [giftOrderDetailsId, setGiftOrderDetailsId] = useState<string | null>(null);

  const openBookingForm = (bookingId?: string, initialDate?: string) => {
    setBookingToEditId(bookingId || null);
    setBookingInitialDate(initialDate || null);
    setIsBookingFormOpen(true);
  };

  const closeBookingForm = () => {
    setIsBookingFormOpen(false);
    setTimeout(() => {
      setBookingToEditId(null);
      setBookingInitialDate(null);
    }, 300);
  };

  const openBookingDetails = (bookingId: string) => {
    setBookingDetailsId(bookingId);
    setIsBookingDetailsOpen(true);
  };

  const closeBookingDetails = () => {
    setIsBookingDetailsOpen(false);
    setTimeout(() => setBookingDetailsId(null), 300);
  };

  const openTransactionForm = (transactionId?: string) => {
    setTransactionToEditId(transactionId || null);
    setIsTransactionFormOpen(true);
  };

  const closeTransactionForm = () => {
    setIsTransactionFormOpen(false);
    setTimeout(() => setTransactionToEditId(null), 300);
  };

  const openTransactionDetails = (transactionId: string) => {
    setTransactionDetailsId(transactionId);
    setIsTransactionDetailsOpen(true);
  };

  const closeTransactionDetails = () => {
    setIsTransactionDetailsOpen(false);
    setTimeout(() => setTransactionDetailsId(null), 300);
  };

  const openGiftOrderDetails = (orderId: string) => {
    setGiftOrderDetailsId(orderId);
    setIsGiftOrderDetailsOpen(true);
  };

  const closeGiftOrderDetails = () => {
    setIsGiftOrderDetailsOpen(false);
    setTimeout(() => setGiftOrderDetailsId(null), 300);
  };

  return (
    <GlobalFormContext.Provider value={{
      isBookingFormOpen, bookingToEditId, bookingInitialDate, openBookingForm, closeBookingForm,
      isBookingDetailsOpen, bookingDetailsId, openBookingDetails, closeBookingDetails,
      isTransactionFormOpen, transactionToEditId, openTransactionForm, closeTransactionForm,
      isTransactionDetailsOpen, transactionDetailsId, openTransactionDetails, closeTransactionDetails,
      isGiftOrderDetailsOpen, giftOrderDetailsId, openGiftOrderDetails, closeGiftOrderDetails
    }}>
      {children}
    </GlobalFormContext.Provider>
  );
}

export function useGlobalForm() {
  const context = useContext(GlobalFormContext);
  if (context === undefined) {
    throw new Error('useGlobalForm must be used within a GlobalFormProvider');
  }
  return context;
}
