"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { format } from "date-fns";
import { Loader2, LayoutGrid, LayoutList, ChevronLeft, ChevronRight, Filter, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";
import type { GiftOrder, GiftOrdersResponse, GiftProduct } from "@/types/gifts";
import { downloadOrdersCSV, downloadOrdersPDF } from "./all-orders/exportOrders";
import { ActiveFilterPills, OrdersFilterPanel, STATUS_DB_MAP, type ActiveFilters, type DateRangeValue } from "./all-orders/OrdersFilters";
import { OrdersGridView, OrdersTableView } from "./all-orders/OrdersViews";

interface AllOrdersListProps {
  products: GiftProduct[];
}

const PAGE_SIZE = 25;

export default function AllOrdersList({ products }: AllOrdersListProps) {
  const { openGiftOrderDetails } = useGlobalForm();

  // Filter State (draft values in the panel; activeFilters drives the query)
  const [statusFilter, setStatusFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeValue>({ start: null, end: null });
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Pagination & View State
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"table" | "grid">("table");

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Build query string based on active filters
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("pageSize", PAGE_SIZE.toString());
    if (activeFilters.status) params.set("status", STATUS_DB_MAP[activeFilters.status] || activeFilters.status);
    if (activeFilters.product) params.set("productId", activeFilters.product);
    if (activeFilters.payment) params.set("paymentStatus", activeFilters.payment);
    if (activeFilters.startDate) params.set("startDate", activeFilters.startDate);
    if (activeFilters.endDate) params.set("endDate", activeFilters.endDate);
    return params.toString();
  }, [activeFilters, page]);

  const { data, isLoading, mutate } = useSWR<GiftOrdersResponse>(`/api/gifts/orders?${queryString}`, fetcher);

  const orders = data?.orders || [];
  const totalCount = data?.totalCount || 0;

  // Apply Filters
  const handleApplyFilters = () => {
    const newFilters: ActiveFilters = {};
    if (statusFilter) newFilters.status = statusFilter;
    if (productFilter) newFilters.product = productFilter;
    if (paymentFilter) newFilters.payment = paymentFilter;

    if (dateRangeFilter.start && dateRangeFilter.end) {
      newFilters.startDate = format(dateRangeFilter.start, "dd/MM/yyyy");
      newFilters.endDate = format(dateRangeFilter.end, "dd/MM/yyyy");
    }

    setActiveFilters(newFilters);
    setPage(1);
    setIsFilterPanelOpen(false);
  };

  const removeFilter = (key: keyof ActiveFilters) => {
    const newFilters = { ...activeFilters };
    delete newFilters[key];
    setActiveFilters(newFilters);

    if (key === 'status') setStatusFilter("");
    if (key === 'product') setProductFilter("");
    if (key === 'payment') setPaymentFilter("");
    if (key === 'startDate' || key === 'endDate') {
      setDateRangeFilter({ start: null, end: null });
      delete newFilters['startDate'];
      delete newFilters['endDate'];
    }

    setPage(1);
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    setStatusFilter("");
    setPaymentFilter("");
    setProductFilter("");
    setDateRangeFilter({ start: null, end: null });
  };

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || id;

  // Exports
  const fetchAllFilteredData = async (): Promise<GiftOrder[]> => {
    const params = new URLSearchParams(queryString);
    params.delete("page");
    params.delete("pageSize");
    const res = await fetch(`/api/gifts/orders?${params.toString()}`);
    const json: GiftOrdersResponse = await res.json();
    return json.orders || [];
  };

  const exportCSV = async () => {
    toast.loading("Preparing CSV...", { id: "csv" });
    downloadOrdersCSV(await fetchAllFilteredData());
    toast.success("CSV Downloaded", { id: "csv" });
  };

  const exportPDF = async () => {
    toast.loading("Preparing PDF...", { id: "pdf" });
    downloadOrdersPDF(await fetchAllFilteredData());
    toast.success("PDF Downloaded", { id: "pdf" });
  };

  const handleDelete = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/gifts/orders/${orderId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Order deleted successfully");
      mutate();
    } catch {
      toast.error("Failed to delete order");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const hasActiveFilters = Object.keys(activeFilters).length > 0;
  const showControlsBar = orders.length > 0 || hasActiveFilters;
  const showExportAndView = orders.length > 0;
  const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 768;

  const viewProps = {
    orders,
    confirmDeleteId,
    setConfirmDeleteId,
    onDelete: handleDelete,
    onOpen: openGiftOrderDetails,
  };

  return (
    <div className="flex flex-col gap-4 animate-[fadeIn_0.3s_ease-out]">
      {/* Controls Bar */}
      {showControlsBar && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/60 backdrop-blur-xl p-4 rounded-2xl border border-white/50 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              aria-expanded={isFilterPanelOpen}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors relative", isFilterPanelOpen ? "bg-slate-800 text-white" : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200")}
            >
              <Filter size={16} /> Filters
              {hasActiveFilters && (
                <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[0.65rem] font-bold h-5 w-5 flex items-center justify-center rounded-full shadow-sm">
                  {Object.keys(activeFilters).length}
                </span>
              )}
            </button>

            {hasActiveFilters && !showExportAndView && (
               <button
                 type="button"
                 onClick={clearAllFilters}
                 className="text-sm font-bold text-slate-500 hover:text-slate-700 ml-2 underline underline-offset-2 transition-colors"
               >
                 Clear filters
               </button>
            )}

            {showExportAndView && (
              <>
                <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block" />
                <div className="bg-slate-100 p-1 rounded-xl flex items-center hidden md:flex">
                  <button
                    type="button"
                    aria-label="Table view"
                    aria-pressed={view === "table"}
                    onClick={() => setView("table")}
                    className={cn("p-1.5 rounded-lg transition-colors", view === "table" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                  >
                    <LayoutList size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label="Grid view"
                    aria-pressed={view === "grid"}
                    onClick={() => setView("grid")}
                    className={cn("p-1.5 rounded-lg transition-colors", view === "grid" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                  >
                    <LayoutGrid size={18} />
                  </button>
                </div>
              </>
            )}
          </div>

          {showExportAndView && (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button type="button" onClick={exportCSV} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors">
                <Download size={16} /> CSV
              </button>
              <button type="button" onClick={exportPDF} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors">
                <Download size={16} /> PDF
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filter Panel */}
      {isFilterPanelOpen && (
        <OrdersFilterPanel
          products={products}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          paymentFilter={paymentFilter}
          setPaymentFilter={setPaymentFilter}
          productFilter={productFilter}
          setProductFilter={setProductFilter}
          dateRangeFilter={dateRangeFilter}
          setDateRangeFilter={setDateRangeFilter}
          onApply={handleApplyFilters}
        />
      )}

      {/* Active Filters Pills */}
      {hasActiveFilters && (
        <ActiveFilterPills activeFilters={activeFilters} getProductName={getProductName} onRemove={removeFilter} />
      )}

      {/* Content */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center animate-[fadeIn_0.3s_ease-out]">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
            <LayoutList size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-700">No orders found</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-sm">Try adjusting your filters to find what you&apos;re looking for.</p>
          {hasActiveFilters && (
            <button type="button" onClick={clearAllFilters} className="mt-6 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="animate-[fadeIn_0.3s_ease-out]">
          {/* Table View */}
          {(view === "table" && (typeof window === 'undefined' || window.innerWidth >= 768)) && (
            <OrdersTableView {...viewProps} />
          )}

          {/* Grid View / Mobile View */}
          {(view === "grid" || isMobileViewport) && (
            <OrdersGridView {...viewProps} isMobile={isMobileViewport} />
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-sm font-medium text-slate-500">
              Showing <span className="font-bold text-slate-800">{orders.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}</span>–<span className="font-bold text-slate-800">{Math.min(page * PAGE_SIZE, totalCount)}</span> of <span className="font-bold text-slate-800">{totalCount}</span> orders
            </div>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <button type="button" onClick={() => setPage(p => p - 1)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-sm font-bold transition-colors">
                  <ChevronLeft size={16} /> Previous
                </button>
              )}
              {totalCount > page * PAGE_SIZE && (
                <button type="button" onClick={() => setPage(p => p + 1)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-sm font-bold transition-colors">
                  Next <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
