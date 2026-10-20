"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import DatePickerInput from "@/components/ui/DatePickerInput";
import { toast } from "sonner";
import { PlusCircle, ShoppingBag, Loader2 } from "lucide-react";
import type { GiftLayoutResponse, GiftLayoutSchema, GiftProduct } from "@/types/gifts";
import OrderFormField from "./order-form/OrderFormField";
import {
  applyFieldChange,
  buildOrderPayload,
  fieldKey,
  isRecordDateBackdated,
  isRuleVisible,
  validateOrderForm,
  type GiftOrderPayload,
  type OrderFormData,
} from "./order-form/orderFormLogic";

interface OrderFormProps {
  products: GiftProduct[];
  onOrderCreated: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultProductId?: string | null;
}

interface OrderFormBodyProps {
  products: GiftProduct[];
  layoutSchema: GiftLayoutSchema | null | undefined;
  driveStatus?: { connected: boolean };
  defaultProductId?: string | null;
  onCreated: () => void;
}

/**
 * Header, form and footer of the dialog. Lives inside DialogContent, which only mounts
 * while the dialog is open, so every opening starts from a fresh form.
 */
function OrderFormBody({ products, layoutSchema, driveStatus, defaultProductId, onCreated }: OrderFormBodyProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<OrderFormData>(() => (defaultProductId ? { productId: defaultProductId } : {}));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [advanceDate, setAdvanceDate] = useState<string | null>(null);

  const evaluateVisibility = (rule: Parameters<typeof isRuleVisible>[0]) => isRuleVisible(rule, formData);

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormData(prev => applyFieldChange(prev, fieldId, value, products, layoutSchema));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const { errors: newErrors, hasError } = validateOrderForm(layoutSchema, formData);
    setErrors(newErrors);
    if (hasError) return;

    setIsSubmitting(true);

    let payload: GiftOrderPayload;
    try {
      payload = await buildOrderPayload(formData, products, layoutSchema, advanceDate);
    } catch (err) {
      toast.error((err instanceof Error && err.message) || "Failed to upload file");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/gifts/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to create order");

      toast.success("Order created successfully!");
      onCreated();
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBackdated = useMemo(() => isRecordDateBackdated(layoutSchema, formData), [layoutSchema, formData]);

  return (
    <>
      <DialogHeader className="p-4 sm:p-6 pb-4 sm:pb-5 bg-white border-b border-gray-100 shrink-0">
        <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
          <ShoppingBag className="text-blue-500 w-5 h-5 sm:w-6 sm:h-6" />
          Create Gift Order
        </DialogTitle>
      </DialogHeader>

      <div className="overflow-y-auto p-6 flex-1">
        <form id="dynamic-gift-form" noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
          {!layoutSchema ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="animate-spin text-slate-400 mb-2" size={24} />
              <p className="text-slate-500 text-sm">Loading form...</p>
            </div>
          ) : (
            layoutSchema.sections?.map((section) => {
              const sectionRule = section.visibility || section.visibilityRule;
              if (!evaluateVisibility(sectionRule)) return null;

              return (
                <div key={section.id} className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm">
                  <h3 className="text-[0.95rem] sm:text-base font-bold text-slate-800 flex items-center gap-2 mb-3 sm:mb-4">
                    {section.icon && <i className={`ph-fill ${section.icon} text-orange-500`}></i>}
                    {section.title}
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    {section.fields.map((field) => {
                      const rule = field.visibility || field.visibilityRule;
                      const isVisible = evaluateVisibility(rule);
                      if (field.id === 'fld_g_due' || field.name.toLowerCase().includes('balance paid')) return null;
                      const errorKey = fieldKey(field.id);

                      return (
                        <div
                          key={field.id}
                          className="space-y-1 w-full md:w-[calc(50%-0.5rem)]"
                          style={{ display: isVisible ? 'block' : 'none' }}
                        >
                          <label className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider">
                            {field.name.replace(/referance/i, 'REFERENCE')} {field.mandatory && <span className="text-red-500">*</span>}
                          </label>
                          <OrderFormField
                            field={field}
                            formData={formData}
                            products={products}
                            driveStatus={driveStatus}
                            onChange={handleFieldChange}
                          />
                          {field.id === 'fld_g_advance' && isBackdated && Number(formData.advanceAmount) > 0 && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex flex-col gap-2 mt-2 animate-in fade-in slide-in-from-top-2">
                              <span className="text-[0.75rem] text-orange-800 font-bold leading-tight">
                                This order will be backdated. When was the advance collected?
                              </span>
                              <DatePickerInput
                                value={advanceDate || ""}
                                onChange={(dateStr) => setAdvanceDate(dateStr)}
                                placeholder="Advance Payment Date"
                              />
                            </div>
                          )}
                          {errors[errorKey] && (
                            <p className="text-red-500 text-[0.75rem] font-medium mt-1">
                              {errors[errorKey]}
                            </p>
                          )}
                        </div>
                      );
                    })}
                    {section.id === 'sec_gift_payment' && (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-[14px] flex flex-col items-end justify-center shadow-inner h-full">
                        <span className="text-[0.7rem] font-extrabold text-orange-600/80 uppercase tracking-[0.5px]">Outstanding Balance</span>
                        <span className="text-[1.3rem] font-extrabold text-orange-600 mt-0.5">₹{(formData.dueAmount as string) || '0.00'}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </form>
      </div>

      <DialogFooter className="p-4 sm:p-6 bg-white border-t border-gray-100 shrink-0 gap-3 sm:gap-4 flex flex-col-reverse sm:flex-row">
        <DialogClose render={
          <Button variant="ghost" className="rounded-xl font-semibold text-slate-600 hover:bg-slate-100 px-6 w-full sm:w-auto">
            Cancel
          </Button>
        } />
        <Button
          type="submit"
          form="dynamic-gift-form"
          disabled={isSubmitting || !layoutSchema}
          className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white min-w-[140px] shadow-md transition-all active:scale-95 font-semibold w-full sm:w-auto"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Create Order"}
        </Button>
      </DialogFooter>
    </>
  );
}

export default function OrderForm({ products, onOrderCreated, open, onOpenChange, defaultProductId }: OrderFormProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalIsOpen;
  const setIsOpen = onOpenChange || setInternalIsOpen;

  const { data: driveStatus } = useSWR("/api/integrations/google", fetcher);
  const { data: layoutData } = useSWR<GiftLayoutResponse>("/api/settings/layouts/GIFT_ORDER_FORM", fetcher);
  const layoutSchema = layoutData?.schema;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={<Button className="w-full sm:w-auto h-11 sm:h-9 gap-2 bg-[#8C5E2D] hover:bg-[#734A21] text-white rounded-xl shadow-lg transition-all active:scale-95" />}
      >
        <PlusCircle size={18} />
        <span>New Order</span>
      </DialogTrigger>

      <DialogContent className="w-[95vw] sm:w-full sm:max-w-[600px] bg-slate-50 rounded-2xl border-none shadow-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <OrderFormBody
          key={defaultProductId ?? ""}
          products={products}
          layoutSchema={layoutSchema}
          driveStatus={driveStatus}
          defaultProductId={defaultProductId}
          onCreated={() => {
            setIsOpen(false);
            onOrderCreated();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
