import type { TransactionFormField, TransactionFormState } from "@/types/transactions";

/** Props shared by every layout field renderer in the transaction form. */
export interface TransactionFieldProps {
  field: TransactionFormField;
  fieldName: string;
  form: TransactionFormState;
  errors: Record<string, string>;
  setField: (key: string) => (value: unknown) => void;
}

export function FieldLabel({ field, className = "block text-[10px] font-extrabold text-slate-500 tracking-[1.5px] uppercase mb-2" }: { field: TransactionFormField; className?: string }) {
  return (
    <label className={className}>
      {field.name} {field.mandatory && <span className="text-red-500">*</span>}
    </label>
  );
}

export function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-red-500 mt-1 font-medium">{message}</p> : null;
}
