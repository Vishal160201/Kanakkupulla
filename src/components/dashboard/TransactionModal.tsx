"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import DatePickerInput from "@/components/ui/DatePickerInput";
import TimePickerInput from "@/components/ui/TimePickerInput";
import PillSelect from "@/components/ui/PillSelect";
import CustomDropdown from "@/components/ui/CustomDropdown";
import CustomMultiDropdown from "@/components/ui/CustomMultiDropdown";
import GooglePicker from "@/components/shared/GooglePicker";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import { useRouter, useSearchParams } from "next/navigation";

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface TransactionModalProps {
  editTransaction?: {
    id: string;
    amount: number;
    type: "INCOME" | "EXPENSE";
    date: string;
    category: string;
    paymentMode: string;
    description: string | null;
    status: string;
    customData?: Record<string, any>;
  } | null;
}

const standardFieldMap: Record<string, string> = {
  fld_tx_amount: 'amount',
  fld_tx_type: 'type',
  fld_tx_date: 'date',
  fld_tx_category: 'category',
  fld_tx_mode: 'paymentMode',
  fld_tx_desc: 'description',
};

export default function TransactionModal({ editTransaction }: TransactionModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOpen = true;
  const onClose = () => router.back();
  const onSuccess = () => router.refresh();

  const [form, setForm] = useState<Record<string, any>>({ type: "INCOME", status: "SETTLED" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const { data: driveStatus } = useSWR("/api/integrations/google", fetcher);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusDropdownOpen) {
        const target = e.target as HTMLElement;
        if (!target.closest('.custom-dropdown-container')) {
          setStatusDropdownOpen(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [statusDropdownOpen]);

  const { data: layoutRes } = useSWR("/api/settings/layouts/TRANSACTION_FORM", fetcher);
  const layoutSchema = layoutRes?.schema;

  const isEditMode = !!editTransaction;

  useEffect(() => {
    if (isOpen) {
      if (editTransaction) {
        setForm({
          amount: String(editTransaction.amount),
          type: editTransaction.type,
          date: new Date(editTransaction.date).toISOString(),
          category: editTransaction.category,
          paymentMode: editTransaction.paymentMode,
          description: editTransaction.description || "",
          status: editTransaction.status,
          ...(editTransaction.customData || {})
        });
      } else if (layoutSchema?.sections) {
        const defaultForm: Record<string, any> = { type: "INCOME", status: "SETTLED", date: new Date().toISOString() };
        layoutSchema.sections.forEach((sec: any) => {
          sec.fields.forEach((f: any) => {
            const fname = standardFieldMap[f.id] || f.id;
            if (f.type === "PICK_LIST" && f.options?.length > 0) {
              defaultForm[fname] = f.options[0];
            } else if (f.type === "STATUS_PICKER" && f.statusOptions?.length > 0) {
              defaultForm[fname] = f.statusOptions[0].label;
            } else if (!defaultForm[fname]) {
              defaultForm[fname] = "";
            }
          });
        });
        const urlType = searchParams.get('type');
        const urlCategory = searchParams.get('category');
        if (urlType) defaultForm.type = urlType;
        if (urlCategory) defaultForm.category = urlCategory;
        
        setForm(defaultForm);
      }
      setErrors({});
    }
  }, [isOpen, editTransaction, layoutSchema, searchParams]);

  const set = (key: string) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (layoutSchema?.sections) {
      layoutSchema.sections.forEach((sec: any) => {
        sec.fields.forEach((f: any) => {
          const fname = standardFieldMap[f.id] || f.id;
          if (f.mandatory) {
            const val = form[fname];
            if (val === undefined || val === null || val === "") {
              errs[fname] = `${f.name} is required.`;
            }
          }
        });
      });
    }
    
    // Explicit standard validation if mapped
    const parsedAmount = parseFloat(form.amount || "0");
    if (form.amount !== undefined && (isNaN(parsedAmount) || parsedAmount <= 0)) {
      errs.amount = "Enter a valid positive amount.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setIsSubmitting(true);

    const payload = { ...form };
    if (payload.amount) payload.amount = parseFloat(payload.amount);

    // Apply isRecordDate logic
    if (layoutSchema?.sections) {
      const recordDateField = layoutSchema.sections
        .flatMap((s: any) => s.fields)
        .find((f: any) => f.isRecordDate);
      if (recordDateField) {
        const fname = standardFieldMap[recordDateField.id] || recordDateField.id;
        if (payload[fname]) {
          payload.recordDate = payload[fname];
        }
      }
    }

    try {
      let res: Response;
      if (isEditMode && editTransaction) {
        res = await fetch(`/api/transactions/${editTransaction.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        toast.success(isEditMode ? "Transaction updated!" : "Transaction recorded!", {
          description: `₹${parseFloat(form.amount || "0").toLocaleString("en-IN", { minimumFractionDigits: 2 })} ${form.type?.toLowerCase()} on ${new Date(form.date || Date.now()).toLocaleDateString("en-IN")}`,
        });
        
        // Revalidate SWR caches for transactions
        mutate((key: any) => typeof key === 'string' && key.startsWith('/api/transactions'));
        
        onSuccess();
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 422 && data.errors) {
          setErrors(data.errors);
          toast.error("Please fix the highlighted fields.");
        } else {
          toast.error(data.error || "Failed to save. Please try again.");
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const evaluateVisibility = (rule: any) => {
    if (!rule || !rule.fieldId) return true;
    const depFieldName = standardFieldMap[rule.fieldId] || rule.fieldId;
    const depValue = form[depFieldName];

    // Support both new rule.values and old rule.value
    const ruleValues: string[] = rule.values || (rule.value ? [rule.value] : []);

    if (rule.operator === 'EQUALS') {
      return ruleValues.includes(depValue as string);
    } else if (rule.operator === 'NOT_EQUALS') {
      return !ruleValues.includes(depValue as string);
    } else if (rule.operator === 'CONTAINS') {
      if (typeof depValue === 'string') {
        return ruleValues.some(v => depValue.includes(v));
      }
      if (Array.isArray(depValue)) {
        return ruleValues.some(v => depValue.includes(v));
      }
      return false;
    }
    return true;
  };

  const renderField = (field: any) => {
    const fieldName = standardFieldMap[field.id] || field.id;
    const isError = !!errors[fieldName];

    if (fieldName === "amount") {
      return (
        <div>
          <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">
            {field.name} {field.mandatory && <span className="text-red-500">*</span>}
          </label>
          <div className={`bg-white rounded-2xl border p-4 flex items-center gap-3 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all shadow-sm ${isError ? "border-red-400" : "border-slate-200 focus-within:border-orange-400"}`}>
            <span className="text-2xl font-medium text-slate-400">₹</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form[fieldName] || ""}
              onChange={(e) => set(fieldName)(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent border-none outline-none text-4xl font-extrabold text-slate-900 placeholder:text-slate-200 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
            />
          </div>
          {errors[fieldName] && <p className="text-xs text-red-500 mt-1 font-medium">{errors[fieldName]}</p>}
        </div>
      );
    }

    if (fieldName === "type" || (field.options?.includes("INCOME") && field.options?.includes("EXPENSE"))) {
      return (
        <div>
          <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">
            {field.name} {field.mandatory && <span className="text-red-500">*</span>}
          </label>
          <div className="flex bg-slate-50 rounded-xl border border-slate-200 p-1 h-[45px]">
            <button
              type="button"
              onClick={() => set(fieldName)("INCOME")}
              className={`flex-1 text-sm font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${form[fieldName] === "INCOME" ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30" : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"}`}
            >
              <i className="ph ph-trend-up"></i> Income
            </button>
            <button
              type="button"
              onClick={() => set(fieldName)("EXPENSE")}
              className={`flex-1 text-sm font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${form[fieldName] === "EXPENSE" ? "bg-rose-500 text-white shadow-md shadow-rose-500/30" : "text-slate-500 hover:text-rose-600 hover:bg-rose-50"}`}
            >
              <i className="ph ph-trend-down"></i> Expense
            </button>
          </div>
          {errors[fieldName] && <p className="text-xs text-red-500 mt-1 font-medium">{errors[fieldName]}</p>}
        </div>
      );
    }

    if (field.type === "DATE") {
      const d = form[fieldName] ? new Date(form[fieldName]) : new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

      return (
        <div>
          <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">
            {field.name} {field.mandatory && <span className="text-red-500">*</span>}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <DatePickerInput 
              value={dateStr} 
              onChange={(newDate) => {
                const newD = new Date(`${newDate}T${timeStr}:00`);
                set(fieldName)(newD.toISOString());
              }} 
            />
            <TimePickerInput 
              value={timeStr}
              onChange={(newTime) => {
                const newD = new Date(`${dateStr}T${newTime}:00`);
                set(fieldName)(newD.toISOString());
              }}
            />
          </div>
          {errors[fieldName] && <p className="text-xs text-red-500 mt-1 font-medium">{errors[fieldName]}</p>}
        </div>
      );
    }

    if (field.type === "PICK_LIST") {
      const opts = field.options || [];
      const options = opts.map((o: string) => ({ value: o, label: o }));
      
      const currentValue = form[fieldName];
      if (currentValue && !opts.includes(currentValue)) {
        options.push({ value: currentValue, label: currentValue });
      }
      return (
        <div>
          <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">
            {field.name} {field.mandatory && <span className="text-red-500">*</span>}
          </label>
          <CustomDropdown 
            options={options.map((o: any) => o.value)} 
            value={form[fieldName] || ""} 
            onChange={set(fieldName)} 
            error={!!errors[fieldName]}
            placeholder={`Select ${field.name}...`}
          />
          {errors[fieldName] && <p className="text-xs text-red-500 mt-1 font-medium">{errors[fieldName]}</p>}
        </div>
      );
    }

    if (field.type === "MULTI_LINE") {
      return (
        <div className="col-span-full">
          <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">
            {field.name} {field.mandatory && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={form[fieldName] || ""}
            onChange={(e) => set(fieldName)(e.target.value)}
            placeholder={field.placeholder || `Enter ${field.name}...`}
            className={`w-full bg-white rounded-xl border p-4 outline-none text-sm font-medium text-slate-700 placeholder:text-slate-300 focus:ring-2 focus:ring-orange-500/20 shadow-sm transition-all resize-none h-[90px] ${isError ? "border-red-400" : "border-slate-200 focus:border-orange-400"}`}
          />
          {errors[fieldName] && <p className="text-xs text-red-500 mt-1 font-medium">{errors[fieldName]}</p>}
        </div>
      );
    }

    if (field.type === 'MULTI_SELECT') {
      const opts = field.options || [];
      const currentSelected = form[fieldName] || '';
      const selectedArray = typeof currentSelected === 'string' && currentSelected.trim() ? currentSelected.split(',').map((s:string) => s.trim()) : (Array.isArray(currentSelected) ? currentSelected : []);
      const legacyOpts = selectedArray.filter((s: string) => !opts.some((o: any) => (o.value || o.label || o) === s));
      const allOpts = [...opts, ...legacyOpts];
      
      return (
        <div>
          <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">
            {field.name} {field.mandatory && <span className="text-red-500">*</span>}
          </label>
          <CustomMultiDropdown
            options={allOpts.map((opt: any) => opt.label || opt.value || opt)}
            value={selectedArray}
            onChange={(val: any) => set(fieldName)(Array.isArray(val) ? val.join(', ') : val)}
            error={!!errors[fieldName]}
            placeholder={`Select ${field.name}...`}
          />
          {errors[fieldName] && <p className="text-xs text-red-500 mt-1 font-medium">{errors[fieldName]}</p>}
        </div>
      );
    }

    if (field.type === 'STATUS_PICKER') {
      const opts = field.statusOptions || [];
      return (
        <div className="relative custom-dropdown-container">
          <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">
            {field.name} {field.mandatory && <span className="text-red-500">*</span>}
          </label>
          <CustomDropdown
            options={opts.map((opt: any) => ({ label: opt.label, value: opt.label, color: opt.color }))}
            value={form[fieldName] || (opts.length > 0 ? opts[0].label : '')}
            onChange={set(fieldName)}
            error={!!errors[fieldName]}
            placeholder={`Select Status...`}
          />
          {errors[fieldName] && <p className="text-xs text-red-500 mt-1 font-medium">{errors[fieldName]}</p>}
        </div>
      );
    }
    
    if (field.type === 'CHECKBOX') {
      return (
        <div className="flex items-center h-[45px] w-full rounded-xl border bg-white px-4 transition-colors border-slate-200 mt-6">
          <label className="flex items-center gap-3 cursor-pointer w-full h-full">
            <input 
              type="checkbox" 
              className="w-5 h-5 accent-orange-500 rounded border-gray-300 cursor-pointer" 
              checked={form[fieldName] === true || form[fieldName] === 'true'}
              onChange={(e) => set(fieldName)(e.target.checked.toString())} 
            />
            <span className="text-[0.95rem] text-slate-600 font-medium select-none">{field.name}</span>
          </label>
        </div>
      );
    }
    
    if (field.type === 'IMAGE' || field.type === 'FILE') {
      const value = form[fieldName];
      const isDriveFile = value?.driveFile;
      
      if (value) {
        return (
          <div className="flex flex-col gap-2">
            <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase">
              {field.name} {field.mandatory && <span className="text-red-500">*</span>}
            </label>
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
              <button type="button" onClick={() => set(fieldName)("")} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
                <i className="ph-bold ph-x"></i>
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="flex flex-col gap-3">
          <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase">
            {field.name} {field.mandatory && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            <input
              type="file"
              accept={field.type === 'IMAGE' ? "image/*" : undefined}
              disabled={uploadProgress[fieldName] !== undefined}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                if (file.size > 10 * 1024 * 1024) {
                  toast.error("File exceeds 10MB limit. Please choose a smaller file.");
                  e.target.value = '';
                  return;
                }

                if (driveStatus?.connected) {
                  setUploadProgress(prev => ({ ...prev, [fieldName]: 0 }));
                  
                  const xhr = new XMLHttpRequest();
                  xhr.open("POST", "/api/integrations/google/upload", true);
                  
                  xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                      const percent = Math.round((event.loaded / event.total) * 100);
                      setUploadProgress(prev => ({ ...prev, [fieldName]: percent }));
                    }
                  };
                  
                  xhr.onload = () => {
                    setUploadProgress(prev => {
                      const next = { ...prev };
                      delete next[fieldName];
                      return next;
                    });
                    
                    if (xhr.status >= 200 && xhr.status < 300) {
                      try {
                        const responseData = JSON.parse(xhr.responseText);
                        set(fieldName)({ driveFile: responseData } as any);
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
                      delete next[fieldName];
                      return next;
                    });
                    toast.error("Network error during upload");
                  };
                  
                  const uploadData = new FormData();
                  uploadData.append("file", file);
                  uploadData.append("module", "Transactions");
                  uploadData.append("category", form.category || "Uncategorized");
                  
                  xhr.send(uploadData);
                } else {
                  const reader = new FileReader();
                  reader.onloadend = () => set(fieldName)(reader.result as any);
                  reader.readAsDataURL(file);
                }
              }}
              className={`h-[45px] w-full px-4 py-2 rounded-xl border bg-white text-[0.95rem] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${isError ? 'border-red-400' : 'border-slate-200'}`}
            />
            {uploadProgress[fieldName] !== undefined && (
              <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-100 rounded-b-xl overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300" 
                  style={{ width: `${uploadProgress[fieldName]}%` }}
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
              onPick={(file) => set(fieldName)({ driveFile: file } as any)} 
              className="w-full justify-center py-2.5 shadow-sm border border-blue-100"
            />
          )}
          {errors[fieldName] && <p className="text-xs text-red-500 mt-1 font-medium">{errors[fieldName]}</p>}
        </div>
      );
    }

    // Default fallback
    return (
      <div>
        <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2">
          {field.name} {field.mandatory && <span className="text-red-500">*</span>}
        </label>
        <input
          type="text"
          value={form[fieldName] || ""}
          onChange={(e) => set(fieldName)(e.target.value)}
          placeholder={field.placeholder || `Enter ${field.name}...`}
          className={`flex h-[45px] w-full rounded-xl border bg-white px-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 shadow-sm ${isError ? "border-red-400" : "border-slate-200"}`}
        />
        {errors[fieldName] && <p className="text-xs text-red-500 mt-1 font-medium">{errors[fieldName]}</p>}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[700px] w-[calc(100vw-2rem)] sm:w-full sm:max-w-[700px] p-0 bg-transparent border-0 shadow-none overflow-visible">
        <div className="bg-slate-50 rounded-3xl overflow-hidden shadow-2xl flex flex-col w-full max-h-[90vh] relative">
          <div className="px-5 sm:px-8 pt-5 sm:pt-7 pb-4 sm:pb-5 bg-white border-b border-slate-100 shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[0.65rem] font-bold text-orange-500 uppercase tracking-[1px]">
                  {isEditMode ? "Edit Record" : "New Record"}
                </span>
                <DialogTitle className="text-[1.5rem] font-extrabold text-slate-900 mt-0.5">
                  {isEditMode ? "Edit Transaction" : "Add Transaction"}
                </DialogTitle>
              </div>
            </div>
          </div>

          <div className="px-5 sm:px-8 py-5 sm:py-6 overflow-y-auto flex-1 min-h-0">
            {layoutSchema?.sections ? (
              layoutSchema.sections.map((section: any) => {
                if (section.visibilityRule && !evaluateVisibility(section.visibilityRule)) return null;
                
                return (
                  <div key={section.id} className="bg-white rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-sm border border-slate-100">
                    <div className="flex flex-col mb-5">
                      <div className="flex items-center gap-2.5 font-extrabold text-[1.1rem] text-slate-900 tracking-tight">
                        <i className={`ph-fill ${section.icon || 'ph-squares-four'} text-orange-500 text-[1.2rem]`}></i> {section.title}
                      </div>
                      {section.description && <div className="text-[0.85rem] text-slate-500 mt-1 font-medium leading-[1.4]">{section.description}</div>}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                      {section.fields.map((field: any) => {
                        if (field.visibilityRule && !evaluateVisibility(field.visibilityRule)) return null;
                        
                        return (
                          <React.Fragment key={field.id}>
                            {renderField(field)}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex justify-center p-10"><i className="ph ph-circle-notch animate-spin text-2xl text-slate-400"></i></div>
            )}
            

          </div>

          <div className="px-5 sm:px-8 py-4 sm:py-5 bg-white border-t border-slate-100 flex justify-end gap-3 z-10 relative shrink-0 rounded-b-3xl">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 py-2.5 rounded-xl font-bold text-sm text-white bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <><i className="ph ph-circle-notch animate-spin"></i> Saving...</>
              ) : (
                <><i className={`ph-bold ${isEditMode ? "ph-pencil-simple" : "ph-floppy-disk"}`}></i> {isEditMode ? "Save Changes" : "Save Transaction"}</>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
