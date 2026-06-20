import Sidebar from "@/components/layout/Sidebar";
import TopNavigation from "@/components/layout/TopNavigation";
import { BookingProvider } from "@/components/providers/BookingProvider";
import { SystemProvider } from "@/components/providers/SystemProvider";
import PageTransition from "@/components/layout/PageTransition";
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
      <BookingProvider>
        <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopNavigation />
        <div className="flex-1 overflow-auto bg-[#fafafa] p-8 relative">
          <PageTransition>
            {children}
          </PageTransition>
          {modal}
        </div>
      </main>
    </BookingProvider>
    </SystemProvider>
  );
}
