// Presentational pieces of the ledger list: filter badges, skeleton, empty
// state and pagination.
import type { ListFilterParams } from "./listFilters";
import { PAGE_SIZE } from "./listFilters";

const BADGE_CLASS = "bg-white border border-orange-200 text-orange-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm";

export function ActiveFilterBadges({ filterParams, onClear }: { filterParams: ListFilterParams; onClear: () => void }) {
  const hasActive = filterParams.dateFrom || filterParams.dateTo || filterParams.categories || filterParams.amountMin || filterParams.amountMax || (filterParams.type && filterParams.type !== 'ALL') || (filterParams.paymentMode && filterParams.paymentMode !== 'ALL');
  if (!hasActive) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-6 p-4 bg-orange-50 rounded-2xl border border-orange-100">
      <span className="text-xs font-bold text-orange-500 uppercase tracking-wider flex items-center mr-2"><i className="ph-bold ph-funnel mr-1"></i> Active Filters:</span>
      {filterParams.dateFrom && <span className={BADGE_CLASS}>From: {filterParams.dateFrom}</span>}
      {filterParams.dateTo && <span className={BADGE_CLASS}>To: {filterParams.dateTo}</span>}
      {filterParams.categories && <span className={BADGE_CLASS}>Categories: {filterParams.categories}</span>}
      {filterParams.amountMin && <span className={BADGE_CLASS}>Min: ₹{filterParams.amountMin}</span>}
      {filterParams.amountMax && <span className={BADGE_CLASS}>Max: ₹{filterParams.amountMax}</span>}
      {filterParams.type && filterParams.type !== 'ALL' && <span className={BADGE_CLASS}>Type: {filterParams.type}</span>}
      {filterParams.paymentMode && filterParams.paymentMode !== 'ALL' && <span className={BADGE_CLASS}>Mode: {filterParams.paymentMode}</span>}
      <button type="button" onClick={onClear} className="ml-auto text-xs font-bold text-orange-500 hover:text-orange-700 transition-colors flex items-center gap-1"><i className="ph-bold ph-x"></i> Clear</button>
    </div>
  );
}

export function TransactionListSkeleton({ className }: { className: string }) {
  return (
    <div className={className}>
      {[1,2,3,4,5].map(i => (
        <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-200"></div>
            <div className="space-y-2">
              <div className="h-4 w-32 bg-slate-200 rounded"></div>
              <div className="h-3 w-20 bg-slate-200 rounded"></div>
            </div>
          </div>
          <div className="h-6 w-24 bg-slate-200 rounded"></div>
        </div>
      ))}
    </div>
  );
}

export function TransactionsEmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    // U3: Better empty state with CTA
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
        <i className="ph-bold ph-receipt text-3xl text-orange-400"></i>
      </div>
      <p className="font-bold text-slate-700 text-base mb-1">No transactions found</p>
      <p className="font-medium text-sm text-center max-w-xs">
        {hasFilters
          ? 'No records match your active filters. Try clearing them to see all transactions.'
          : 'Start building your ledger by clicking "Add Transaction" in the top bar.'}
      </p>
      {hasFilters && (
        <button type="button" onClick={onClear} className="mt-4 px-4 py-2 rounded-xl bg-orange-50 text-orange-600 font-bold text-sm hover:bg-orange-100 transition-colors">
          Clear Filters
        </button>
      )}
    </div>
  );
}

interface ListPaginationProps {
  currentPage: number;
  totalCount: number;
  isLoadingMore: boolean;
  onPageChange: (page: number) => void;
}

export function ListPagination({ currentPage, totalCount, isLoadingMore, onPageChange }: ListPaginationProps) {
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  if (totalCount <= PAGE_SIZE) return null;

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-6 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 gap-4">
      <div className="text-[0.8rem] font-bold text-slate-500 uppercase tracking-wider">
        Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} entries
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoadingMore}
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-[0.85rem] text-slate-700 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
        >
          <i className="ph-bold ph-caret-left"></i> Prev
        </button>

        <div className="hidden sm:flex items-center justify-center px-4 font-bold text-[0.85rem] text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm">
          Page {currentPage} of {totalPages}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoadingMore}
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-[0.85rem] text-slate-700 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
        >
          Next <i className="ph-bold ph-caret-right"></i>
        </button>
      </div>
    </div>
  );
}
