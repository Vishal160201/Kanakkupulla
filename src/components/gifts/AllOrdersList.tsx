"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { Loader2, LayoutGrid, LayoutList, ChevronLeft, ChevronRight, X, Filter, Download, Edit2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getProductIcon } from "@/lib/productIcons";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import CustomDropdown from "../ui/CustomDropdown";
import CustomDateRangePicker from "../ui/CustomDateRangePicker";
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";

interface AllOrdersListProps {
  products: any[];
}

const STATUS_OPTIONS = ["PENDING", "IN PRODUCTION", "READY", "DELIVERED"];
// The DB values are PENDING, PROCESSING, READY, DELIVERED
const STATUS_DB_MAP: any = {
  "PENDING": "PENDING",
  "IN PRODUCTION": "PROCESSING",
  "READY": "READY",
  "DELIVERED": "DELIVERED"
};

const PAYMENT_OPTIONS = ["PAID", "UNPAID", "PARTIAL"];

const STATUS_STYLE_MAP: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
  PENDING: { label: "PENDING", dot: "bg-orange-500", bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200" },
  PROCESSING: { label: "IN PRODUCTION", dot: "bg-slate-500", bg: "bg-slate-200", text: "text-slate-700", border: "border-slate-300" },
  READY: { label: "READY FOR PICKUP", dot: "bg-amber-600", bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
  DELIVERED: { label: "SHIPPED", dot: "bg-blue-300", bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200" },
};

export default function AllOrdersList({ products }: AllOrdersListProps) {
  const router = useRouter();
  const { openGiftOrderDetails } = useGlobalForm();
  
  // Filter State
  const [statusFilter, setStatusFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Pagination & View State
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"table" | "grid">("table");
  const pageSize = 25;

  // Build query string based on active filters
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("pageSize", pageSize.toString());
    if (activeFilters.status) params.set("status", STATUS_DB_MAP[activeFilters.status] || activeFilters.status);
    if (activeFilters.product) params.set("productId", activeFilters.product);
    if (activeFilters.payment) params.set("paymentStatus", activeFilters.payment);
    if (activeFilters.startDate) params.set("startDate", activeFilters.startDate);
    if (activeFilters.endDate) params.set("endDate", activeFilters.endDate);
    return params.toString();
  }, [activeFilters, page]);

  const { data, isLoading, mutate } = useSWR(`/api/gifts/orders?${queryString}`, (url: string) => fetch(url).then(res => res.json()));
  
  const orders = data?.orders || [];
  const totalCount = data?.totalCount || 0;

  // Apply Filters
  const handleApplyFilters = () => {
    const newFilters: any = {};
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

  const removeFilter = (key: string) => {
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

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || id;

  // Exports
  const fetchAllFilteredData = async () => {
    const params = new URLSearchParams(queryString);
    params.delete("page");
    params.delete("pageSize");
    const res = await fetch(`/api/gifts/orders?${params.toString()}`);
    const json = await res.json();
    return json.orders || [];
  };

  const calculatePaymentInfo = (order: any) => {
    const totalAmount = parseFloat(order.customData?.amount || '0');
    const paidAmount = (order.transactions || [])
      .filter((t: any) => t.type === 'INCOME')
      .reduce((sum: number, t: any) => sum + t.amount, 0);
    
    let pStatus = "UNPAID";
    if (paidAmount >= totalAmount && totalAmount > 0) pStatus = "PAID";
    else if (paidAmount > 0) pStatus = "PARTIAL";

    return { totalAmount, paidAmount, pStatus };
  };

  const exportCSV = async () => {
    toast.loading("Preparing CSV...", { id: "csv" });
    const allOrders = await fetchAllFilteredData();
    
    const headers = ["Order ID", "Client Name", "Phone", "Product", "Quantity", "Total Amount", "Advance Paid", "Due Amount", "Payment Status", "Order Status", "Due Date", "Created Date"];
    const rows = allOrders.map((o: any) => {
      const pay = calculatePaymentInfo(o);
      const dueAmount = pay.totalAmount - pay.paidAmount;
      return [
        o.orderNumber || `#${o.id.slice(-6).toUpperCase()}`,
        o.clientName,
        o.clientPhone || "",
        o.product?.name || "",
        o.quantity,
        pay.totalAmount,
        pay.paidAmount,
        dueAmount > 0 ? dueAmount : 0,
        pay.pStatus,
        STATUS_STYLE_MAP[o.status]?.label || o.status,
        o.customData?.dueDate ? format(new Date(o.customData.dueDate), "dd/MM/yyyy") : "",
        format(new Date(o.createdAt), "dd/MM/yyyy")
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders_export_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("CSV Downloaded", { id: "csv" });
  };

  const exportPDF = async () => {
    toast.loading("Preparing PDF...", { id: "pdf" });
    const allOrders = await fetchAllFilteredData();
    
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Orders Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 22);

    const tableData = allOrders.map((o: any) => {
      const pay = calculatePaymentInfo(o);
      return [
        o.orderNumber || `#${o.id.slice(-6).toUpperCase()}`,
        format(new Date(o.createdAt), "dd/MM/yyyy"),
        o.clientName,
        o.product?.name || "",
        STATUS_STYLE_MAP[o.status]?.label || o.status,
        `${pay.totalAmount}`,
        pay.pStatus
      ];
    });

    autoTable(doc, {
      startY: 30,
      head: [["Order ID", "Date", "Client", "Product", "Status", "Amount", "Payment"]],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [40, 40, 40] }
    });

    doc.save(`orders_export_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF Downloaded", { id: "pdf" });
  };

  // Delete Handlers
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    setDeletingId(orderId);
    try {
      const res = await fetch(`/api/gifts/orders/${orderId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Order deleted successfully");
      mutate();
    } catch (err) {
      toast.error("Failed to delete order");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const hasActiveFilters = Object.keys(activeFilters).length > 0;
  const showControlsBar = orders.length > 0 || hasActiveFilters;
  const showExportAndView = orders.length > 0;

  return (
    <div className="flex flex-col gap-4 animate-[fadeIn_0.3s_ease-out]">
      {/* Controls Bar */}
      {showControlsBar && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/60 backdrop-blur-xl p-4 rounded-2xl border border-white/50 shadow-sm">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
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
                 onClick={() => {
                   setActiveFilters({});
                   setStatusFilter("");
                   setProductFilter("");
                   setPaymentFilter("");
                   setDateRangeFilter({ start: null, end: null });
                 }}
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
                    onClick={() => setView("table")}
                    className={cn("p-1.5 rounded-lg transition-colors", view === "table" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                  >
                    <LayoutList size={18} />
                  </button>
                  <button 
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
              <button onClick={exportCSV} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors">
                <Download size={16} /> CSV
              </button>
              <button onClick={exportPDF} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors">
                <Download size={16} /> PDF
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filter Panel */}
      {isFilterPanelOpen && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg animate-[fadeIn_0.2s_ease-out]">
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Filter Orders</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
              <CustomDropdown
                options={["", ...STATUS_OPTIONS].map(s => ({ label: s || "All Statuses", value: s }))}
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
            <button onClick={handleApplyFilters} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Active Filters Pills */}
      {Object.keys(activeFilters).length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">Active:</span>
          {activeFilters.status && (
            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
              Status: {activeFilters.status}
              <button onClick={() => removeFilter('status')} className="hover:bg-indigo-200 p-0.5 rounded-full"><X size={12}/></button>
            </div>
          )}
          {activeFilters.payment && (
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
              Payment: {activeFilters.payment}
              <button onClick={() => removeFilter('payment')} className="hover:bg-green-200 p-0.5 rounded-full"><X size={12}/></button>
            </div>
          )}
          {activeFilters.product && (
            <div className="flex items-center gap-1.5 bg-fuchsia-50 border border-fuchsia-100 text-fuchsia-700 px-3 py-1 rounded-full text-xs font-bold">
              Product: {getProductName(activeFilters.product)}
              <button onClick={() => removeFilter('product')} className="hover:bg-fuchsia-200 p-0.5 rounded-full"><X size={12}/></button>
            </div>
          )}
          {(activeFilters.startDate || activeFilters.endDate) && (
            <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">
              Date: {activeFilters.startDate || '*'} - {activeFilters.endDate || '*'}
              <button onClick={() => removeFilter('startDate')} className="hover:bg-orange-200 p-0.5 rounded-full"><X size={12}/></button>
            </div>
          )}
        </div>
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
          <p className="text-slate-500 text-sm mt-1 max-w-sm">Try adjusting your filters to find what you're looking for.</p>
          {Object.keys(activeFilters).length > 0 && (
            <button onClick={() => { setActiveFilters({}); setStatusFilter(""); setPaymentFilter(""); setProductFilter(""); setDateRangeFilter({ start: null, end: null }); }} className="mt-6 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="animate-[fadeIn_0.3s_ease-out]">
          {/* Table View */}
          {(view === "table" && (typeof window === 'undefined' || window.innerWidth >= 768)) && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden md:block hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[0.7rem] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Client & Product</th>
                      <th className="px-6 py-4">Order ID</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Payment</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((order: any) => {
                      const statusStyle = STATUS_STYLE_MAP[order.status] || STATUS_STYLE_MAP.PENDING;
                      const uiProps = getProductIcon(order.product?.id);
                      const Icon = uiProps.icon;
                      const pay = calculatePaymentInfo(order);

                      return (
                        <tr 
                          key={order.id} 
                          onClick={() => openGiftOrderDetails(order.id)}
                          className="hover:bg-slate-50/80 transition-all duration-300 group cursor-pointer"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${uiProps.bg} ${uiProps.color}`}>
                                <Icon className="w-5 h-5" strokeWidth={1.5} />
                              </div>
                              <div>
                                <div className="font-bold text-[1.05rem] text-slate-800 tracking-tight">
                                  {order.clientName}
                                </div>
                                <div className="text-[0.8rem] text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                                  <span>{order.product?.name}</span>
                                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                  <span>Qty: {order.quantity}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-700">{order.orderNumber || `#${order.id.slice(-6).toUpperCase()}`}</div>
                            <div className="text-[0.7rem] text-slate-400 font-bold uppercase mt-1">{format(new Date(order.createdAt), "dd MMM, yyyy")}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className={cn("h-7 flex items-center gap-1.5 rounded-full px-3 text-[0.65rem] font-bold tracking-wider uppercase border w-fit shadow-sm", statusStyle.bg, statusStyle.text, statusStyle.border)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", statusStyle.dot)} />
                              {statusStyle.label}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="text-[0.85rem] font-black text-slate-700">₹{pay.totalAmount}</div>
                              <div className={cn("text-[0.65rem] font-bold uppercase tracking-widest w-fit px-2 py-0.5 rounded-full", pay.pStatus === 'PAID' ? 'bg-green-100 text-green-700' : pay.pStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}>
                                {pay.pStatus}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {confirmDeleteId === order.id ? (
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={(e) => handleDelete(e, order.id)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors">Confirm</button>
                                <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); openGiftOrderDetails(order.id); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(order.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Grid View / Mobile View */}
          {(view === "grid" || (typeof window !== 'undefined' && window.innerWidth < 768)) && (
            <div className={cn("grid gap-4", typeof window !== 'undefined' && window.innerWidth < 768 ? "grid-cols-1" : "grid-cols-2 md:grid")}>
               {orders.map((order: any) => {
                 const statusStyle = STATUS_STYLE_MAP[order.status] || STATUS_STYLE_MAP.PENDING;
                 const uiProps = getProductIcon(order.product?.id);
                 const Icon = uiProps.icon;
                 const pay = calculatePaymentInfo(order);
                 const dueAmount = pay.totalAmount - pay.paidAmount;

                 return (
                  <div key={order.id} onClick={() => openGiftOrderDetails(order.id)} className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer flex flex-col gap-4 relative group">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${uiProps.bg} ${uiProps.color}`}>
                          <Icon className="w-5 h-5" strokeWidth={1.5} />
                        </div>
                        <div>
                          <div className="font-bold text-[1.05rem] text-slate-800 tracking-tight">{order.clientName}</div>
                          <div className="text-[0.75rem] text-slate-500 font-medium">{order.product?.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[0.75rem] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">{order.orderNumber || `#${order.id.slice(-6).toUpperCase()}`}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <div className={cn("h-6 flex items-center gap-1.5 rounded-full px-2 text-[0.6rem] font-bold tracking-wider uppercase border w-fit shadow-sm", statusStyle.bg, statusStyle.text, statusStyle.border)}>
                        <span className={cn("w-1 h-1 rounded-full", statusStyle.dot)} />
                        {statusStyle.label}
                      </div>
                      <div className={cn("h-6 flex items-center px-2 text-[0.6rem] font-bold tracking-wider uppercase border w-fit shadow-sm rounded-full", pay.pStatus === 'PAID' ? 'bg-green-50 border-green-200 text-green-700' : pay.pStatus === 'PARTIAL' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-red-50 border-red-200 text-red-700')}>
                        {pay.pStatus}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 p-3 bg-slate-50 rounded-xl">
                      <div>
                        <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider">Total</div>
                        <div className="text-[0.95rem] font-black text-slate-800">₹{pay.totalAmount}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider">Due</div>
                        <div className={cn("text-[0.95rem] font-black", dueAmount > 0 ? "text-red-600" : "text-green-600")}>
                          ₹{dueAmount > 0 ? dueAmount : 0}
                        </div>
                      </div>
                    </div>
                    
                    {confirmDeleteId === order.id ? (
                        <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-slate-100 animate-[fadeIn_0.2s_ease-out]">
                          <button onClick={(e) => handleDelete(e, order.id)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[0.65rem] font-bold hover:bg-red-700 transition-colors">Confirm</button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[0.65rem] font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                        </div>
                      ) : (
                        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={(e) => { e.stopPropagation(); openGiftOrderDetails(order.id); }} className="p-1.5 bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"><Edit2 size={14}/></button>
                           <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(order.id); }} className="p-1.5 bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-red-600 rounded-lg transition-colors"><Trash2 size={14}/></button>
                        </div>
                      )}
                  </div>
                 );
               })}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-sm font-medium text-slate-500">
              Showing <span className="font-bold text-slate-800">{orders.length > 0 ? (page - 1) * pageSize + 1 : 0}</span>–<span className="font-bold text-slate-800">{Math.min(page * pageSize, totalCount)}</span> of <span className="font-bold text-slate-800">{totalCount}</span> orders
            </div>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <button onClick={() => setPage(p => p - 1)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-sm font-bold transition-colors">
                  <ChevronLeft size={16} /> Previous
                </button>
              )}
              {totalCount > page * pageSize && (
                <button onClick={() => setPage(p => p + 1)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-sm font-bold transition-colors">
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
