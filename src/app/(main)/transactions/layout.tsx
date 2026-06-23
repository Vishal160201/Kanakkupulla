"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense } from "react";
function TransactionsLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const router = useRouter();

  const isOverview = pathname === "/transactions/overview";
  const isAll = pathname === "/transactions/allTransactions";

  return (
    <div className="p-0 md:p-4 lg:p-8 pb-20 animate-fade-in w-full max-w-7xl mx-auto">
      {/* Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-7">
        <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 shadow-sm overflow-x-auto no-scrollbar w-full sm:w-auto">
          <Link
            href="/transactions/overview"
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              isOverview
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Overview
          </Link>
          <Link
            href="/transactions/allTransactions"
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              isAll
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            All Transactions
          </Link>
        </div>

        <div className="sm:ml-auto w-full sm:w-auto">
          <button
            onClick={() => router.push("/transactions/new")}
            className="bg-orange-500 hover:bg-orange-600 text-white w-full sm:w-auto px-6 h-[44px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition-all hover:-translate-y-0.5 hover:shadow-orange-500/40 active:scale-95 whitespace-nowrap"
          >
            <i className="ph-bold ph-plus text-base"></i>
            Add Transaction
          </button>
        </div>
      </div>

      <div>{children}</div>
    </div>
  );
}

export default function TransactionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-500">Loading...</div>}>
      <TransactionsLayoutContent>{children}</TransactionsLayoutContent>
    </Suspense>
  );
}
