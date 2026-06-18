import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "flatpickr/dist/flatpickr.min.css";
import "flatpickr/dist/plugins/monthSelect/style.css";
import "@phosphor-icons/web/fill";
import "@phosphor-icons/web/regular";
import "@phosphor-icons/web/bold";
import "./globals.css";
import AuthProvider from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});
const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en" className={cn("font-sans", geist.variable)}>

      <body className={cn("flex h-screen overflow-hidden bg-slate-50 text-slate-900 antialiased", inter.className)}>
        <AuthProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </body>
    </html>
  );
}
