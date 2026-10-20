import Sidebar from "@/components/layout/Sidebar";
import TopNavigation from "@/components/layout/TopNavigation";
import { BookingProvider } from "@/components/providers/BookingProvider";
import { SystemProvider } from "@/components/providers/SystemProvider";
import PageTransition from "@/components/layout/PageTransition";
import { MobileNavProvider } from "@/components/providers/MobileNavProvider";
import { GlobalFormProvider } from "@/components/providers/GlobalFormProvider";
import GlobalModals from "@/components/layout/GlobalModals";
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
            
            {/* Global Forms (code-split, client-only) */}
            <GlobalModals />
          </GlobalFormProvider>
        </BookingProvider>
      </MobileNavProvider>
    </SystemProvider>
  );
}
