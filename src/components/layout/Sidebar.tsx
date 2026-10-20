"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useMobileNav } from "../providers/MobileNavProvider";
import { useSyncExternalStore } from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import { useShops } from "@/components/providers/ShopProvider";
import type { AppModule } from "@/lib/shopModules";
import type { ModuleKey } from "@/lib/access";
import { useActiveShopCan } from "@/hooks/useAccess";
import { useRecycleBinAccess } from "@/components/settings/common/useIsOwner";

interface NavItem {
  name: string;
  path: string;
  /** Path prefix that marks the item active (defaults to `path`). */
  activePrefix: string;
  icon: string;
  module: AppModule;
  /**
   * Permission modules behind the item: it shows when the user can view any of them,
   * linking to the page of the first one they can view.
   */
  access: { module: ModuleKey; path: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard", path: "/dashboard/overview", activePrefix: "/dashboard", icon: "ph-house", module: "dashboard", access: [{ module: "dashboard", path: "/dashboard/overview" }] },
  {
    name: "Bookings",
    path: "/bookings/overview",
    activePrefix: "/bookings",
    icon: "ph-calendar-blank",
    module: "bookings",
    // Album status lives under Bookings but has its own permission.
    access: [{ module: "bookings", path: "/bookings/overview" }, { module: "albums", path: "/bookings/album-status" }],
  },
  { name: "Daily kanakku", path: "/transactions/overview", activePrefix: "/transactions", icon: "ph-file-text", module: "transactions", access: [{ module: "ledger", path: "/transactions/overview" }] },
  { name: "Fertilizer Inventory", path: "/inventory", activePrefix: "/inventory", icon: "ph-package", module: "inventory", access: [{ module: "inventory", path: "/inventory" }] },
  { name: "Gifts & Frames", path: "/gifts", activePrefix: "/gifts", icon: "ph-gift", module: "gifts", access: [{ module: "gifts", path: "/gifts" }] },
  { name: "Analytics", path: "/analytics", activePrefix: "/analytics", icon: "ph-chart-bar", module: "analytics", access: [{ module: "analytics", path: "/analytics" }] },
];

// Collapsed state is persisted in localStorage; read through useSyncExternalStore so the
// server render (and hydration) uses the expanded default and the client then picks up
// the saved value.
const COLLAPSE_KEY = 'sidebar_collapsed';
const collapseListeners = new Set<() => void>();
const subscribeCollapsed = (listener: () => void) => {
  collapseListeners.add(listener);
  return () => { collapseListeners.delete(listener); };
};
const getCollapsedSnapshot = () => localStorage.getItem(COLLAPSE_KEY) === 'true';
const getCollapsedServerSnapshot = () => false;
const setCollapsed = (next: boolean) => {
  localStorage.setItem(COLLAPSE_KEY, String(next));
  collapseListeners.forEach((listener) => listener());
};

export default function Sidebar() {
  const pathname = usePathname() || "";
  const { isSidebarOpen, closeSidebar } = useMobileNav();
  const { allowedModules } = useShops();
  const can = useActiveShopCan();
  const { canView: canOpenSettings } = useRecycleBinAccess();
  const isCollapsed = useSyncExternalStore(subscribeCollapsed, getCollapsedSnapshot, getCollapsedServerSnapshot);

  if (pathname.startsWith('/settings')) {
    return null;
  }

  const toggleCollapse = () => setCollapsed(!isCollapsed);
  
  // Modules of the active shop's type that the user may view there (the first viewable
  // sub-page of an item becomes its link).
  const visibleNavItems = NAV_ITEMS.flatMap((item) => {
    if (!allowedModules.includes(item.module)) return [];
    const target = item.access.find(({ module }) => can(module, "VIEW"));
    return target ? [{ ...item, path: target.path }] : [];
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[90] lg:hidden animate-[fadeIn_0.2s_ease-out]"
          aria-hidden="true"
          onClick={closeSidebar}
        />
      )}
      
      {/* Sidebar Content */}
      <aside className={`
        fixed inset-y-0 left-0 z-[100] shrink-0 bg-white border-r border-gray-200 flex flex-col py-8 px-4 shadow-[4px_0_15px_-3px_rgba(0,0,0,0.05)]
        transition-all duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'lg:w-[85px] w-[220px]' : 'w-[220px]'}
      `}>
      
      {/* Collapse Button */}
      <button
        type="button"
        onClick={toggleCollapse}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!isCollapsed}
        className="hidden lg:flex absolute -right-3.5 top-10 w-7 h-7 bg-white border border-gray-200 rounded-full items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm z-10 transition-colors"
      >
        <i className={`ph-bold ${isCollapsed ? 'ph-caret-right' : 'ph-caret-left'}`}></i>
      </button>

      <div className="hover:scale-105 transition-transform cursor-pointer mb-2 flex justify-center w-full min-h-[60px] items-center relative">
        <div className={`w-11 h-11 bg-gradient-to-br from-orange-400 to-orange-600 text-white rounded-xl flex items-center justify-center font-bold text-2xl shadow-md ${isCollapsed ? 'hidden lg:flex shrink-0' : 'hidden'}`}>
          K
        </div>
        <Image src="/assets/logo.png" alt="Kanakkupulla Logo" width={220} height={60} priority className={`object-contain drop-shadow-sm w-[200px] h-auto scale-125 origin-center ${isCollapsed ? 'lg:hidden block' : 'block'}`} />
      </div>
      
      <ul className="list-none mt-10 flex flex-col gap-2">
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.activePrefix || pathname.startsWith(`${item.activePrefix}/`);
          return (
            <li key={item.path}>
              <Tooltip content={isCollapsed ? item.name : undefined} side="right">
                <Link 
                  href={item.path} 
                  prefetch={true}
                  aria-label={item.name}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-3 py-3 rounded-xl no-underline font-bold text-[0.9rem] transition-all duration-150 ${
                    isCollapsed ? 'px-4 lg:px-0 lg:justify-center' : 'px-4'
                  } ${
                    isActive 
                      ? 'bg-orange-500 text-white shadow-[0_4px_10px_rgba(249,115,22,0.3)]' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1'
                  }`}
                >
                  <i aria-hidden="true" className={`ph-fill ${item.icon} text-xl ${isActive ? 'text-white' : 'text-slate-400'}`}></i> 
                  <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'lg:hidden' : 'block'}`}>{item.name}</span>
                </Link>
              </Tooltip>
            </li>
          );
        })}
      </ul>
      
      <div className="mt-auto flex flex-col gap-3">
        {/* Settings: owners, and members who can open the recycle bin (everything else there is owner-only). */}
        {canOpenSettings && (
          <Tooltip content={isCollapsed ? "Settings" : undefined} side="right">
              <Link 
                href="/settings" 
                prefetch={true}
                aria-label="Settings"
                aria-current={pathname.startsWith('/settings') ? "page" : undefined}
                className={`flex items-center gap-3 py-3 rounded-xl no-underline font-bold text-[0.9rem] transition-all duration-150 ${
                  isCollapsed ? 'px-4 lg:px-0 lg:justify-center' : 'px-4'
                } ${
                  pathname.startsWith('/settings')
                    ? 'bg-orange-500 text-white shadow-[0_4px_10px_rgba(249,115,22,0.3)]'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1'
                }`}
              >
                <i aria-hidden="true" className={`ph-fill ph-gear text-xl ${pathname.startsWith('/settings') ? 'text-white' : 'text-slate-400'}`}></i> 
                <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'lg:hidden' : 'block'}`}>Settings</span>
              </Link>
          </Tooltip>
        )}
      </div>
    </aside>
    </>
  );
}
