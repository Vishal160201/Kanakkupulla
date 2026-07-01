"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import DatePickerInput from "@/components/ui/DatePickerInput";
import TimePickerInput from "@/components/ui/TimePickerInput";
import CustomDropdown from "@/components/ui/CustomDropdown";
import CustomMultiDropdown from "@/components/ui/CustomMultiDropdown";
import FileAttachment from "@/components/ui/FileAttachment";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import { uploadFileToDrive } from "@/lib/uploadHelper";

import { useGlobalForm } from "@/components/providers/GlobalFormProvider";

const fetcher = (url: string) => fetch(url).then(res => res.json());

const standardFieldMap: Record<string, string> = {
  fld_tx_amount: 'amount',
  fld_tx_type: 'type',
  fld_tx_date: 'date',
  fld_tx_category: 'category',
  fld_tx_mode: 'paymentMode',
  fld_tx_desc: 'description',
};

import { Suspense } from "react";

function TransactionModalInner() {
  const { isTransactionFormOpen, transactionToEditId, transactionInitialData, closeTransactionForm } = useGlobalForm();
  
  const isBulkEdit = typeof transactionToEditId === 'string' && transactionToEditId.startsWith('grp_');
  const fetchUrl = transactionToEditId 
    ? (isBulkEdit ? `/api/transactions/bulk/${transactionToEditId}` : `/api/transactions/${transactionToEditId}`) 
    : null;

  const { data: fetchRes, isLoading: isTxLoading } = useSWR(
    fetchUrl,
    fetcher
  );
  
  const fetchedTransaction = fetchRes?.transaction || transactionInitialData;
  const editTransaction = transactionToEditId ? fetchedTransaction : null;

  const router = useRouter();
  const searchParams = useSearchParams();
  const isOpen = isTransactionFormOpen;
  
  const onClose = () => {
    closeTransactionForm();
  };
  
  const onSuccess = () => {
    mutate(
      (key: any) => typeof key === 'string' && key.startsWith('/api/transactions'),
      undefined,
      { revalidate: true }
    );
    mutate('/api/dashboard/overview');
    closeTransactionForm();
  };

  const [form, setForm] = useState<Record<string, any>>({ type: "INCOME", status: "SETTLED" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null);
  
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
    if (isOpen && !isTxLoading) {
      if (editTransaction) {
        const { customData, ...rest } = editTransaction;
        const formState: any = {
          amount: String(editTransaction.amount),
          type: editTransaction.type,
          date: new Date(editTransaction.date).toISOString(),
          category: editTransaction.category,
          paymentMode: editTransaction.paymentMode,
          description: editTransaction.description || "",
          status: editTransaction.status,
          ...(editTransaction.customData || {})
        };
        
        if (editTransaction.items && Array.isArray(editTransaction.items)) {
          editTransaction.items.forEach((item: any) => {
            formState[`amount_${item.category}`] = String(item.amount);
          });
        }
        
        setForm(formState);
      } else if (layoutSchema?.sections) {
        const defaultForm: Record<string, any> = { type: "INCOME", status: "SETTLED", date: new Date().toISOString() };
        layoutSchema.sections.forEach((sec: any) => {
          sec.fields.forEach((f: any) => {
            const fname = standardFieldMap[f.id] || f.id;
            if ((f.type === "PICK_LIST" || f.type === "MULTI_PICKLIST") && f.options?.length > 0) {
              if (fname !== "category") {
                defaultForm[fname] = f.options[0];
              } else {
                defaultForm[fname] = "";
              }
            } else if (f.type === "STATUS_PICKER" && f.statusOptions?.length > 0) {
              defaultForm[fname] = f.statusOptions[0].label;
            } else if (!defaultForm[fname]) {
              defaultForm[fname] = "";
            }
          });
        });
        const urlType = searchParams.get('type') || transactionInitialData?.type;
        const urlCategory = searchParams.get('category') || transactionInitialData?.category;
        if (urlType) defaultForm.type = urlType;
        if (urlCategory) defaultForm.category = urlCategory;
        
        setForm(defaultForm);
      }
      setErrors({});
    }
  }, [isOpen, editTransaction, isTxLoading, layoutSchema, searchParams, transactionInitialData]);

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
    
    const selectedCategoryArray = typeof form.category === 'string' && form.category.trim() ? form.category.split(',').map((s:string) => s.trim()) : (Array.isArray(form.category) ? form.category : []);

    if (selectedCategoryArray.length > 1) {
      let allValid = true;
      selectedCategoryArray.forEach((cat: string) => {
        const catAmount = parseFloat(form[`amount_${cat}`] || "0");
        if (isNaN(catAmount) || catAmount <= 0) {
          errs[`amount_${cat}`] = "Required";
          allValid = false;
        }
      });
      if (!allValid) {
        errs.category = "Enter valid amounts for all selected categories.";
      }
      delete errs.amount;
    } else {
      const parsedAmount = parseFloat(form.amount || "0");
      if (form.amount !== undefined && (isNaN(parsedAmount) || parsedAmount <= 0)) {
        errs.amount = "Enter a valid positive amount.";
      }
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

    try {
      const uploadPromises = [];
      for (const key in payload) {
        const value = payload[key];
        if (typeof window !== 'undefined' && (value instanceof File || value instanceof Blob)) {
          uploadPromises.push(
            uploadFileToDrive(value as File, 'Transactions', payload.category || 'Uncategorized', payload.date)
              .then(uploaded => ({ key, uploaded }))
          );
        }
      }
      
      const uploadResults = await Promise.all(uploadPromises);
      for (const result of uploadResults) {
        payload[result.key] = result.uploaded.driveFile;
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file");
      setIsSubmitting(false);
      return;
    }

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
      const selectedCategoryArray = typeof payload.category === 'string' && payload.category.trim() ? payload.category.split(',').map((s:string) => s.trim()) : (Array.isArray(payload.category) ? payload.category : []);

      if (selectedCategoryArray.length > 1 && !isEditMode) {
        // Bulk creation
        const bulkPayload = selectedCategoryArray.map((cat: string) => {
          const catPayload = { ...payload };
          catPayload.category = cat;
          catPayload.amount = parseFloat(catPayload[`amount_${cat}`] || "0");
          selectedCategoryArray.forEach((c: string) => delete catPayload[`amount_${c}`]);
          return catPayload;
        });

        res = await fetch("/api/transactions/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bulkPayload),
        });
      } else {
        if (isEditMode && editTransaction) {
          const isGroupEdit = typeof editTransaction.id === 'string' && editTransaction.id.startsWith('grp_');
          if (isGroupEdit) {
            const bulkPayload = selectedCategoryArray.map((cat: string) => {
              const catPayload = { ...payload };
              catPayload.category = cat;
              catPayload.amount = parseFloat(catPayload[`amount_${cat}`] || "0");
              selectedCategoryArray.forEach((c: string) => delete catPayload[`amount_${c}`]);
              return catPayload;
            });
            res = await fetch(`/api/transactions/bulk/${editTransaction.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(bulkPayload),
            });
          } else {
            res = await fetch(`/api/transactions/${editTransaction.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
          }
        } else {
          res = await fetch("/api/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
      }

      if (res.ok) {
        toast.success(isEditMode ? "Transaction updated!" : (selectedCategoryArray.length > 1 ? "Transactions recorded!" : "Transaction recorded!"), {
          description: selectedCategoryArray.length > 1 
            ? `Recorded ${selectedCategoryArray.length} items on ${new Date(form.date || Date.now()).toLocaleDateString("en-IN")}`
            : `₹${parseFloat(form.amount || "0").toLocaleString("en-IN", { minimumFractionDigits: 2 })} ${form.type?.toLowerCase()} on ${new Date(form.date || Date.now()).toLocaleDateString("en-IN")}`,
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
      toast.error("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const evaluateVisibility = (rule: any) => {
    if (!rule) return true;
    
    const dependsOnKey = rule.dependsOn || rule.fieldId;
    if (!dependsOnKey) return true;
    
    const depFieldName = standardFieldMap[dependsOnKey] || dependsOnKey;
    const depValue = form[depFieldName] !== undefined 
      ? form[depFieldName] 
      : (form as any)[dependsOnKey];

    const ruleValues: string[] = rule.values || (rule.value ? [rule.value] : []);

    if (rule.dependsOn || rule.fieldId) {
    }

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
    
    // For pure dependsOn + values format without operator
    if (rule.dependsOn && Array.isArray(rule.values) && !rule.operator) {
      return rule.values.includes(depValue);
    }
    
    return true;
  };

  const renderField = (field: any) => {
    const fieldName = standardFieldMap[field.id] || field.id;
    const isError = !!errors[fieldName];

    if (fieldName === "amount") {
      const selectedCategoryArray = typeof form.category === 'string' && form.category.trim() ? form.category.split(',').map((s:string) => s.trim()) : (Array.isArray(form.category) ? form.category : []);
      if (selectedCategoryArray.length > 1) return null;

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
              disableFutureDates={!!field.restrictFutureDate}
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

    if (fieldName === 'category') {
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
          
          {selectedArray.length > 1 && (
             <div className="mt-4 space-y-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
               <div className="flex items-center justify-between mb-3">
                 <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase">Amounts per category</label>
                 <div className="text-xs font-bold text-slate-700 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">
                   Total: <span className="text-emerald-600">₹{selectedArray.reduce((acc: number, cat: string) => acc + (parseFloat(form[`amount_${cat}`] || "0") || 0), 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                 </div>
               </div>
               {selectedArray.map((cat: string) => {
                 const err = errors[`amount_${cat}`];
                 return (
                 <div key={cat} className="flex items-center gap-3">
                   <div className="text-sm font-bold text-slate-700 w-1/3 truncate bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-100" title={cat}>{cat}</div>
                   <div className={`flex-1 bg-white rounded-xl border px-3 py-2 flex items-center gap-2 focus-within:ring-2 focus-within:ring-orange-500/20 shadow-sm ${err ? 'border-red-400 focus-within:border-red-400' : 'border-slate-200 focus-within:border-orange-400'}`}>
                     <span className="text-slate-400 font-medium">₹</span>
                     <input
                       type="number"
                       min="0"
                       step="0.01"
                       value={form[`amount_${cat}`] || ""}
                       onChange={(e) => set(`amount_${cat}`)(e.target.value)}
                       placeholder="0.00"
                       className="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-900 placeholder:text-slate-300"
                     />
                   </div>
                 </div>
                 );
               })}
             </div>
          )}
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
      return (
        <div className="flex flex-col gap-2">
          <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase">
            {field.name} {field.mandatory && <span className="text-red-500">*</span>}
          </label>
          <FileAttachment
            id={fieldName}
            type={field.type}
            value={value}
            onChange={(val) => set(fieldName)(val as any)}
            driveStatus={driveStatus}
            moduleName="Transactions"
            categoryName={form.category || "Uncategorized"}
          />
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
        <div className="bg-slate-50 rounded-3xl overflow-hidden shadow-2xl flex flex-col w-full max-h-[90dvh] relative">
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

export default function TransactionModal() {
  return (
    <Suspense fallback={null}>
      <TransactionModalInner />
    </Suspense>
  );
}
