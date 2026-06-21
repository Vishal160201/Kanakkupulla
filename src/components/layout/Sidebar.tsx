"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMobileNav } from "../providers/MobileNavProvider";

export default function Sidebar() {
  const pathname = usePathname() || "";
  const { data: session } = useSession();
  const { isSidebarOpen, closeSidebar } = useMobileNav();
  
  // Default to STAFF if role is undefined, or handle safely
  const userRole = (session?.user as any)?.role || "STAFF";

  const navItems = [
    { name: "Dashboard", path: "/dashboard/overview", icon: "ph-house", roles: ["ADMIN", "STAFF", "PHOTOGRAPHER"] },
    { name: "Bookings", path: "/bookings/overview", icon: "ph-calendar-blank", roles: ["ADMIN", "STAFF", "PHOTOGRAPHER"] },
    { name: "Transactions", path: "/transactions/overview", icon: "ph-file-text", roles: ["ADMIN", "STAFF"] },
    { name: "Gifts & Frames", path: "/gifts", icon: "ph-gift", roles: ["ADMIN", "STAFF"] },
    { name: "Analytics", path: "/analytics", icon: "ph-chart-bar", roles: ["ADMIN"] },
  ];

  const visibleNavItems = navItems.filter(item => item.roles.includes(userRole));

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[90] lg:hidden animate-[fadeIn_0.2s_ease-out]"
          onClick={closeSidebar}
        />
      )}
      
      {/* Sidebar Content */}
      <aside className={`
        fixed inset-y-0 left-0 z-[100] w-[220px] bg-white border-r border-gray-200 flex flex-col py-8 px-4 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.05)]
        transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
      <div className="hover:scale-105 transition-transform cursor-pointer mb-2 flex justify-center w-full">
        <Image src="/assets/logo.png" alt="Kanakkupulla Logo" width={220} height={60} priority className="object-contain drop-shadow-sm w-[200px] h-auto scale-125 origin-center" />
      </div>
      
      <ul className="list-none mt-10 flex flex-col gap-2">
        {visibleNavItems.map((item) => {
          const isActive = pathname.startsWith(item.path) || (item.name === "Bookings" && pathname.startsWith("/bookings"));
          return (
            <li key={item.path}>
              <Link 
                href={item.path} 
                prefetch={true}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl no-underline font-bold text-[0.9rem] transition-all duration-150 ${
                  isActive 
                    ? 'bg-orange-500 text-white shadow-[0_4px_10px_rgba(249,115,22,0.3)]' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1'
                }`}
              >
                <i className={`ph-fill ${item.icon} text-lg ${isActive ? 'text-white' : 'text-slate-400'}`}></i> {item.name}
              </Link>
            </li>
          );
        })}
      </ul>
      
      <div className="mt-auto flex flex-col gap-3">
        {userRole === "ADMIN" && (
          <Link 
            href="/settings" 
            prefetch={true}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl no-underline font-bold text-[0.9rem] transition-all duration-150 ${
              pathname.startsWith('/settings')
                ? 'bg-orange-500 text-white shadow-[0_4px_10px_rgba(249,115,22,0.3)]'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1'
            }`}
          >
            <i className={`ph-fill ph-gear text-lg ${pathname.startsWith('/settings') ? 'text-white' : 'text-slate-400'}`}></i> Settings
          </Link>
        )}
      </div>
    </aside>
    </>
  );
}
