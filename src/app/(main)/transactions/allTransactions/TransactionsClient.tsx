"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";
import { toast } from "sonner";
import BudgetOverview from "@/components/dashboard/BudgetOverview";
import HighPriorityAlerts from "@/components/dashboard/HighPriorityAlerts";
import {
  EMPTY_TEMP_FILTERS,
  applyTempFilters,
  monthParamsFromDate,
  readFilterParams,
  tempFiltersFromParams,
  weekParamsFromDate,
  type TempFilters,
} from "@/components/transactions/list/listFilters";
import { useTransactionsList } from "@/components/transactions/list/useTransactionsList";
import { exportTransactions } from "@/components/transactions/list/exportTransactions";
import TransactionListRow, { groupLedgerTransactions } from "@/components/transactions/list/TransactionListRow";
import TransactionsToolbar from "@/components/transactions/list/TransactionsToolbar";
import AdvancedFilterDialog from "@/components/transactions/list/AdvancedFilterDialog";
import DeleteTransactionDialog from "@/components/transactions/list/DeleteTransactionDialog";
import {
  ActiveFilterBadges,
  ListPagination,
  TransactionListSkeleton,
  TransactionsEmptyState,
} from "@/components/transactions/list/ListStatus";

function TransactionsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openTransactionDetails, openTransactionForm } = useGlobalForm();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [tempFilters, setTempFilters] = useState<TempFilters>(EMPTY_TEMP_FILTERS);

  const filterParams = readFilterParams(searchParams);
  const activeView = filterParams.view;

  // F5/P2: Paginated list for the current URL filters
  const { transactions, totalCount, currentPage, isLoading, isLoadingMore, goToPage, removeTransactions } = useTransactionsList(filterParams);

  const pushParams = (params: URLSearchParams) => router.push(`?${params.toString()}`);

  // Bug fix: Always sync tempFilters from URL when filter modal opens so stale values are never shown
  const openFilterModal = () => {
    setTempFilters(tempFiltersFromParams(filterParams));
    setIsFilterModalOpen(true);
  };

  const applyFilters = () => {
    pushParams(applyTempFilters(searchParams, tempFilters));
    setIsFilterModalOpen(false);
  };

  // Bug fix: Clear All must also clear the URL params so the data refreshes immediately
  const clearAllFilters = () => {
    setTempFilters(EMPTY_TEMP_FILTERS);
    const params = new URLSearchParams();
    if (activeView) params.set('view', activeView);
    pushParams(params);
    setIsFilterModalOpen(false);
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (transactions.length === 0) return;
    setIsExporting(true);
    try {
      await exportTransactions(transactions, format);
    } catch {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleViewChange = (view: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', view);
    params.delete('dateFrom');
    params.delete('dateTo');
    params.delete('month');
    pushParams(params);
  };

  const handleDayChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', 'day');
    params.set('dateFrom', val);
    params.set('dateTo', val);
    pushParams(params);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const isGroup = deleteId.startsWith('grp_');
      const url = isGroup ? `/api/transactions/bulk/${deleteId}` : `/api/transactions/${deleteId}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        removeTransactions(tx => isGroup ? tx.groupId === deleteId : tx.id === deleteId);
        toast.success(isGroup ? "Group deleted." : "Transaction deleted.");
        router.refresh();
      } else {
        toast.error("Failed to delete. Please try again.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    }
    setIsDeleting(false);
    setDeleteId(null);
  };

  const toggleGroup = (groupId: string) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(groupId)) newSet.delete(groupId);
    else newSet.add(groupId);
    setExpandedGroups(newSet);
  };

  const hasFilters = !!(filterParams.dateFrom || filterParams.dateTo || filterParams.type || filterParams.paymentMode || filterParams.categories);

  return (
    <div className="animate-fade-in w-full">
      <HighPriorityAlerts />
      <BudgetOverview />

      {/* Transaction Activity */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 animate-slide-up" style={{ animationDelay: "100ms" }}>

        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Transaction History</h2>
            {/* U6 FIX: Hide record count while loading */}
              {!isLoading && (
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{totalCount} Records</div>
            )}
          </div>

          {/* Preset Views & Pickers */}
          <TransactionsToolbar
            filterParams={filterParams}
            activeView={activeView}
            canExport={transactions.length > 0}
            isExporting={isExporting}
            onOpenFilters={openFilterModal}
            onExport={handleExport}
            onViewChange={handleViewChange}
            onDayChange={handleDayChange}
            onWeekChange={(dateStr) => pushParams(weekParamsFromDate(searchParams, dateStr))}
            onMonthChange={(dateStr) => pushParams(monthParamsFromDate(searchParams, dateStr))}
          />
        </div>

        {/* Active Filter Badges */}
        <ActiveFilterBadges filterParams={filterParams} onClear={clearAllFilters} />

        <div className="flex flex-col gap-4">
          {isLoading ? (
            <TransactionListSkeleton className="flex flex-col gap-4 animate-pulse" />
          ) : transactions.length === 0 ? (
            <TransactionsEmptyState hasFilters={hasFilters} onClear={clearAllFilters} />
          ) : (
            groupLedgerTransactions(transactions).map(tx => (
              <TransactionListRow
                key={tx.id}
                tx={tx}
                expandedGroups={expandedGroups}
                onToggleGroup={toggleGroup}
                onOpenDetails={openTransactionDetails}
                onEdit={(id) => openTransactionForm(id)}
                onDelete={setDeleteId}
              />
            ))
          )}
        </div>

        {/* F5/P2: Pagination Controls */}
        <ListPagination
          currentPage={currentPage}
          totalCount={totalCount}
          isLoadingMore={isLoadingMore}
          onPageChange={goToPage}
        />
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteTransactionDialog
        open={!!deleteId}
        isDeleting={isDeleting}
        onCancel={() => setDeleteId(null)}
        onConfirm={confirmDelete}
      />

      {/* Advanced Filter Modal */}
      <AdvancedFilterDialog
        open={isFilterModalOpen}
        onOpenChange={setIsFilterModalOpen}
        tempFilters={tempFilters}
        onChange={setTempFilters}
        onApply={applyFilters}
        onClearAll={clearAllFilters}
      />
    </div>
  );
}

export default function TransactionsClient() {
  return (
    <Suspense fallback={<TransactionListSkeleton className="flex flex-col gap-4 animate-pulse p-8" />}>
      <TransactionsList />
    </Suspense>
  );
}
