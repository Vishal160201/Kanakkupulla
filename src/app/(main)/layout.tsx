import Sidebar from "@/components/layout/Sidebar";
import TopNavigation from "@/components/layout/TopNavigation";
import { BookingProvider } from "@/components/providers/BookingProvider";
import PageTransition from "@/components/layout/PageTransition";
import React from "react";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BookingProvider>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopNavigation />
        <div className="flex-1 overflow-auto bg-[#fafafa] p-8">
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </main>
    </BookingProvider>
  );
}
