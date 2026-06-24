"use client";

import React, { useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MoreVertical, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

interface OrdersTableProps {
  orders: Order[];
  onOrderUpdated: () => void;
}

const STATUS_MAP: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
  PENDING: { label: "PENDING", dot: "bg-orange-500", bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200" },
  PROCESSING: { label: "IN PRODUCTION", dot: "bg-slate-500", bg: "bg-slate-200", text: "text-slate-700", border: "border-slate-300" },
  READY: { label: "READY FOR PICKUP", dot: "bg-amber-600", bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
  DELIVERED: { label: "SHIPPED", dot: "bg-blue-300", bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200" },
};

export default function OrdersTable({ orders, onOrderUpdated }: OrdersTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/gifts/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");
      
      toast.success("Status updated successfully");
      onOrderUpdated();
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      <div className="flex items-center justify-between p-6 pb-4">
        <h3 className="text-[1.35rem] font-extrabold text-slate-800 tracking-tight">Active Gift Orders</h3>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white rounded-lg text-sm font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors">
            Filter
          </button>
          <button className="px-4 py-2 bg-white rounded-lg text-sm font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors">
            Export PDF
          </button>
        </div>
      </div>
      
      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-[0.7rem] text-slate-400 font-bold uppercase tracking-widest bg-slate-50/50">
            <tr>
              <th className="px-6 py-4">Client & Product</th>
              <th className="px-6 py-4">Order ID</th>
              <th className="px-6 py-4">Placement</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-center">Actions</th>
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
                
                return (
                  <tr key={order.id} className="hover:bg-white/60 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200/50 flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                          <ImageIcon size={20} strokeWidth={1.5} />
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
                      <span className="font-bold text-slate-700">#{order.id.slice(-6).toUpperCase()}</span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-slate-700 font-medium">
                        {format(new Date(order.createdAt), "MMM dd, yyyy")}
                      </div>
                      <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {formatDistanceToNowStrict(new Date(order.createdAt))} ago
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      {updatingId === order.id ? (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Loader2 className="animate-spin" size={16} />
                          <span className="text-xs font-bold">UPDATING</span>
                        </div>
                      ) : (
                        <Select 
                          value={order.status} 
                          onValueChange={(val) => handleStatusChange(order.id, val)}
                        >
                          <SelectTrigger 
                            className={cn(
                              "h-8 rounded-full px-3 text-[0.7rem] font-bold tracking-wider uppercase border transition-all w-fit min-w-[140px] shadow-sm",
                              statusStyle.bg, statusStyle.text, statusStyle.border
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className={cn("w-1.5 h-1.5 rounded-full", statusStyle.dot)} />
                              <SelectValue />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PENDING">PENDING</SelectItem>
                            <SelectItem value="PROCESSING">IN PRODUCTION</SelectItem>
                            <SelectItem value="READY">READY FOR PICKUP</SelectItem>
                            <SelectItem value="DELIVERED">SHIPPED</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      <div className="p-6 border-t border-slate-100/50 flex items-center justify-between text-sm text-slate-500 font-medium">
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
    </div>
  );
}
