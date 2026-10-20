"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { BillKind } from '@/types/inventory';

/** Prefill for a new transaction (e.g. quick actions pass the type and/or category). */
export interface TransactionInitialData {
  type?: string;
  category?: string;
}

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
  transactionInitialData?: TransactionInitialData;
  openTransactionForm: (transactionId?: string, initialData?: TransactionInitialData) => void;
  closeTransactionForm: () => void;

  isTransactionDetailsOpen: boolean;
  transactionDetailsId: string | null;
  openTransactionDetails: (transactionId: string) => void;
  closeTransactionDetails: () => void;
  
  isGiftOrderDetailsOpen: boolean;
  giftOrderDetailsId: string | null;
  openGiftOrderDetails: (orderId: string) => void;
  closeGiftOrderDetails: () => void;

  /** Fertilizer Inventory sale/purchase opened from Daily Kanakku (fertilizer shops). */
  inventoryBillKind: BillKind | null;
  openInventoryBill: (kind: BillKind) => void;
  closeInventoryBill: () => void;
}

const GlobalFormContext = createContext<GlobalFormContextType | undefined>(undefined);

export function GlobalFormProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [bookingToEditId, setBookingToEditId] = useState<string | null>(null);
  const [bookingInitialDate, setBookingInitialDate] = useState<string | null>(null);

  // Booking details open as a route (see openBookingDetails); these stay at their defaults.
  const [isBookingDetailsOpen] = useState(false);
  const [bookingDetailsId] = useState<string | null>(null);

  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [transactionToEditId, setTransactionToEditId] = useState<string | null>(null);
  const [transactionInitialData, setTransactionInitialData] = useState<TransactionInitialData | undefined>(undefined);

  const [isTransactionDetailsOpen, setIsTransactionDetailsOpen] = useState(false);
  const [transactionDetailsId, setTransactionDetailsId] = useState<string | null>(null);

  const [isGiftOrderDetailsOpen, setIsGiftOrderDetailsOpen] = useState(false);
  const [giftOrderDetailsId, setGiftOrderDetailsId] = useState<string | null>(null);

  const [inventoryBillKind, setInventoryBillKind] = useState<BillKind | null>(null);

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
    router.push(`/bookings/details/${bookingId}`);
  };

  const closeBookingDetails = () => {
    router.back();
  };

  const openTransactionForm = (transactionId?: string, initialData?: TransactionInitialData) => {
    setTransactionToEditId(transactionId || null);
    if (initialData) setTransactionInitialData(initialData);
    setIsTransactionFormOpen(true);
  };

  const closeTransactionForm = () => {
    setIsTransactionFormOpen(false);
    setTimeout(() => {
      setTransactionToEditId(null);
      setTransactionInitialData(undefined);
    }, 300);
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

  const openInventoryBill = (kind: BillKind) => setInventoryBillKind(kind);
  const closeInventoryBill = () => setInventoryBillKind(null);

  return (
    <GlobalFormContext.Provider value={{
      isBookingFormOpen, bookingToEditId, bookingInitialDate, openBookingForm, closeBookingForm,
      isBookingDetailsOpen, bookingDetailsId, openBookingDetails, closeBookingDetails,
      isTransactionFormOpen, transactionToEditId, transactionInitialData, openTransactionForm, closeTransactionForm,
      isTransactionDetailsOpen, transactionDetailsId, openTransactionDetails, closeTransactionDetails,
      isGiftOrderDetailsOpen, giftOrderDetailsId, openGiftOrderDetails, closeGiftOrderDetails,
      inventoryBillKind, openInventoryBill, closeInventoryBill
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
