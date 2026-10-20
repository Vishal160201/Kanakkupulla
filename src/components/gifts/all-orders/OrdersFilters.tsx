"use client";

import { X } from "lucide-react";
import CustomDropdown from "@/components/ui/CustomDropdown";
import CustomDateRangePicker from "@/components/ui/CustomDateRangePicker";
import type { GiftProduct } from "@/types/gifts";

export const STATUS_FILTER_OPTIONS = ["PENDING", "IN PRODUCTION", "READY", "DELIVERED"];
// The DB values are PENDING, PROCESSING, READY, DELIVERED
export const STATUS_DB_MAP: Record<string, string> = {
  "PENDING": "PENDING",
  "IN PRODUCTION": "PROCESSING",
  "READY": "READY",
  "DELIVERED": "DELIVERED"
};
const PAYMENT_OPTIONS = ["PAID", "UNPAID", "PARTIAL"];

export interface DateRangeValue {
  start: Date | null;
  end: Date | null;
}

/** Applied filters: status / product / payment / startDate / endDate (dd/MM/yyyy). */
export type ActiveFilters = Partial<Record<"status" | "product" | "payment" | "startDate" | "endDate", string>>;

interface OrdersFilterPanelProps {
  products: GiftProduct[];
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  paymentFilter: string;
  setPaymentFilter: (v: string) => void;
  productFilter: string;
  setProductFilter: (v: string) => void;
  dateRangeFilter: DateRangeValue;
  setDateRangeFilter: (v: DateRangeValue) => void;
  onApply: () => void;
}

export function OrdersFilterPanel({
  products, statusFilter, setStatusFilter, paymentFilter, setPaymentFilter,
  productFilter, setProductFilter, dateRangeFilter, setDateRangeFilter, onApply,
}: OrdersFilterPanelProps) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg animate-[fadeIn_0.2s_ease-out]">
      <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Filter Orders</h4>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
          <CustomDropdown
            options={["", ...STATUS_FILTER_OPTIONS].map(s => ({ label: s || "All Statuses", value: s }))}
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            placeholder="All Statuses"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Payment Status</label>
          <CustomDropdown
            options={["", ...PAYMENT_OPTIONS].map(p => ({ label: p || "All Payments", value: p }))}
            value={paymentFilter}
            onChange={(val) => setPaymentFilter(val)}
            placeholder="All Payments"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Product</label>
          <CustomDropdown
            options={[{ label: "All Products", value: "" }, ...products.map(p => ({ label: p.name, value: p.id }))]}
            value={productFilter}
            onChange={(val) => setProductFilter(val)}
            placeholder="All Products"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Date Range</label>
          <CustomDateRangePicker
            value={dateRangeFilter}
            onChange={(val) => setDateRangeFilter(val)}
          />
        </div>

      </div>
      <div className="mt-6 flex justify-end">
        <button type="button" onClick={onApply} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
          Apply Filters
        </button>
      </div>
    </div>
  );
}

interface ActiveFilterPillsProps {
  activeFilters: ActiveFilters;
  getProductName: (id: string) => string;
  onRemove: (key: keyof ActiveFilters) => void;
}

export function ActiveFilterPills({ activeFilters, getProductName, onRemove }: ActiveFilterPillsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">Active:</span>
      {activeFilters.status && (
        <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
          Status: {activeFilters.status}
          <button type="button" aria-label="Remove status filter" onClick={() => onRemove('status')} className="hover:bg-indigo-200 p-0.5 rounded-full"><X size={12}/></button>
        </div>
      )}
      {activeFilters.payment && (
        <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
          Payment: {activeFilters.payment}
          <button type="button" aria-label="Remove payment filter" onClick={() => onRemove('payment')} className="hover:bg-green-200 p-0.5 rounded-full"><X size={12}/></button>
        </div>
      )}
      {activeFilters.product && (
        <div className="flex items-center gap-1.5 bg-fuchsia-50 border border-fuchsia-100 text-fuchsia-700 px-3 py-1 rounded-full text-xs font-bold">
          Product: {getProductName(activeFilters.product)}
          <button type="button" aria-label="Remove product filter" onClick={() => onRemove('product')} className="hover:bg-fuchsia-200 p-0.5 rounded-full"><X size={12}/></button>
        </div>
      )}
      {(activeFilters.startDate || activeFilters.endDate) && (
        <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">
          Date: {activeFilters.startDate || '*'} - {activeFilters.endDate || '*'}
          <button type="button" aria-label="Remove date filter" onClick={() => onRemove('startDate')} className="hover:bg-orange-200 p-0.5 rounded-full"><X size={12}/></button>
        </div>
      )}
    </div>
  );
}
