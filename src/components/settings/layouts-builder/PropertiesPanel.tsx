"use client";

import type { FormField, FormLayout, UserOption } from "@/types/settings";
import { allFields, getFieldTypeDef } from "./constants";
import { DateRestrictionEditor, StatusFutureDateRestrictionEditor } from "./DateRestrictionEditors";
import PickListOptionsEditor from "./PickListOptionsEditor";
import StatusOptionsEditor from "./StatusOptionsEditor";
import UserPicklistConfigEditor from "./UserPicklistConfigEditor";
import VisibilityRuleEditor from "./VisibilityRuleEditor";

interface PropertiesPanelProps {
  layout: FormLayout;
  field: FormField | null;
  update: (updates: Partial<FormField>) => void;
  allUsers: UserOption[];
  onRemoveOption: (idx: number) => void;
  checkingUsage: boolean;
}

/** Right column: editable properties of the selected field. */
export default function PropertiesPanel({ layout, field, update, allUsers, onRemoveOption, checkingUsage }: PropertiesPanelProps) {
  return (
    <div className="w-[320px] bg-white border-l border-gray-200 flex flex-col shrink-0">
      {field ? (
        <>
          <div className="px-6 py-4 border-b border-gray-100 bg-slate-50/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-slate-600 shadow-sm">
              <i className={`ph ${getFieldTypeDef(field.type)?.icon || "ph-text-t"} text-xl`}></i>
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-[0.95rem]">Field Properties</h3>
              <p className="text-[0.7rem] font-semibold text-slate-500 uppercase tracking-wider">{getFieldTypeDef(field.type)?.label || "Field"}</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Field Label */}
            <div>
              <label className="text-[0.75rem] font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                Field Label <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={field.name}
                onChange={(e) => update({ name: e.target.value })}
                className="w-full text-sm font-semibold text-slate-800 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all"
              />
            </div>

            {/* Mandatory Toggle (display only) */}
            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${field.mandatory ? "bg-orange-500" : "bg-slate-300"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${field.mandatory ? "translate-x-5" : "translate-x-0"}`}></span>
                </div>
                <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Mandatory Field</span>
              </label>
            </div>

            {field.type === "DATE" && <RecordDateToggle field={field} layout={layout} update={update} />}

            {(field.type === "PICK_LIST" || field.type === "MULTI_SELECT") && (
              <PickListOptionsEditor field={field} update={update} onRemoveOption={onRemoveOption} checkingUsage={checkingUsage} />
            )}

            {field.type === "STATUS_PICKER" && <StatusOptionsEditor field={field} update={update} />}

            {field.type === "DATE" && <DateRestrictionEditor field={field} update={update} />}

            {field.type === "STATUS_PICKER" && <StatusFutureDateRestrictionEditor field={field} update={update} layout={layout} />}

            {(field.type === "USER_PICKLIST" || field.type === "MULTI_USER_PICKLIST") && (
              <UserPicklistConfigEditor field={field} update={update} allUsers={allUsers} />
            )}

            <VisibilityRuleEditor field={field} layout={layout} update={update} />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-gray-100 shadow-sm">
            <i className="ph ph-cursor-click text-2xl"></i>
          </div>
          <h3 className="font-bold text-slate-700 mb-1">No Field Selected</h3>
          <p className="text-[0.8rem] leading-relaxed">Click on a field in the canvas to view and edit its properties.</p>
        </div>
      )}
    </div>
  );
}

/** DATE fields: mark one date field per layout as the record's date. */
function RecordDateToggle({ field, layout, update }: { field: FormField; layout: FormLayout; update: (updates: Partial<FormField>) => void }) {
  // Last other field flagged as record date (only relevant when this one isn't).
  const otherRecordDateFields = field.isRecordDate
    ? []
    : allFields(layout).filter((f) => f.id !== field.id && f.isRecordDate);
  const existingRecordDateField = otherRecordDateFields[otherRecordDateFields.length - 1];

  return (
    <div className="pt-2">
      <div className="flex items-center gap-3 cursor-pointer group">
        <button
          type="button"
          role="switch"
          aria-checked={!!field.isRecordDate}
          aria-label="Use as record date"
          aria-disabled={!!existingRecordDateField}
          onClick={(e) => {
            e.preventDefault();
            if (existingRecordDateField) {
              return; // Disabled if another exists
            }
            update({ isRecordDate: !field.isRecordDate });
          }}
          className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${existingRecordDateField ? "bg-slate-200 cursor-not-allowed opacity-50" : field.isRecordDate ? "bg-orange-500" : "bg-slate-300"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${field.isRecordDate ? "translate-x-5" : "translate-x-0"}`}></span>
        </button>
        <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Use as Record Date</span>
      </div>
      {existingRecordDateField && (
        <p className="text-red-500 text-[0.7rem] font-medium mt-1">
          Only one date field can be the record date. Disable {existingRecordDateField.name} first.
        </p>
      )}
    </div>
  );
}
