"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PlusCircle, ShoppingBag, Loader2 } from "lucide-react";

interface OrderFormProps {
  products: any[];
  onOrderCreated: () => void;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function OrderForm({ products, onOrderCreated }: OrderFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const { data: layoutData } = useSWR("/api/settings/layouts/GIFT_ORDER_FORM", fetcher);
  const layoutSchema = layoutData?.schema;

  useEffect(() => {
    if (isOpen) {
      setFormData({});
    }
  }, [isOpen]);

  const standardFieldMap: Record<string, string> = {
    fld_g_product: 'productId',
    fld_g_quantity: 'quantity',
    fld_g_amount: 'amount',
    fld_g_advance: 'advanceAmount',
    fld_g_due: 'dueAmount',
    fld_g_payment_mode: 'paymentMode',
    fld_g_client_name: 'clientName',
    fld_g_client_phone: 'clientPhone'
  };

  const evaluateVisibility = (rule: any) => {
    if (!rule || !rule.fieldId) return true;
    const depFieldName = standardFieldMap[rule.fieldId] || rule.fieldId;
    let depValue = formData[depFieldName];
    
    // Reverse map productId to product name for rule evaluation since rules are configured with names
    if (depFieldName === 'productId' && depValue) {
      const p = products.find((prod: any) => prod.id === depValue);
      if (p) depValue = p.name;
    }
    
    if (rule.operator === 'EQUALS') return depValue === rule.value;
    if (rule.operator === 'NOT_EQUALS') return depValue !== rule.value;
    if (rule.operator === 'CONTAINS') {
      if (typeof depValue === 'string') return depValue.includes(rule.value);
      if (Array.isArray(depValue)) return depValue.includes(rule.value);
      return false;
    }
    return true;
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    const key = standardFieldMap[fieldId] || fieldId;
    
    // If selecting a product name, we need to map it to the actual product ID for the backend
    if (key === 'productId') {
      const selectedProd = products.find(p => p.name.toLowerCase() === value.toLowerCase());
      setFormData(prev => ({ ...prev, [key]: selectedProd?.id || value }));
      // Also store the raw product name in customData just in case
      setFormData(prev => ({ ...prev, rawProductName: value }));
    } else {
      setFormData(prev => {
        const next = { ...prev, [key]: value };
        if (key === 'amount' || key === 'advanceAmount') {
          const t = Number(next.amount) || 0;
          const a = Number(next.advanceAmount) || 0;
          next.dueAmount = Math.max(0, t - a).toString();
        }
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    let hasError = false;
    if (layoutSchema && layoutSchema.sections) {
      layoutSchema.sections.forEach((section: any) => {
        if (!evaluateVisibility(section.visibilityRule)) return;
        section.fields.forEach((field: any) => {
          if (!evaluateVisibility(field.visibilityRule)) return;
          const key = standardFieldMap[field.id] || field.id;
          if (field.mandatory && !formData[key]) {
            toast.error(`${field.name} is required`);
            hasError = true;
          }
        });
      });
    }

    if (hasError) return;

    setIsSubmitting(true);
    
    const payload: any = {
      productId: formData.productId,
      quantity: Number(formData.quantity) || 1,
      clientName: formData.clientName || "Unknown",
      clientPhone: formData.clientPhone,
      amount: Number(formData.amount) || 0,
      advanceAmount: formData.advanceAmount ? Number(formData.advanceAmount) : undefined,
      dueAmount: formData.dueAmount ? Number(formData.dueAmount) : undefined,
      createTransaction: true,
      paymentMode: formData.paymentMode || "Cash",
      customData: {}
    };

    // Populate customData with anything that isn't a standard field
    Object.keys(formData).forEach(key => {
      if (!Object.values(standardFieldMap).includes(key) && key !== 'rawProductName') {
        payload.customData[key] = formData[key];
      }
    });

    try {
      const res = await fetch("/api/gifts/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to create order");
      
      toast.success("Order created successfully!");
      setIsOpen(false);
      onOrderCreated();
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: any) => {
    const key = standardFieldMap[field.id] || field.id;
    let value = formData[key] || "";
    
    // Reverse map productId to product name for the PickList UI
    if (key === 'productId' && value) {
      const p = products.find(prod => prod.id === value);
      if (p) value = p.name;
    }

    if (field.type === 'PICK_LIST' || field.type === 'STATUS_PICKER') {
      const options = field.options || field.statusOptions?.map((o: any) => o.label) || [];
      return (
        <Select value={value} onValueChange={(val) => handleFieldChange(field.id, val)}>
          <SelectTrigger className="w-full h-[45px] px-4 rounded-xl border-slate-200 focus:ring-blue-500 bg-white">
            <SelectValue placeholder={`Select ${field.name}`} />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200 shadow-xl">
            {options.map((opt: string) => (
              <SelectItem key={opt} value={opt} className="cursor-pointer font-medium py-2">{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (field.type === 'CHECKBOX') {
      return (
        <div className="flex items-center h-[45px] w-full rounded-xl border border-gray-200 bg-white px-4">
          <label className="flex items-center gap-3 cursor-pointer w-full h-full">
            <input 
              type="checkbox" 
              checked={!!value}
              onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              className="w-5 h-5 accent-blue-600 rounded border-gray-300 cursor-pointer" 
            />
            <span className="text-[0.95rem] text-slate-700 font-medium">{field.name}</span>
          </label>
        </div>
      );
    }

    const typeAttr = field.type === 'NUMBER' || field.type === 'CURRENCY' ? 'number' : (field.type === 'PHONE' ? 'tel' : 'text');
    
    return (
      <div className="relative">
        <Input 
          type={typeAttr}
          value={value}
          onChange={(e) => handleFieldChange(field.id, e.target.value)}
          className={`h-[45px] px-4 rounded-xl border-slate-200 bg-white text-[0.95rem] focus-visible:ring-blue-500 ${
            typeAttr === 'number' ? '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none' : ''
          }`}
          placeholder={field.placeholder || `Enter ${field.name}`}
        />
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger 
        render={<Button className="gap-2 bg-[#8C5E2D] hover:bg-[#734A21] text-white rounded-xl shadow-lg transition-all active:scale-95" />}
      >
        <PlusCircle size={18} />
        <span>New Order</span>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px] bg-slate-50 rounded-2xl border-none shadow-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="p-6 pb-5 bg-white border-b border-gray-100 shrink-0">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <ShoppingBag className="text-blue-500" />
            Create Gift Order
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto p-6 flex-1">
          <form id="dynamic-gift-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
            {!layoutSchema ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="animate-spin text-slate-400 mb-2" size={24} />
                <p className="text-slate-500 text-sm">Loading form...</p>
              </div>
            ) : (
              layoutSchema.sections?.map((section: any) => {
                if (!evaluateVisibility(section.visibilityRule)) return null;

                return (
                  <div key={section.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                      {section.icon && <i className={`ph-fill ${section.icon} text-orange-500`}></i>}
                      {section.title}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {section.fields.map((field: any) => {
                        if (!evaluateVisibility(field.visibilityRule)) return null;

                        return (
                          <div key={field.id} className="space-y-1">
                            <label className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider">
                              {field.name} {field.mandatory && <span className="text-red-500">*</span>}
                            </label>
                            {renderField(field)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </form>
        </div>

        <DialogFooter className="p-6 bg-white border-t border-gray-100 shrink-0 gap-3">
          <DialogClose render={<Button variant="ghost" className="rounded-xl font-semibold text-slate-600 hover:bg-slate-100 px-6" />}>
            Cancel
          </DialogClose>
          <Button 
            type="submit" 
            form="dynamic-gift-form"
            disabled={isSubmitting || !layoutSchema}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white min-w-[140px] shadow-md transition-all active:scale-95 font-semibold"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Create Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
