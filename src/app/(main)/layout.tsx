import Sidebar from "@/components/layout/Sidebar";
import TopNavigation from "@/components/layout/TopNavigation";
import { BookingProvider } from "@/components/providers/BookingProvider";
import { SystemProvider } from "@/components/providers/SystemProvider";
import PageTransition from "@/components/layout/PageTransition";
import { MobileNavProvider } from "@/components/providers/MobileNavProvider";
import React from "react";

export default function MainLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <SystemProvider>
      <MobileNavProvider>
        <BookingProvider>
          <Sidebar />
        <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden">
          <TopNavigation />
          <div className="flex-1 overflow-x-hidden overflow-y-auto bg-[#fafafa] p-4 md:p-8 relative">
            <PageTransition>
              {children}
            </PageTransition>
            {modal}
          </div>
        </main>
      </BookingProvider>
      </MobileNavProvider>
    </SystemProvider>
  );
}
