"use client";

import FileAttachment, { type AttachmentValue } from "@/components/ui/FileAttachment";
import { Input } from "@/components/ui/input";
import DatePickerInput from "@/components/ui/DatePickerInput";
import TimePickerInput from "@/components/ui/TimePickerInput";
import CustomDropdown from "@/components/ui/CustomDropdown";
import type { GiftLayoutField, GiftProduct } from "@/types/gifts";
import { fieldKey, type OrderFormData } from "./orderFormLogic";
import Checkbox from "@/components/ui/Checkbox";

interface OrderFormFieldProps {
  field: GiftLayoutField;
  formData: OrderFormData;
  products: GiftProduct[];
  driveStatus?: { connected: boolean };
  onChange: (fieldId: string, value: unknown) => void;
}

const DEFAULT_PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Card"];

/** Renders the input for one GIFT_ORDER_FORM layout field. */
export default function OrderFormField({ field, formData, products, driveStatus, onChange }: OrderFormFieldProps) {
  const key = fieldKey(field.id);
  const value = formData[key] || "";
  const stringValue = value as string;

  if (key === 'productId') {
    const options = products.map((p) => ({ label: p.name, value: p.id }));
    return (
      <CustomDropdown
        options={options}
        value={stringValue}
        onChange={(val) => onChange(field.id, val)}
        placeholder={`Select ${field.name}`}
        className="mt-1"
      />
    );
  }

  if (key === 'paymentMode') {
    const options = field.options && field.options.length > 0 ? field.options : DEFAULT_PAYMENT_MODES;
    return (
      <CustomDropdown
        options={options}
        value={stringValue}
        onChange={(val) => onChange(field.id, val)}
        placeholder={`Select ${field.name}`}
        className="mt-1"
      />
    );
  }

  if (field.type === 'PICK_LIST' || field.type === 'STATUS_PICKER' || field.id === 'fld_g_size' || field.name.toLowerCase() === 'size') {
    const options = field.options || field.statusOptions?.map((o) => o.label) || [];
    return (
      <CustomDropdown
        options={options}
        value={stringValue}
        onChange={(val) => onChange(field.id, val)}
        placeholder={`Select ${field.name}`}
        className="mt-1"
      />
    );
  }

  if (field.type === 'CHECKBOX') {
    return (
      <div className="flex items-center h-[45px] w-full rounded-xl border border-gray-200 bg-white px-4">
        <Checkbox
          checked={!!value}
          onChange={(checked) => onChange(field.id, checked)}
          tone="blue"
          label={field.name}
          className="w-full h-full gap-3"
          labelClassName="text-[0.95rem] text-slate-700 font-medium"
        />
      </div>
    );
  }

  if (field.type === 'DATE') {
    return (
      <div className="flex flex-col gap-2 w-full">
        <DatePickerInput
          value={stringValue}
          onChange={(dateStr) => onChange(field.id, dateStr)}
          placeholder={`Select ${field.name.toLowerCase()}...`}
          disableFutureDates={!!field.restrictFutureDate}
        />
      </div>
    );
  }

  if (field.type === 'TIME') {
    return (
      <div className="flex flex-col gap-2 w-full">
        <TimePickerInput
          value={stringValue}
          onChange={(timeStr) => onChange(field.id, timeStr)}
          placeholder={`Select ${field.name.toLowerCase()}...`}
        />
      </div>
    );
  }

  if (field.type === 'IMAGE' || field.type === 'FILE') {
    const categoryName = products.find((p) => p.id === (formData.fld_g_product || formData.productId))?.name || "Uncategorized";
    return (
      <FileAttachment
        id={field.id}
        type={field.type}
        value={value}
        onChange={(vals: AttachmentValue[]) => onChange(field.id, vals)}
        driveStatus={driveStatus}
        moduleName="Gifts & Frames"
        categoryName={categoryName}
      />
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
        value={stringValue}
        onChange={(e) => onChange(field.id, e.target.value)}
        onWheel={(e) => {
          if (typeAttr === 'number') {
            (e.target as HTMLInputElement).blur();
          }
        }}
        className={`h-[45px] px-4 rounded-xl border-slate-200 bg-white text-[0.95rem] ${typeAttr === 'number' ? '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none' : ''
          }`}
        placeholder={field.placeholder || `Enter ${field.name}`}
      />
    </div>
  );
}
