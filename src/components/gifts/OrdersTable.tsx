"use client";

import React, { useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";
import { MoreVertical, Loader2, Image as ImageIcon, Edit2, Trash2, Filter, Download } from "lucide-react";
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getProductIcon } from "@/lib/productIcons";

interface Order {
  id: string;
  product: {
    id: string;
    name: string;
    iconName?: string;
  };
  quantity: number;
  status: string;
  clientName: string;
  clientPhone: string | null;
  createdAt: string;
  transactions: any[];
  orderNumber?: string | null;
  customData?: any;
}

interface OrdersTableProps {
  orders: Order[];
  onOrderUpdated: () => void;
}

const STATUS_MAP: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
  PENDING: { label: "PENDING", dot: "bg-orange-500", bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200" },
  PROCESSING: { label: "IN PRODUCTION", dot: "bg-slate-500", bg: "bg-slate-200", text: "text-slate-700", border: "border-slate-300" },
  READY: { label: "READY FOR PICKUP", dot: "bg-amber-600", bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
  DELIVERED: { label: "DELIVERED", dot: "bg-blue-300", bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200" },
};

export default function OrdersTable({ orders, onOrderUpdated }: OrdersTableProps) {
  const router = useRouter();
  const { openGiftOrderDetails } = useGlobalForm();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    
    setDeletingId(orderId);
    try {
      const res = await fetch(`/api/gifts/orders/${orderId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Order deleted successfully");
      onOrderUpdated();
    } catch (err) {
      toast.error("Failed to delete order");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      <div className="flex items-center justify-between p-4 sm:p-6 pb-4">
        <h3 className="text-[1.15rem] sm:text-[1.35rem] font-extrabold text-slate-800 tracking-tight">Active Gift Orders</h3>
        {orders.length > 0 && (
          <div className="flex gap-2 sm:gap-3">
            <button className="flex items-center justify-center p-2 sm:px-4 sm:py-2 bg-white rounded-lg text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors" title="Filter">
              <Filter className="w-4 h-4 sm:hidden" />
              <span className="hidden sm:block text-sm font-semibold">Filter</span>
            </button>
          </div>
        )}
      </div>
      
      <div className="w-full overflow-x-auto">
        <table className="hidden sm:table w-full text-sm text-left whitespace-nowrap sm:whitespace-normal md:whitespace-nowrap">
          <thead className="text-[0.65rem] sm:text-[0.7rem] text-slate-400 font-bold uppercase tracking-widest bg-slate-50/50">
            <tr>
              <th className="px-4 sm:px-6 py-3 sm:py-4">Client & Product</th>
              <th className="hidden md:table-cell px-6 py-4">Order ID</th>
              <th className="hidden md:table-cell px-6 py-4">Placement</th>
              <th className="px-4 sm:px-6 py-3 sm:py-4">Status</th>
              <th className="px-4 sm:px-6 py-3 sm:py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/50">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const statusStyle = STATUS_MAP[order.status] || STATUS_MAP.PENDING;
                const uiProps = getProductIcon(order.product?.id);
                const Icon = uiProps.icon;
                
                return (
                  <tr 
                    key={order.id} 
                    onClick={() => openGiftOrderDetails(order.id)}
                    className="hover:bg-slate-50/80 transition-all duration-300 group cursor-pointer relative z-10"
                  >
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${uiProps.bg} ${uiProps.color}`}>
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
                        </div>
                        <div>
                          <div className="font-bold text-[0.95rem] sm:text-[1.05rem] text-slate-800 tracking-tight flex items-center gap-2 flex-wrap">
                            {order.clientName}
                            <span className="md:hidden text-[0.65rem] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase">{order.orderNumber || `#${order.id.slice(-6)}`}</span>
                          </div>
                          <div className="text-[0.75rem] sm:text-[0.8rem] text-slate-500 font-medium mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span className="truncate max-w-[120px] sm:max-w-none">{order.product?.name}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span>Qty: {order.quantity}</span>
                            <span className="md:hidden w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="md:hidden">{formatDistanceToNowStrict(new Date(order.createdAt))} ago</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="hidden md:table-cell px-6 py-4">
                      <span className="font-bold text-slate-700">{order.orderNumber || `#${order.id.slice(-6).toUpperCase()}`}</span>
                    </td>
                    
                    <td className="hidden md:table-cell px-6 py-4">
                      <div className="text-slate-700 font-medium">
                        {format(new Date(order.createdAt), "MMM dd, yyyy")}
                      </div>
                      <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {formatDistanceToNowStrict(new Date(order.createdAt))} ago
                      </div>
                    </td>
                    
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <div 
                        className={cn(
                          "h-8 flex items-center gap-2 rounded-full px-3 text-[0.7rem] font-bold tracking-wider uppercase border w-fit shadow-sm",
                          statusStyle.bg, statusStyle.text, statusStyle.border
                        )}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full", statusStyle.dot)} />
                        {statusStyle.label}
                      </div>
                    </td>
                    
                    <td className="px-2 sm:px-6 py-3 sm:py-4 text-center">
                      {confirmDeleteId === order.id ? (
                        <div className="flex items-center justify-end sm:justify-center gap-2 animate-[fadeIn_0.2s_ease-out]">
                          <button 
                            onClick={(e) => handleDelete(e, order.id)}
                            disabled={deletingId === order.id}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[0.65rem] uppercase tracking-wider font-bold hover:bg-red-700 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                          >
                            {deletingId === order.id ? <Loader2 size={12} className="animate-spin" /> : "Confirm"}
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[0.65rem] uppercase tracking-wider font-bold hover:bg-slate-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end sm:justify-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); openGiftOrderDetails(order.id); }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View / Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(order.id); }}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Mobile Card List */}
        <div className="sm:hidden flex flex-col divide-y divide-slate-100/50">
          {orders.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500 font-medium">
              No orders found.
            </div>
          ) : (
            orders.map((order) => {
              const statusStyle = STATUS_MAP[order.status] || STATUS_MAP.PENDING;
              return (
                <div 
                  key={order.id}
                  onClick={() => router.push(`/gifts/orders/${order.id}`)}
                  className="p-4 hover:bg-slate-50/80 transition-all duration-300 cursor-pointer flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200/50 flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                        <ImageIcon size={20} strokeWidth={1.5} className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-[0.95rem] text-slate-800 tracking-tight">
                          {order.clientName}
                        </div>
                        <div className="text-[0.75rem] text-slate-500 font-medium mt-0.5">
                          {order.product?.name} • Qty: {order.quantity}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="text-[0.65rem] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                        {order.orderNumber || `#${order.id.slice(-6).toUpperCase()}`}
                      </div>
                      <div 
                        className={cn(
                          "h-5 flex items-center gap-1.5 rounded-full px-2 text-[0.6rem] font-bold tracking-wider uppercase border w-fit",
                          statusStyle.bg, statusStyle.text, statusStyle.border
                        )}
                      >
                        <span className={cn("w-1 h-1 rounded-full", statusStyle.dot)} />
                        {statusStyle.label}
                      </div>
                    </div>
                  </div>
                  
                  {confirmDeleteId === order.id ? (
                    <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-slate-100">
                      <button 
                        onClick={(e) => handleDelete(e, order.id)}
                        disabled={deletingId === order.id}
                        className="px-4 py-2 min-h-[44px] bg-red-600 text-white rounded-lg text-[0.65rem] uppercase tracking-wider font-bold hover:bg-red-700 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        {deletingId === order.id ? <Loader2 size={14} className="animate-spin" /> : "Confirm"}
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                        className="px-4 py-2 min-h-[44px] bg-slate-100 text-slate-600 rounded-lg text-[0.65rem] uppercase tracking-wider font-bold hover:bg-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-4 mt-1 border-t border-slate-50 pt-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); router.push(`/gifts/orders/${order.id}`); }}
                        className="flex items-center justify-center min-h-[44px] min-w-[44px] px-3 gap-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg transition-colors text-[0.7rem] font-semibold uppercase tracking-wider"
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(order.id); }}
                        className="flex items-center justify-center min-h-[44px] min-w-[44px] px-3 gap-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50/50 rounded-lg transition-colors text-[0.7rem] font-semibold uppercase tracking-wider"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {orders.length > 0 && (
        <div className="p-4 sm:p-6 border-t border-slate-100/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-slate-500 font-medium">
          <div>
            Showing <span className="font-bold text-slate-700">1-{orders.length}</span> of <span className="font-bold text-slate-700">{orders.length}</span> active orders
          </div>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
              {"<"}
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
              {">"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
