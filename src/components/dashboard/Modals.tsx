"use client";

import dynamic from 'next/dynamic';

const BookingFilterModal = dynamic(() => import('./BookingFilterModal'), { ssr: false });

export default function Modals() {
  return (
    <>
      <BookingFilterModal />
    </>
  );
}
