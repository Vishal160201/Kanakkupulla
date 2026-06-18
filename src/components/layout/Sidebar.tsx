"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", path: "/dashboard/overview", icon: "ph-house" },
    { name: "Bookings", path: "/bookings/overview", icon: "ph-calendar-blank" },
    { name: "Transactions", path: "/dashboard/transactions/overview", icon: "ph-file-text" },
    { name: "Gifts & Frames", path: "/dashboard/gifts", icon: "ph-gift" },
    { name: "Analytics", path: "/dashboard/analytics", icon: "ph-chart-bar" },
  ];

  return (
    <aside className="w-[220px] bg-white border-r border-gray-200 flex flex-col py-8 px-4 z-10 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.05)]">
      <div className="hover:scale-105 transition-transform cursor-pointer mb-2 px-1 flex justify-center">
        <img src="/assets/logo.png" alt="Kanakkupulla Logo" className="w-[150px] object-contain drop-shadow-sm" />
      </div>
      
      <ul className="list-none mt-10 flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.path) || (item.name === "Bookings" && pathname.startsWith("/bookings"));
          return (
            <li key={item.path}>
              <Link 
                href={item.path} 
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
      
    </aside>
  );
}
