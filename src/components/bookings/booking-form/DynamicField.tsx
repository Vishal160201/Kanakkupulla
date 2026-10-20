"use client";

import type { ComponentProps } from "react";
import type { UseFormReturn } from "react-hook-form";
import CustomDropdown from "@/components/ui/CustomDropdown";
import CustomMultiDropdown from "@/components/ui/CustomMultiDropdown";
import Autocomplete from "@/components/ui/Autocomplete";
import UserPicklist from "@/components/ui/UserPicklist";
import MultiUserPicklist, { type UserItem } from "@/components/ui/MultiUserPicklist";
import DatePickerInput from "@/components/ui/DatePickerInput";
import TimePickerInput from "@/components/ui/TimePickerInput";
import FileAttachment from "@/components/ui/FileAttachment";
import type { BookingFormData } from "@/lib/validations/booking";
import type { LayoutField } from "@/types/bookings";
import { STANDARD_FIELD_MAP } from "../layoutUtils";

const locationSuggestions: string[] = [];

const inputClass = (isError: boolean) =>
  `flex h-[45px] w-full rounded-xl border bg-white px-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${isError ? 'border-red-500' : 'border-gray-200'}`;

interface DynamicFieldProps {
  field: LayoutField;
  form: UseFormReturn<BookingFormData>;
  users: UserItem[];
  driveStatus?: { connected: boolean };
  categoryName: string;
}

