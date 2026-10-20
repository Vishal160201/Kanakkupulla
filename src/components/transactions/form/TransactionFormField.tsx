"use client";

import DatePickerInput from "@/components/ui/DatePickerInput";
import TimePickerInput from "@/components/ui/TimePickerInput";
import CustomDropdown from "@/components/ui/CustomDropdown";
import FileAttachment from "@/components/ui/FileAttachment";
import type { TransactionFormField as FormFieldDef, TransactionFormState } from "@/types/transactions";
import { FieldError, FieldLabel, type TransactionFieldProps } from "./FieldChrome";
import { AmountField, MultiSelectField } from "./CategoryFields";
import { fieldNameOf, optionValue, textValue } from "./transactionFormUtils";

interface TransactionFormFieldProps {
  field: FormFieldDef;
  form: TransactionFormState;
  errors: Record<string, string>;
  setField: (key: string) => (value: unknown) => void;
  driveStatus?: { connected: boolean };
}

function TypeToggleField({ field, fieldName, form, errors, setField }: TransactionFieldProps) {
  return (
    <div>
      <FieldLabel field={field} />
      <div className="flex bg-slate-50 rounded-xl border border-slate-200 p-1 h-[45px]">
        <button
          type="button"
          onClick={() => setField(fieldName)("INCOME")}
          className={`flex-1 text-sm font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${form[fieldName] === "INCOME" ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30" : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"}`}
        >
          <i className="ph ph-trend-up"></i> Income
        </button>
        <button
          type="button"
          onClick={() => setField(fieldName)("EXPENSE")}
          className={`flex-1 text-sm font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${form[fieldName] === "EXPENSE" ? "bg-rose-500 text-white shadow-md shadow-rose-500/30" : "text-slate-500 hover:text-rose-600 hover:bg-rose-50"}`}
        >
          <i className="ph ph-trend-down"></i> Expense
        </button>
      </div>
      <FieldError message={errors[fieldName]} />
    </div>
  );
}

function DateTimeField({ field, fieldName, form, errors, setField }: TransactionFieldProps) {
  const raw = form[fieldName] as string | number | undefined;
  const d = raw ? new Date(raw) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${day}`;
  const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  return (
    <div>
      <FieldLabel field={field} />
      <div className="grid grid-cols-2 gap-3">
        <DatePickerInput
          value={dateStr}
          onChange={(newDate) => {
            const newD = new Date(`${newDate}T${timeStr}:00`);
            setField(fieldName)(newD.toISOString());
          }}
          disableFutureDates={!!field.restrictFutureDate}
        />
        <TimePickerInput
          value={timeStr}
          onChange={(newTime) => {
            const newD = new Date(`${dateStr}T${newTime}:00`);
            setField(fieldName)(newD.toISOString());
          }}
        />
      </div>
      <FieldError message={errors[fieldName]} />
    </div>
  );
}

function PickListField({ field, fieldName, form, errors, setField }: TransactionFieldProps) {
  const opts = field.options || [];
  const options = opts.map((o) => typeof o === 'string' ? o : { label: o.label ?? '', value: optionValue(o) ?? '' });

  const currentValue = form[fieldName];
  if (typeof currentValue === 'string' && currentValue && !opts.includes(currentValue)) {
    options.push(currentValue);
  }
  return (
    <div>
      <FieldLabel field={field} />
      <CustomDropdown
        options={options}
        value={textValue(form[fieldName])}
        onChange={setField(fieldName)}
        error={!!errors[fieldName]}
        placeholder={`Select ${field.name}...`}
      />
      <FieldError message={errors[fieldName]} />
    </div>
  );
}

function StatusPickerField({ field, fieldName, form, errors, setField }: TransactionFieldProps) {
  const opts = field.statusOptions || [];
  return (
    <div className="relative custom-dropdown-container">
      <FieldLabel field={field} />
      <CustomDropdown
        options={opts.map((opt) => ({ label: opt.label, value: opt.label, color: opt.color }))}
        value={textValue(form[fieldName]) || (opts.length > 0 ? opts[0].label : '')}
        onChange={setField(fieldName)}
        error={!!errors[fieldName]}
        placeholder={`Select Status...`}
      />
      <FieldError message={errors[fieldName]} />
    </div>
  );
}

/** Renders one layout field of the transaction form by its type. */
export default function TransactionFormField({ field, form, errors, setField, driveStatus }: TransactionFormFieldProps) {
  const fieldName = fieldNameOf(field.id);
  const isError = !!errors[fieldName];
  const props: TransactionFieldProps = { field, fieldName, form, errors, setField };

  if (fieldName === "amount") return <AmountField {...props} />;

  if (fieldName === "type" || (field.options?.includes("INCOME") && field.options?.includes("EXPENSE"))) {
    return <TypeToggleField {...props} />;
  }

  if (field.type === "DATE") return <DateTimeField {...props} />;

  if (fieldName === 'category') return <MultiSelectField {...props} withCategoryAmounts />;

  if (field.type === "PICK_LIST") return <PickListField {...props} />;

  if (field.type === "MULTI_LINE") {
    return (
      <div className="col-span-full">
        <FieldLabel field={field} />
        <textarea
          value={textValue(form[fieldName])}
          onChange={(e) => setField(fieldName)(e.target.value)}
          placeholder={field.placeholder || `Enter ${field.name}...`}
          className={`w-full bg-white rounded-xl border p-4 outline-none text-sm font-medium text-slate-700 placeholder:text-slate-300 focus:ring-2 focus:ring-orange-500/20 shadow-sm transition-all resize-none h-[90px] ${isError ? "border-red-400" : "border-slate-200 focus:border-orange-400"}`}
        />
        <FieldError message={errors[fieldName]} />
      </div>
    );
  }

  if (field.type === 'MULTI_SELECT') return <MultiSelectField {...props} />;

  if (field.type === 'STATUS_PICKER') return <StatusPickerField {...props} />;

  if (field.type === 'CHECKBOX') {
    return (
      <div className="flex items-center h-[45px] w-full rounded-xl border bg-white px-4 transition-colors border-slate-200 mt-6">
        <label className="flex items-center gap-3 cursor-pointer w-full h-full">
          <input
            type="checkbox"
            className="w-5 h-5 accent-orange-500 rounded border-gray-300 cursor-pointer"
            checked={form[fieldName] === true || form[fieldName] === 'true'}
            onChange={(e) => setField(fieldName)(e.target.checked.toString())}
          />
          <span className="text-[0.95rem] text-slate-600 font-medium select-none">{field.name}</span>
        </label>
      </div>
    );
  }

  if (field.type === 'IMAGE' || field.type === 'FILE') {
    return (
      <div className="flex flex-col gap-2">
        <FieldLabel field={field} className="block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase" />
        <FileAttachment
          id={fieldName}
          type={field.type}
          value={form[fieldName]}
          onChange={(vals) => setField(fieldName)(vals)}
          driveStatus={driveStatus}
          moduleName="Transactions"
          categoryName={textValue(form.category) || "Uncategorized"}
        />
        <FieldError message={errors[fieldName]} />
      </div>
    );
  }

  // Default fallback
  return (
    <div>
      <FieldLabel field={field} />
      <input
        type="text"
        value={textValue(form[fieldName])}
        onChange={(e) => setField(fieldName)(e.target.value)}
        placeholder={field.placeholder || `Enter ${field.name}...`}
        className={`flex h-[45px] w-full rounded-xl border bg-white px-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 shadow-sm ${isError ? "border-red-400" : "border-slate-200"}`}
      />
      <FieldError message={errors[fieldName]} />
    </div>
  );
}
