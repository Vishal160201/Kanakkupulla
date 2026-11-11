"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const MONEY_TABS = [
  { name: "Overview", path: "/money", icon: "ph-squares-four" },
  { name: "Transactions", path: "/money/transactions", icon: "ph-list-bullets" },
  { name: "Import", path: "/money/import", icon: "ph-upload-simple" },
  { name: "Cards", path: "/money/cards", icon: "ph-credit-card" },
  { name: "Commitments", path: "/money/commitments", icon: "ph-calendar-check" },
  { name: "Reports", path: "/money/reports", icon: "ph-chart-line-up" },
  { name: "Settings", path: "/money/settings", icon: "ph-sliders-horizontal" },
] as const;

/** Tab bar for /money; scrolls sideways on phones instead of wrapping. */
export default function MoneyTabs() {
  const pathname = usePathname() || "";
  return (
    <nav aria-label="My Wallet sections" className="-mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
      <ul className="flex w-max gap-1 rounded-2xl bg-white border border-slate-100 p-1 shadow-sm">
        {MONEY_TABS.map((tab) => {
          const isActive = tab.path === "/money" ? pathname === "/money" : pathname === tab.path || pathname.startsWith(`${tab.path}/`);
          return (
            <li key={tab.path}>
              <Link
                href={tab.path}
                prefetch
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-bold transition-colors duration-150 ${
                  isActive ? "bg-emerald-500 text-white shadow-[0_4px_10px_rgba(16,185,129,0.3)]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <i aria-hidden="true" className={`ph-bold ${tab.icon} text-base ${isActive ? "text-white" : "text-slate-400"}`} />
                {tab.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
