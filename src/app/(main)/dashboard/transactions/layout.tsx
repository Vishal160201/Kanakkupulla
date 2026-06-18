"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import TransactionModal from "@/components/dashboard/TransactionModal";

function TransactionsLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isOverview = pathname === "/dashboard/transactions/overview";
  const isAll = pathname === "/dashboard/transactions/allTransactions";

  return (
    <div className="p-8 pb-20 animate-fade-in w-full max-w-7xl mx-auto">
      {/* Tab Navigation */}
      <div className="flex items-center gap-3 mb-7">
        <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
          <Link
            href="/dashboard/transactions/overview"
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              isOverview
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Overview
          </Link>
          <Link
            href="/dashboard/transactions/allTransactions"
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              isAll
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            All Transactions
          </Link>
        </div>

        <div className="ml-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 h-[44px] rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-orange-500/25 transition-all hover:-translate-y-0.5 hover:shadow-orange-500/40 active:scale-95"
          >
            <i className="ph-bold ph-plus text-base"></i>
            Add Transaction
          </button>
        </div>
      </div>

      <div>{children}</div>

      {/* A5 FIX: onSuccess calls router.refresh() so Server Components re-fetch,
          AND the TransactionsClient's own useEffect picks up the searchParams change */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          router.refresh();
        }}
      />
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
