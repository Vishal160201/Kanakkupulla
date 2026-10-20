import type { Metadata } from "next";
import "flatpickr/dist/flatpickr.min.css";
import "flatpickr/dist/plugins/monthSelect/style.css";
import "@phosphor-icons/web/fill";
import "@phosphor-icons/web/regular";
import "@phosphor-icons/web/bold";
import "./globals.css";
import AuthProvider from "@/components/providers/AuthProvider";
import GlobalBannerProvider from "@/components/providers/GlobalBannerProvider";
import { cn } from "@/lib/utils";
import { geist, inter, outfit } from "@/lib/fonts";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Kanakkupulla - Studio Management",
  description: "Modern Studio Management Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable, outfit.variable)}>

      <body className={cn("flex h-[100dvh] fixed inset-0 w-full overflow-hidden bg-slate-50 text-slate-900 antialiased", inter.className)}>
        <AuthProvider>
          <GlobalBannerProvider>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </GlobalBannerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
