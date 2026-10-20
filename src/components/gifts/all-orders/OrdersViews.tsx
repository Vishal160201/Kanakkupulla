"use client";

import type React from "react";
import { format } from "date-fns";
import { Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProductIcon } from "@/lib/productIcons";
import type { GiftOrder } from "@/types/gifts";
import { STATUS_STYLE_MAP, calculatePaymentInfo, orderDisplayId } from "../giftOrderStatus";

export interface OrdersViewProps {
  orders: GiftOrder[];
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  onDelete: (e: React.MouseEvent, orderId: string) => void;
  onOpen: (orderId: string) => void;
}

function ProductIconTile({ productId }: { productId?: string }) {
  const uiProps = getProductIcon(productId);
  const Icon = uiProps.icon;
  return (
    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${uiProps.bg} ${uiProps.color}`}>
      <Icon className="w-5 h-5" strokeWidth={1.5} />
    </div>
  );
}

export function OrdersTableView({ orders, confirmDeleteId, setConfirmDeleteId, onDelete, onOpen }: OrdersViewProps) {
  return (
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
            {orders.map((order) => {
              const statusStyle = STATUS_STYLE_MAP[order.status] || STATUS_STYLE_MAP.PENDING;
              const pay = calculatePaymentInfo(order);

              return (
                <tr
                  key={order.id}
                  onClick={() => onOpen(order.id)}
                  className="hover:bg-slate-50/80 transition-all duration-300 group cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <ProductIconTile productId={order.product?.id} />
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
                    <div className="font-bold text-slate-700">{orderDisplayId(order)}</div>
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
                        <button type="button" onClick={(e) => onDelete(e, order.id)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors">Confirm</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" aria-label="View / edit order" onClick={(e) => { e.stopPropagation(); onOpen(order.id); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                        <button type="button" aria-label="Delete order" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(order.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
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
  );
}

export function OrdersGridView({ orders, confirmDeleteId, setConfirmDeleteId, onDelete, onOpen, isMobile }: OrdersViewProps & { isMobile: boolean }) {
  return (
    <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-2 md:grid")}>
       {orders.map((order) => {
         const statusStyle = STATUS_STYLE_MAP[order.status] || STATUS_STYLE_MAP.PENDING;
         const pay = calculatePaymentInfo(order);
         const dueAmount = pay.totalAmount - pay.paidAmount;

         return (
          <div
            key={order.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(order.id)}
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen(order.id);
              }
            }}
            className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer flex flex-col gap-4 relative group"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <ProductIconTile productId={order.product?.id} />
                <div>
                  <div className="font-bold text-[1.05rem] text-slate-800 tracking-tight">{order.clientName}</div>
                  <div className="text-[0.75rem] text-slate-500 font-medium">{order.product?.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[0.75rem] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">{orderDisplayId(order)}</div>
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
                  <button type="button" onClick={(e) => onDelete(e, order.id)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[0.65rem] font-bold hover:bg-red-700 transition-colors">Confirm</button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[0.65rem] font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                </div>
              ) : (
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button type="button" aria-label="View / edit order" onClick={(e) => { e.stopPropagation(); onOpen(order.id); }} className="p-1.5 bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"><Edit2 size={14}/></button>
                   <button type="button" aria-label="Delete order" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(order.id); }} className="p-1.5 bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-red-600 rounded-lg transition-colors"><Trash2 size={14}/></button>
                </div>
              )}
          </div>
         );
       })}
    </div>
  );
}
