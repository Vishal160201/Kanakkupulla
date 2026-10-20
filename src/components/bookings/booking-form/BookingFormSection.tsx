"use client";

import type { ReactNode } from "react";
import type { FieldErrors } from "react-hook-form";
import type { BookingFormData } from "@/lib/validations/booking";
import type { LayoutField, LayoutSection, VisibilityRule } from "@/types/bookings";
import { STANDARD_FIELD_MAP } from "../layoutUtils";

interface BookingFormSectionProps {
  section: LayoutSection;
  /** Id of the layout's main STATUS_PICKER field (bound to `status`). */
  statusFieldId: string | undefined;
  isEditing: boolean;
  errors: FieldErrors<BookingFormData>;
  evaluateVisibility: (rule: VisibilityRule | null | undefined) => boolean;
  renderField: (field: LayoutField) => ReactNode;
  /** Rendered in place of the `advance` field. */
  installmentsSlot: ReactNode;
  outstandingBalance: number;
}

/** One layout section of the booking form. */
export default function BookingFormSection({
  section, statusFieldId, isEditing, errors, evaluateVisibility, renderField, installmentsSlot, outstandingBalance,
}: BookingFormSectionProps) {
  const isFinancial = section.id === 'sec_booking_financial';

  return (
    <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-gray-100 relative">
      <div className="flex flex-col mb-6">
        <div className="flex items-center gap-2.5 font-extrabold text-[1.1rem] text-slate-900 tracking-tight">
          <i className={`ph-fill ${section.icon || 'ph-squares-four'} text-orange-500 text-[1.2rem]`}></i> {section.title}
        </div>
        {section.description && <div className="text-[0.85rem] text-slate-500 mt-1 font-medium leading-[1.4]">{section.description}</div>}
      </div>

      <div className={`grid gap-5 items-start ${isFinancial ? 'grid-cols-1 md:grid-cols-12' : 'grid-cols-1 md:grid-cols-2'}`}>
        {section.fields.map(field => {
          // Map STATUS_PICKER to 'status' if it's the main one
          let fieldName = STANDARD_FIELD_MAP[field.id] || field.id;
          if (statusFieldId && field.id === statusFieldId) fieldName = 'status';

          if (field.visibilityRule && !evaluateVisibility(field.visibilityRule)) {
            return null;
          }

          const isError = errors[fieldName];

          if (!isEditing && field.type === 'STATUS_PICKER') return null;

          if (fieldName === 'advance') return installmentsSlot;

          return (
            <div key={field.id} id={`field-container-${fieldName}`} className={`flex flex-col gap-1.5 ${isFinancial ? 'md:col-span-4' : (field.type === 'MULTI_LINE' ? 'md:col-span-2' : '')}`}>
              <div className="flex justify-between items-center">
                <label className="text-[0.75rem] font-bold text-slate-600 uppercase tracking-[0.5px]">
                  {field.name} {field.mandatory && <span className="text-red-500 ml-0.5">*</span>}
                </label>

              </div>
              {renderField(field)}
              {isError && <span className="text-[0.7rem] font-semibold text-red-500 mt-1">{isError.message as string || `${field.name} is required`}</span>}
            </div>
          );
        })}

        {isFinancial && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-[14px] flex flex-col items-end justify-center shadow-inner md:col-span-8 md:col-start-5 mt-4">
            <span className="text-[0.75rem] font-extrabold text-orange-600/80 uppercase tracking-[0.5px]">Outstanding Balance</span>
            <span className="text-[1.3rem] font-extrabold text-orange-600 mt-0.5">
              ₹{outstandingBalance.toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
