"use client";

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import TransactionModal from "@/components/dashboard/TransactionModal";
import TransactionFilterModal, { TransactionFilters } from "@/components/dashboard/TransactionFilterModal";

function TransactionsLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const isOverview = pathname === '/dashboard/transactions/overview';
  const isAll = pathname === '/dashboard/transactions/allTransactions';

  const activeFilters: TransactionFilters = {
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    categories: searchParams.get('categories') ? searchParams.get('categories')!.split(',') : [],
    amountMin: searchParams.get('amountMin') || '',
    amountMax: searchParams.get('amountMax') || '',
  };

  const handleApplyFilters = (filters: TransactionFilters) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Date Range
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom); else params.delete('dateFrom');
    if (filters.dateTo) params.set('dateTo', filters.dateTo); else params.delete('dateTo');
    
    // Categories
    if (filters.categories.length > 0) params.set('categories', filters.categories.join(',')); else params.delete('categories');
    
    // Amounts
    if (filters.amountMin) params.set('amountMin', filters.amountMin); else params.delete('amountMin');
    if (filters.amountMax) params.set('amountMax', filters.amountMax); else params.delete('amountMax');
    
    // Clear legacy params
    params.delete('category');
    params.delete('month');
    
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="p-10 pb-20 animate-fade-in w-full max-w-7xl mx-auto">
      {/* Tabs and Action */}
      <div style={{ display: "flex", gap: "15px", marginBottom: "25px", alignItems: "center" }}>
        <Link 
          href="/dashboard/transactions/overview"
          className={`btn ${isOverview ? 'btn-primary' : 'btn-outline'} sub-nav-btn`} 
          style={{ borderRadius: "20px", borderColor: isAll ? "transparent" : "", textDecoration: "none" }}
        >
          Overview
        </Link>
        <Link 
          href="/dashboard/transactions/allTransactions"
          className={`btn ${isAll ? 'btn-primary' : 'btn-outline'} sub-nav-btn`} 
          style={{ borderRadius: "20px", borderColor: isOverview ? "transparent" : "", textDecoration: "none" }}
        >
          All transactions
        </Link>
        <div style={{ marginLeft: "auto", display: "flex", gap: "15px", alignItems: "center" }}>
          {isAll && (
            <button 
              onClick={() => setIsFilterModalOpen(true)}
              className="h-[45px] px-5 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-700 shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-colors relative"
            >
              <i className="ph-fill ph-funnel text-slate-500 text-lg"></i>
              Filters
              {(activeFilters.dateFrom || activeFilters.dateTo || activeFilters.categories.length > 0 || activeFilters.amountMin || activeFilters.amountMax) && (
                <span className="absolute top-[-5px] right-[-5px] w-3 h-3 bg-red-500 rounded-full border-2 border-white box-content"></span>
              )}
            </button>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 h-[45px] rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-600/20 transition-all hover:-translate-y-1 hover:shadow-orange-600/40"
          >
            <i className="ph-bold ph-plus-circle text-lg"></i>
            Add Transaction
          </button>
        </div>
      </div>

      <div className="sub-view active">
        {children}
      </div>

      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
          // Refresh the page data. In a real app we might use a Provider or server actions, 
          // but for now a router.refresh() will refresh server components and client fetches.
          router.refresh();
        }}
      />

      <TransactionFilterModal 
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        activeFilters={activeFilters}
        onApply={handleApplyFilters}
      />
    </div>
  );
}

export default function TransactionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-500">Loading...</div>}>
      <TransactionsLayoutContent>{children}</TransactionsLayoutContent>
    </Suspense>
  );
}
