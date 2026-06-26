"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DatePickerInput from "@/components/ui/DatePickerInput";
import CustomDropdown from "@/components/ui/CustomDropdown";
import { toast } from "sonner";
import { PlusCircle, ShoppingBag, Loader2 } from "lucide-react";
import GooglePicker from "@/components/shared/GooglePicker";

interface OrderFormProps {
  products: any[];
  onOrderCreated: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultProductId?: string | null;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function OrderForm({ products, onOrderCreated, open, onOpenChange, defaultProductId }: OrderFormProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalIsOpen;
  const setIsOpen = onOpenChange || setInternalIsOpen;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const { data: driveStatus } = useSWR("/api/integrations/google", fetcher);
  const { data: layoutData } = useSWR("/api/settings/layouts/GIFT_ORDER_FORM", fetcher);
  const layoutSchema = layoutData?.schema;

  useEffect(() => {
    if (isOpen) {
      setFormData(defaultProductId ? { productId: defaultProductId } : {});
      setErrors({});
      setUploadProgress({});
    }
  }, [isOpen, defaultProductId]);

  const standardFieldMap: Record<string, string> = {
    fld_g_product: 'productId',
    fld_g_quantity: 'quantity',
    fld_g_amount: 'amount',
    fld_g_advance: 'advanceAmount',
    fld_g_due: 'dueAmount',
    fld_g_due_date: 'dueDate',
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
    const newErrors: Record<string, string> = {};
    if (layoutSchema && layoutSchema.sections) {
      layoutSchema.sections.forEach((section: any) => {
        if (!evaluateVisibility(section.visibilityRule)) return;
        section.fields.forEach((field: any) => {
          if (!evaluateVisibility(field.visibilityRule)) return;
          const key = standardFieldMap[field.id] || field.id;
          if (field.mandatory && !formData[key]) {
            newErrors[key] = `${field.name} is required`;
            hasError = true;
          }
        });
      });
    }

    setErrors(newErrors);
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
      dueDate: formData.dueDate,
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

    if (key === 'productId') {
      const optionStrings = products.map((p: any) => p.name);
      return (
        <CustomDropdown
          options={optionStrings}
          value={value}
          onChange={(val) => handleFieldChange(field.id, val)}
          placeholder={`Select ${field.name}`}
          className="mt-1"
        />
      );
    }

    if (key === 'paymentMode') {
      const options = field.options?.length > 0 ? field.options : ["Cash", "UPI", "Bank Transfer", "Card"];
      return (
        <CustomDropdown
          options={options}
          value={value}
          onChange={(val) => handleFieldChange(field.id, val)}
          placeholder={`Select ${field.name}`}
          className="mt-1"
        />
      );
    }

    if (field.type === 'PICK_LIST' || field.type === 'STATUS_PICKER' || field.id === 'fld_g_size' || field.name.toLowerCase() === 'size') {
      const options = field.options || field.statusOptions?.map((o: any) => o.label) || [];
      return (
        <CustomDropdown
          options={options}
          value={value}
          onChange={(val) => handleFieldChange(field.id, val)}
          placeholder={`Select ${field.name}`}
          className="mt-1"
        />
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

    if (field.type === 'DATE') {
      return (
        <DatePickerInput
          value={value}
          onChange={(dateStr) => handleFieldChange(field.id, dateStr)}
          placeholder={`Select ${field.name.toLowerCase()}...`}
        />
      );
    }

    if (field.type === 'IMAGE' || field.type === 'FILE') {
      const isDriveFile = value?.driveFile;
      
      if (value) {
        return (
          <div className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-slate-50">
            <div className="flex items-center gap-3 overflow-hidden">
              {isDriveFile ? (
                 <img src={value.driveFile.iconUrl} alt="icon" className="w-6 h-6 object-contain" />
              ) : (
                 <i className="ph-fill ph-file text-2xl text-slate-400"></i>
              )}
              <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">
                {isDriveFile ? value.driveFile.name : "Local File Selected"}
              </span>
            </div>
            <button type="button" onClick={() => handleFieldChange(field.id, null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
              <i className="ph-bold ph-x"></i>
            </button>
          </div>
        );
      }

      return (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Input
              type="file"
              accept={field.type === 'IMAGE' ? "image/*" : undefined}
              disabled={uploadProgress[field.id] !== undefined}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                // Client-side size validation: 10MB limit
                if (file.size > 10 * 1024 * 1024) {
                  toast.error("File exceeds 10MB limit. Please choose a smaller file.");
                  e.target.value = ''; // Reset input
                  return;
                }

                let fileToUpload: File | Blob = file;
                if (file.type.startsWith('image/')) {
                  try {
                    fileToUpload = await new Promise<File | Blob>((resolve) => {
                      const img = new globalThis.Image();
                      img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;
                        if (width > 1200) {
                          height = Math.round((height * 1200) / width);
                          width = 1200;
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx?.drawImage(img, 0, 0, width, height);
                        canvas.toBlob((blob) => {
                          if (blob) {
                            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                          } else {
                            resolve(file);
                          }
                        }, 'image/jpeg', 0.6);
                      };
                      img.onerror = () => resolve(file);
                      img.src = URL.createObjectURL(file);
                    });
                  } catch (err) {
                    console.error("Compression failed", err);
                  }
                }

                if (driveStatus?.connected) {
                  setUploadProgress(prev => ({ ...prev, [field.id]: 0 }));
                  
                  const xhr = new XMLHttpRequest();
                  xhr.open("POST", "/api/integrations/google/upload", true);
                  
                  xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                      const percent = Math.round((event.loaded / event.total) * 100);
                      setUploadProgress(prev => ({ ...prev, [field.id]: percent }));
                    }
                  };
                  
                  xhr.onload = () => {
                    setUploadProgress(prev => {
                      const next = { ...prev };
                      delete next[field.id];
                      return next;
                    });
                    
                    if (xhr.status >= 200 && xhr.status < 300) {
                      try {
                        const responseData = JSON.parse(xhr.responseText);
                        handleFieldChange(field.id, { driveFile: responseData });
                        toast.success("File uploaded to Google Drive");
                      } catch (err) {
                        toast.error("Failed to parse upload response");
                      }
                    } else {
                      try {
                        const errData = JSON.parse(xhr.responseText);
                        toast.error(errData.error || "Upload failed");
                      } catch {
                        toast.error("Upload failed");
                      }
                    }
                  };
                  
                  xhr.onerror = () => {
                    setUploadProgress(prev => {
                      const next = { ...prev };
                      delete next[field.id];
                      return next;
                    });
                    toast.error("Network error during upload");
                  };
                  
                  const uploadData = new FormData();
                  uploadData.append("file", fileToUpload);
                  uploadData.append("module", "Gifts & Frames");
                  
                  // Calculate category from selected product
                  const categoryName = products.find((p: any) => p.id === formData.productId)?.name || "Uncategorized";
                  uploadData.append("category", categoryName);
                  
                  xhr.send(uploadData);
                } else {
                  // Fallback to base64 if Drive is not connected
                  const reader = new FileReader();
                  reader.onloadend = () => handleFieldChange(field.id, reader.result);
                  reader.readAsDataURL(fileToUpload);
                }
              }}
              className="h-[45px] px-4 py-2 rounded-xl border-slate-200 bg-white text-[0.95rem] cursor-pointer"
            />
            {uploadProgress[field.id] !== undefined && (
              <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-100 rounded-b-xl overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300" 
                  style={{ width: `${uploadProgress[field.id]}%` }}
                />
              </div>
            )}
          </div>
          {driveStatus?.connected && (
             <div className="flex items-center gap-3">
               <div className="h-px bg-slate-200 flex-1"></div>
               <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">OR</span>
               <div className="h-px bg-slate-200 flex-1"></div>
             </div>
          )}
          {driveStatus?.connected && (
            <GooglePicker 
              onPick={(file) => handleFieldChange(field.id, { driveFile: file })} 
              className="w-full justify-center py-2.5 shadow-sm border border-blue-100"
            />
          )}
        </div>
      );
    }

    let typeAttr = 'text';
    if (field.type === 'NUMBER' || field.type === 'CURRENCY' || field.type === 'DECIMAL' || field.type === 'PERCENTAGE') typeAttr = 'number';
    else if (field.type === 'PHONE') typeAttr = 'tel';
    else if (field.type === 'EMAIL') typeAttr = 'email';

    return (
      <div className="relative">
        <Input
          type={typeAttr}
          value={value}
          onChange={(e) => handleFieldChange(field.id, e.target.value)}
          className={`h-[45px] px-4 rounded-xl border-slate-200 bg-white text-[0.95rem] ${typeAttr === 'number' ? '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none' : ''
            }`}
          placeholder={field.placeholder || `Enter ${field.name}`}
        />
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={<Button className="w-full sm:w-auto gap-2 bg-[#8C5E2D] hover:bg-[#734A21] text-white rounded-xl shadow-lg transition-all active:scale-95" />}
      >
        <PlusCircle size={18} />
        <span>New Order</span>
      </DialogTrigger>

      <DialogContent className="w-[95vw] sm:w-full sm:max-w-[600px] bg-slate-50 rounded-2xl border-none shadow-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="p-4 sm:p-6 pb-4 sm:pb-5 bg-white border-b border-gray-100 shrink-0">
          <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <ShoppingBag className="text-blue-500 w-5 h-5 sm:w-6 sm:h-6" />
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
                  <div key={section.id} className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm">
                    <h3 className="text-[0.95rem] sm:text-base font-bold text-slate-800 flex items-center gap-2 mb-3 sm:mb-4">
                      {section.icon && <i className={`ph-fill ${section.icon} text-orange-500`}></i>}
                      {section.title}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                      {section.fields.map((field: any) => {
                        if (!evaluateVisibility(field.visibilityRule)) return null;
                        if (field.id === 'fld_g_due') return null;

                        return (
                          <div key={field.id} className="space-y-1">
                            <label className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider">
                              {field.name} {field.mandatory && <span className="text-red-500">*</span>}
                            </label>
                            {renderField(field)}
                            {errors[standardFieldMap[field.id] || field.id] && (
                              <p className="text-red-500 text-[0.75rem] font-medium mt-1">
                                {errors[standardFieldMap[field.id] || field.id]}
                              </p>
                            )}
                          </div>
                        );
                      })}
                      {section.id === 'sec_gift_payment' && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-[14px] flex flex-col items-end justify-center shadow-inner h-full">
                          <span className="text-[0.7rem] font-extrabold text-orange-600/80 uppercase tracking-[0.5px]">Outstanding Balance</span>
                          <span className="text-[1.3rem] font-extrabold text-orange-600 mt-0.5">₹{formData.dueAmount || '0.00'}</span>
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
      </DialogContent>
    </Dialog>
  );
}
