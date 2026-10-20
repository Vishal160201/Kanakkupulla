"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FormField, FormLayout } from "@/types/settings";
import { allFields } from "./constants";

interface FieldEditorProps {
  field: FormField;
  update: (updates: Partial<FormField>) => void;
}

function InfoTooltip({ text, example }: { text: string; example: string }) {
  return (
    <div className="group relative flex items-center">
      <i className="ph-fill ph-info text-slate-400 hover:text-blue-500 cursor-help transition-colors text-[1.1rem]"></i>
      <div className="absolute bottom-full -left-4 mb-2 w-64 p-2.5 bg-slate-800 text-white text-[0.75rem] font-medium rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none text-left leading-relaxed">
        {text}
        <div className="mt-1.5 pt-1.5 border-t border-slate-700/50 text-slate-300 italic text-[0.7rem]">
          {example}
        </div>
        <div className="absolute top-full left-5 border-4 border-transparent border-t-slate-800"></div>
      </div>
    </div>
  );
}

function RestrictionHeader({ icon, title, tooltip, example, enabled, onToggle }: {
  icon: string;
  title: string;
  tooltip: string;
  example: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-2 border border-blue-200 bg-blue-50/50 p-3 rounded-lg relative">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 shrink-0 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
          <i className={`ph-fill ${icon} text-lg`}></i>
        </div>
        <div className="flex-1 min-w-0 flex items-center">
          <h4 className="text-[0.8rem] font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
            {title}
            <InfoTooltip text={tooltip} example={example} />
          </h4>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={title}
        onClick={onToggle}
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer shrink-0 ml-4 ${enabled ? "bg-blue-500" : "bg-slate-300"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? "translate-x-4" : "translate-x-0"}`}></span>
      </button>
    </div>
  );
}

/** DATE fields: block picking future dates. */
export function DateRestrictionEditor({ field, update }: FieldEditorProps) {
  return (
    <div className="pt-4 mt-4 border-t border-gray-100">
      <RestrictionHeader
        icon="ph-calendar-blank"
        title="Restrict Future Dates"
        tooltip="Prevent selecting dates in the future."
        example="Example: Users will only be able to select today or past dates."
        enabled={!!field.restrictFutureDate}
        onToggle={() => update({ restrictFutureDate: !field.restrictFutureDate })}
      />
    </div>
  );
}

/** STATUS_PICKER fields: block selecting certain statuses while a linked date is in the future. */
export function StatusFutureDateRestrictionEditor({ field, update, layout }: FieldEditorProps & { layout: FormLayout }) {
  const restriction = field.futureDateRestriction;

  return (
    <div className="pt-4 mt-4 border-t border-gray-100">
      <RestrictionHeader
        icon="ph-shield-check"
        title="Restrict Updating Status for Future Dates"
        tooltip="Prevent changing status to a value that represents a future stage."
        example='Example: If the event date is tomorrow, "Shoot completed" cannot be selected today.'
        enabled={!!restriction?.enabled}
        onToggle={() => {
          update({
            futureDateRestriction: {
              enabled: !restriction?.enabled,
              dateFieldId: restriction?.dateFieldId || "",
              restrictedStatuses: restriction?.restrictedStatuses || [],
            },
          });
        }}
      />

      {restriction?.enabled && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mt-3">
          <div className="mb-4">
            <label className="text-[0.75rem] font-bold text-slate-600 flex items-center gap-1 mb-2">
              Based on date field:
            </label>
            <Select
              value={restriction.dateFieldId}
              onValueChange={(val) => update({
                futureDateRestriction: {
                  ...restriction,
                  dateFieldId: val || "",
                },
              })}
            >
              <SelectTrigger className="w-full text-sm font-semibold text-slate-800 bg-white border border-gray-300 rounded-lg h-10 outline-none focus:border-blue-400 transition-colors">
                <SelectValue placeholder="Select Date Field">
                  {allFields(layout).find((f) => f.id === restriction.dateFieldId)?.name || restriction.dateFieldId || "Select Date Field"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {allFields(layout)
                  .filter((f) => f.type === "DATE")
                  .map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[0.75rem] font-bold text-slate-600 flex items-center gap-1 mb-2">
              Select restricted statuses:
            </label>
            <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto no-scrollbar p-1">
              {(field.statusOptions || []).map((opt) => {
                const isRestricted = restriction.restrictedStatuses?.includes(opt.label);
                return (
                  <label key={opt.label} className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isRestricted ? "bg-blue-500 border-blue-500 text-white" : "border-gray-300 bg-white text-transparent group-hover:border-blue-400"}`}>
                      <i className="ph-bold ph-check text-[0.6rem]"></i>
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={isRestricted}
                      onChange={(e) => {
                        const currentStatuses = restriction.restrictedStatuses || [];
                        const newStatuses = e.target.checked
                          ? [...currentStatuses, opt.label]
                          : currentStatuses.filter((s) => s !== opt.label);

                        update({
                          futureDateRestriction: {
                            ...restriction,
                            restrictedStatuses: newStatuses,
                          },
                        });
                      }}
                    />
                    <span className="text-sm font-semibold text-slate-700">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
