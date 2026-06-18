"use client";

import dynamic from 'next/dynamic';

const BookingFormModal = dynamic(() => import('./BookingFormModal'), { ssr: false });
const BookingDetailsModal = dynamic(() => import('./BookingDetailsModal'), { ssr: false });
const DeleteConfirmationModal = dynamic(() => import('./DeleteConfirmationModal'), { ssr: false });
const BookingFilterModal = dynamic(() => import('./BookingFilterModal'), { ssr: false });

export default function Modals() {
  return (
    <>
      <BookingFormModal />
      <BookingDetailsModal />
      <DeleteConfirmationModal />
      <BookingFilterModal />
    </>
  );
}
