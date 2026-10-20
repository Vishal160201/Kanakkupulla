import Sidebar from "@/components/layout/Sidebar";
import TopNavigation from "@/components/layout/TopNavigation";
import { BookingProvider } from "@/components/providers/BookingProvider";
import { SystemProvider } from "@/components/providers/SystemProvider";
import PageTransition from "@/components/layout/PageTransition";
import { MobileNavProvider } from "@/components/providers/MobileNavProvider";
import { GlobalFormProvider } from "@/components/providers/GlobalFormProvider";
import { ShopProvider } from "@/components/providers/ShopProvider";
import GlobalModals from "@/components/layout/GlobalModals";
import ShopRouteGuard from "@/components/shops/ShopRouteGuard";
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
          <ShopProvider>
          <GlobalFormProvider>
            <Sidebar />
            <main className="flex-1 min-w-0 flex flex-col h-[100dvh] overflow-hidden">
              <TopNavigation />
              <div className="flex-1 overflow-x-hidden overflow-y-auto bg-[#fafafa] p-4 md:p-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8 relative">
                {/* One content width for every page, so edges line up across the app */}
                <div className="mx-auto w-full max-w-[1400px]">
                  <PageTransition>
                    {/* Sends pages the active shop type doesn't have to its landing page */}
                    <ShopRouteGuard>{children}</ShopRouteGuard>
                  </PageTransition>
                </div>
              </div>
            </main>
            
            {/* Global Forms (code-split, client-only) */}
            <GlobalModals />
          </GlobalFormProvider>
          </ShopProvider>
        </BookingProvider>
      </MobileNavProvider>
    </SystemProvider>
  );
}
