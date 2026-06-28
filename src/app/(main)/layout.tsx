import Sidebar from "@/components/layout/Sidebar";
import TopNavigation from "@/components/layout/TopNavigation";
import { BookingProvider } from "@/components/providers/BookingProvider";
import { SystemProvider } from "@/components/providers/SystemProvider";
import PageTransition from "@/components/layout/PageTransition";
import { MobileNavProvider } from "@/components/providers/MobileNavProvider";
import { GlobalFormProvider } from "@/components/providers/GlobalFormProvider";
import BookingFormModal from "@/components/dashboard/BookingFormModal";
import TransactionModal from "@/components/dashboard/TransactionModal";
import BookingDetailsModal from "@/components/dashboard/BookingDetailsModal";
import TransactionDetailsModal from "@/components/dashboard/TransactionDetailsModal";
import OrderDetailsPanel from "@/components/gifts/OrderDetailsPanel";
import React from "react";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SystemProvider>
      <MobileNavProvider>
        <BookingProvider>
          <GlobalFormProvider>
            <Sidebar />
            <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden">
              <TopNavigation />
              <div className="flex-1 overflow-x-hidden overflow-y-auto bg-[#fafafa] p-4 md:p-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8 relative">
                <PageTransition>
                  {children}
                </PageTransition>
              </div>
            </main>
            
            {/* Global Forms */}
            <BookingFormModal />
            <TransactionModal />
            <BookingDetailsModal />
            <TransactionDetailsModal />
            <OrderDetailsPanel />
          </GlobalFormProvider>
        </BookingProvider>
      </MobileNavProvider>
    </SystemProvider>
  );
}
