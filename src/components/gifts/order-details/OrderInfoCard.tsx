"use client";

import type React from "react";
import { format } from "date-fns";
import { Calendar, Package, Phone, User } from "lucide-react";
import { getProductIcon } from "@/lib/productIcons";
import DatePickerInput from "@/components/ui/DatePickerInput";
import type { GiftOrder, GiftOrderCustomData } from "@/types/gifts";
import type { GiftOrderEditForm } from "./useGiftOrderDetails";
import { STANDARD_CUSTOM_KEYS, formatCustomFieldValue, isAttachmentValue } from "./orderDetailsConstants";

interface OrderInfoCardProps {
  order: GiftOrder;
  customData: GiftOrderCustomData;
  /** Present only while editing. */
  editForm: GiftOrderEditForm | null;
  setEditForm: (form: GiftOrderEditForm) => void;
}

const LABEL = "text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block";
const INPUT = "w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold focus:border-blue-500 focus:outline-none transition-colors";

function ProductBadge({ productId }: { productId?: string }) {
  const uiProps = getProductIcon(productId);
  const Icon = uiProps.icon;
  return (
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${uiProps.bg} ${uiProps.color}`}>
      <Icon size={24} strokeWidth={1.5} />
    </div>
  );
}

function CustomFields({ customData }: { customData: GiftOrderCustomData }) {
  return (
    <>
      {Object.entries(customData).map(([key, val]) => {
        const normalized = key.replace('fld_g_', '').toLowerCase().replace(/_/g, '');
        if (STANDARD_CUSTOM_KEYS.includes(normalized)) return null;
        if (key.startsWith('fld_g_') === false && key !== 'time') return null;
        if (isAttachmentValue(val)) return null;

        const displayName = key.replace('fld_g_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const displayVal = formatCustomFieldValue(val) as React.ReactNode;

        return (
          <div key={key}>
            <label className={LABEL}>{displayName}</label>
            <div className="text-lg font-bold text-slate-800">{displayVal}</div>
          </div>
        );
      })}
    </>
  );
}

export default function OrderInfoCard({ order, customData, editForm, setEditForm }: OrderInfoCardProps) {
  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm flex flex-col h-full print-section col-span-1 lg:col-span-7">
      <h3 className="font-bold text-slate-800 mb-8">Order Details</h3>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Left Column: Client */}
        <div className="xl:border-r border-slate-100 xl:pr-8">
          <div className="flex items-center gap-2 text-sm font-bold text-indigo-800 mb-6">
            <User size={16} /> Client Information
          </div>

          <div className="space-y-6">
            <div>
              <label className={LABEL}>Client Name</label>
              {editForm ? (
                <input
                  type="text"
                  aria-label="Client Name"
                  value={editForm.clientName}
                  onChange={e => setEditForm({...editForm, clientName: e.target.value})}
                  className={INPUT}
                />
              ) : (
                <div className="text-lg font-bold text-slate-800 leading-tight">{order.clientName}</div>
              )}
            </div>

            <div>
              <label className={LABEL}>Phone</label>
              {editForm ? (
                <input
                  type="tel"
                  aria-label="Phone"
                  value={editForm.clientPhone}
                  onChange={e => setEditForm({...editForm, clientPhone: e.target.value})}
                  className={INPUT}
                />
              ) : (
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <Phone size={14} className="text-slate-400" />
                  {order.clientPhone || "Not provided"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Product */}
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-indigo-800 mb-6">
            <Package size={16} /> Product Information
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Product</label>
              <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <ProductBadge productId={order.product?.id} />
                <div>
                  <div className="font-bold text-slate-800">{order.product?.name}</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">ID: {order.product?.id}</div>
                </div>
              </div>
            </div>

            <div>
              <label className={LABEL}>Quantity</label>
              {editForm ? (
                <input
                  type="number"
                  aria-label="Quantity"
                  min="1"
                  value={editForm.quantity}
                  onChange={e => setEditForm({...editForm, quantity: e.target.value})}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  className={`${INPUT} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                />
              ) : (
                <div className="text-lg font-bold text-slate-800">{order.quantity} x</div>
              )}
            </div>

            <div>
              <label className={LABEL}>Due Date</label>

              {editForm ? (
                <div className="w-full">
                  <DatePickerInput
                    value={editForm.dueDate}
                    onChange={(dateStr) => setEditForm({...editForm, dueDate: dateStr})}
                    className="flex h-[44px] w-full items-center justify-between rounded-xl border-2 border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition-colors focus-within:border-blue-500"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <Calendar size={14} className="text-slate-400" />
                  {order.dueDate ? format(new Date(order.dueDate), "MMM dd, yyyy") : "Not set"}
                </div>
              )}
            </div>

            {/* Additional Product Custom Fields (e.g. Size) */}
            <CustomFields customData={customData} />
          </div>
        </div>
      </div>
    </div>
  );
}
