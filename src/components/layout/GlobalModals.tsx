"use client";

import dynamic from "next/dynamic";

// App-wide modals/panels. Each reads its own open state from GlobalFormProvider, so they
// stay mounted on every (main) route. Loading them with next/dynamic splits their code
// out of the shared layout bundle; they render nothing until opened, so skipping SSR
// changes nothing visible.
const BookingFormModal = dynamic(() => import("@/components/dashboard/BookingFormModal"), { ssr: false });
const TransactionModal = dynamic(() => import("@/components/dashboard/TransactionModal"), { ssr: false });
const TransactionDetailsModal = dynamic(() => import("@/components/dashboard/TransactionDetailsModal"), { ssr: false });
const OrderDetailsPanel = dynamic(() => import("@/components/gifts/OrderDetailsPanel"), { ssr: false });

export default function GlobalModals() {
  return (
    <>
      <BookingFormModal />
      <TransactionModal />
      <TransactionDetailsModal />
      <OrderDetailsPanel />
    </>
  );
}