/** Input for one layout field, chosen by field type. */
export default function DynamicField({ field, form, users, driveStatus, categoryName }: DynamicFieldProps) {
  const { register, watch, setValue, formState: { errors } } = form;
  const fieldName = STANDARD_FIELD_MAP[field.id] || field.id;
  const isError = !!errors[fieldName];
  // Layout fields hold strings (or string lists); values are read back as stored.
  const current = watch(fieldName);

  if (field.id === 'fld_b_client') {
    return (
      <input type="text" autoComplete="new-password" className={inputClass(isError)} {...register(fieldName, { required: field.mandatory })} placeholder={field.placeholder || "e.g. Rahul Sharma"} />
    );
  }
  if (field.id === 'fld_b_location') {
    return (
      <Autocomplete suggestions={locationSuggestions} value={(current as string) || ''} onChange={val => setValue(fieldName, val, { shouldValidate: true })} placeholder={field.placeholder || "e.g. Grand Hyatt, City"} error={isError} />
    );
  }
  if (field.type === 'DATE') {
    return (
      <DatePickerInput value={(current as string) || ''} onChange={(date) => setValue(fieldName, date, { shouldValidate: true })} placeholder={field.placeholder || "Select Date..."} disableFutureDates={!!field.restrictFutureDate} />
    );
  }
  if (field.type === 'TIME') {
    return (
      <TimePickerInput value={(current as string) || ''} onChange={(time) => setValue(fieldName, time, { shouldValidate: true })} placeholder={field.placeholder || "e.g. HH:MM AM/PM"} hasError={isError} />
    );
  }
  if (field.type === 'PICK_LIST') {
    // Options are passed through as stored in the layout (strings, or legacy option objects).
    const opts = (field.options || []) as ComponentProps<typeof CustomDropdown>['options'];
    return (
      <CustomDropdown
        options={opts}
        value={(current || (opts.length > 0 ? opts[0] : '')) as string}
        onChange={(val) => setValue(fieldName, val, { shouldValidate: true })}
        error={isError}
        placeholder={`Select ${field.name}...`}
      />
    );
  }

  if (field.type === 'MULTI_SELECT') {
    const opts = field.options || [];
    const currentSelected = current || '';
    const selectedArray = typeof currentSelected === 'string' && currentSelected.trim() ? currentSelected.split(',').map(s => s.trim()) : (Array.isArray(currentSelected) ? currentSelected as string[] : []);

    return (
      <CustomMultiDropdown
        options={opts.map(opt => typeof opt === 'string' ? opt : (opt.label || opt.value || opt)) as string[]}
        value={selectedArray}
        onChange={(val) => setValue(fieldName, Array.isArray(val) ? val.join(', ') : val, { shouldValidate: true })}
        error={isError}
        placeholder={`Select ${field.name}...`}
      />
    );
  }

  if (field.type === 'STATUS_PICKER') {
    const opts = field.statusOptions || [];
    const currentValue = (current as string) || (opts.length > 0 ? opts[0].label : '');

    // Handle future date restriction
    let isRestrictedDate = false;
    const restriction = field.futureDateRestriction;
    if (restriction?.enabled && restriction.dateFieldId) {
      const dependentDateFieldName = STANDARD_FIELD_MAP[restriction.dateFieldId] || restriction.dateFieldId;
      const dependentDateVal = watch(dependentDateFieldName);
      if (dependentDateVal) {
        const dateObj = new Date(dependentDateVal as string);
        dateObj.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dateObj > today) {
          isRestrictedDate = true;
        }
      }
    }

    // CustomDropdown has no per-option disabled state, so restricted statuses are omitted.
    const availableOpts = opts.filter(opt => !(isRestrictedDate && restriction?.restrictedStatuses?.includes(opt.label)));

    return (
      <div className="relative custom-dropdown-container">
        <CustomDropdown
          options={availableOpts.map(opt => ({ label: opt.label, value: opt.label, color: opt.color }))}
          value={currentValue}
          onChange={(val) => setValue(fieldName, val, { shouldValidate: true })}
          error={isError}
          placeholder={`Select Status...`}
        />
      </div>
    );
  }

  if (field.type === 'USER_PICKLIST' || field.type === 'MULTI_USER_PICKLIST') {
    let filteredUsers = users;
    const config = field.userPicklistConfig;
    if (config) {
      if (config.mode === 'ROLES' && config.roles && config.roles.length > 0) {
        const roles = config.roles;
        filteredUsers = users.filter(u => roles.includes(u.role));
      } else if (config.mode === 'USERS' && config.userIds && config.userIds.length > 0) {
        const userIds = config.userIds;
        filteredUsers = users.filter(u => userIds.includes(u.id));
      }
    }

    const Picklist = field.type === 'USER_PICKLIST' ? UserPicklist : MultiUserPicklist;
    return (
      <Picklist users={filteredUsers} value={(current as string) || ''} onChange={(val) => setValue(fieldName, val, { shouldValidate: true })} placeholder={`Select ${field.name}...`} error={isError} showAvailability={config?.showAvailability} />
    );
  }
  if (field.type === 'MULTI_LINE') {
    return (
      <textarea className={`flex w-full rounded-xl border bg-white px-4 py-2 text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 min-h-[80px] ${isError ? 'border-red-500' : 'border-gray-200'}`} {...register(fieldName, { required: field.mandatory })} placeholder={field.placeholder || `Enter ${field.name}...`} />
    );
  }

  if (field.type === 'CHECKBOX') {
    return (
      <div className={`flex items-center h-[45px] w-full rounded-xl border bg-white px-4 transition-colors ${isError ? 'border-red-500' : 'border-gray-200'}`}>
        <label className="flex items-center gap-3 cursor-pointer w-full h-full">
          <input
            type="checkbox"
            className="w-5 h-5 accent-orange-500 rounded border-gray-300 cursor-pointer"
            {...register(fieldName, { required: field.mandatory })}
          />
          <span className="text-[0.95rem] text-slate-600 font-medium select-none">{field.name}</span>
        </label>
      </div>
    );
  }

  if (field.type === 'IMAGE' || field.type === 'FILE') {
    return (
      <FileAttachment
        id={fieldName}
        type={field.type}
        value={current}
        onChange={(vals) => setValue(fieldName, vals)}
        driveStatus={driveStatus}
        moduleName="Bookings"
        categoryName={categoryName}
      />
    );
  }

  // Default fallback to text/number input
  const typeAttr = field.type === 'EMAIL' ? 'email' : 'text';
  return (
    <input type={typeAttr} autoComplete="new-password" className={inputClass(isError)} {...register(fieldName, { required: field.mandatory })} placeholder={field.placeholder || `e.g. Enter ${field.name}...`} />
  );
}
