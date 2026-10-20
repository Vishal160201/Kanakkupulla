"use client";

import CustomMultiDropdown from "@/components/ui/CustomMultiDropdown";
import { FieldError, FieldLabel, type TransactionFieldProps } from "./FieldChrome";
import { optionLabel, optionValue, splitSelection, textValue } from "./transactionFormUtils";
import { Tooltip } from "@/components/ui/Tooltip";

/** Single amount input (hidden when several categories split the amount). */
export function AmountField({ field, fieldName, form, errors, setField }: TransactionFieldProps) {
  const isError = !!errors[fieldName];
  if (splitSelection(form.category).length > 1) return null;

  return (
    <div>
      <FieldLabel field={field} />
      <div className={`bg-white rounded-2xl border p-4 flex items-center gap-3 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all shadow-sm ${isError ? "border-red-400" : "border-slate-200 focus-within:border-orange-400"}`}>
        <span className="text-2xl font-medium text-slate-400">₹</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={textValue(form[fieldName])}
          onChange={(e) => setField(fieldName)(e.target.value)}
          placeholder="0.00"
          className="w-full bg-transparent border-none outline-none text-4xl font-extrabold text-slate-900 placeholder:text-slate-200 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
        />
      </div>
      <FieldError message={errors[fieldName]} />
    </div>
  );
}

/** Multi-select dropdown; with several picks, also renders one amount input per category. */
export function MultiSelectField({ field, fieldName, form, errors, setField, withCategoryAmounts = false }: TransactionFieldProps & { withCategoryAmounts?: boolean }) {
  const opts = field.options || [];
  const selectedArray = splitSelection(form[fieldName] || '');
  const legacyOpts = selectedArray.filter((s) => !opts.some((o) => optionValue(o) === s));
  const allOpts = [...opts, ...legacyOpts];

  return (
    <div>
      <FieldLabel field={field} />
      <CustomMultiDropdown
        options={allOpts.map(optionLabel)}
        value={selectedArray}
        onChange={(val) => setField(fieldName)(Array.isArray(val) ? val.join(', ') : val)}
        error={!!errors[fieldName]}
        placeholder={`Select ${field.name}...`}
      />
      <FieldError message={errors[fieldName]} />

      {withCategoryAmounts && selectedArray.length > 1 && (
         <div className="mt-4 space-y-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
           <div className="flex items-center justify-between mb-3">
             <label className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase">Amounts per category</label>
             <div className="text-xs font-bold text-slate-700 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">
               Total: <span className="text-emerald-600">₹{selectedArray.reduce((acc, cat) => acc + (parseFloat(textValue(form[`amount_${cat}`]) || "0") || 0), 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
             </div>
           </div>
           {selectedArray.map((cat) => {
             const err = errors[`amount_${cat}`];
             return (
             <div key={cat} className="flex items-center gap-3">
               <Tooltip content={cat}>
                 <div className="text-sm font-bold text-slate-700 w-1/3 truncate bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-100">{cat}</div>
               </Tooltip>
               <div className={`flex-1 bg-white rounded-xl border px-3 py-2 flex items-center gap-2 focus-within:ring-2 focus-within:ring-orange-500/20 shadow-sm ${err ? 'border-red-400 focus-within:border-red-400' : 'border-slate-200 focus-within:border-orange-400'}`}>
                 <span className="text-slate-400 font-medium">₹</span>
                 <input
                   type="number"
                   min="0"
                   step="0.01"
                   value={textValue(form[`amount_${cat}`])}
                   onChange={(e) => setField(`amount_${cat}`)(e.target.value)}
                   placeholder="0.00"
                   aria-label={`Amount for ${cat}`}
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
