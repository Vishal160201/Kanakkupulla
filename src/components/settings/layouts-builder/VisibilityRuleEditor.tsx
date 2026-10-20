"use client";

import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import CustomMultiDropdown from "@/components/ui/CustomMultiDropdown";
import type { FormField, FormLayout, VisibilityOperator, VisibilityRule } from "@/types/settings";
import { allFields } from "./constants";

interface VisibilityRuleEditorProps {
  field: FormField;
  layout: FormLayout;
  update: (updates: Partial<FormField>) => void;
}

const OPERATOR_LABELS: Record<VisibilityOperator, string> = {
  EQUALS: "Is any of",
  NOT_EQUALS: "Is not",
  CONTAINS: "Contains",
};

/** "Show conditionally" rule: field is visible only when another field matches. */
export default function VisibilityRuleEditor({ field, layout, update }: VisibilityRuleEditorProps) {
  const rule = field.visibilityRule;
  const setRule = (patch: Partial<VisibilityRule>) => {
    if (!rule) return;
    update({ visibilityRule: { ...rule, ...patch } });
  };

  return (
    <div className="pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <label className="text-[0.75rem] font-bold text-slate-600 flex items-center gap-1">
          Conditional Visibility
        </label>
      </div>
      <div className="flex items-center gap-3 cursor-pointer group mb-3">
        <button
          type="button"
          role="switch"
          aria-checked={!!rule}
          aria-label="Show conditionally"
          onClick={() => {
            if (rule) {
              // Clearing the key drops it from the saved JSON.
              update({ visibilityRule: undefined });
            } else {
              update({ visibilityRule: { fieldId: "", operator: "EQUALS", values: [] } });
            }
          }}
          className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${rule ? "bg-orange-500" : "bg-slate-300"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${rule ? "translate-x-5" : "translate-x-0"}`}></span>
        </button>
        <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Show conditionally</span>
      </div>

      {rule && (
        <div className="bg-slate-50 border border-gray-200 rounded-xl p-3 flex flex-col gap-3">
          <div>
            <label className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Depends on Field</label>
            <Select
              value={rule.fieldId}
              onValueChange={(val) => setRule({ fieldId: val || "" })}
            >
              <SelectTrigger className="w-full text-sm font-semibold text-slate-800 bg-white border border-gray-300 rounded-lg h-[40px] px-3 outline-none focus:border-orange-500 transition-all">
                <span className="truncate flex-1 text-left">
                  {rule.fieldId
                    ? allFields(layout).find((f) => f.id === rule.fieldId)?.name || rule.fieldId
                    : "-- Select Field --"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {allFields(layout).filter((f) => f.id !== field.id).map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <div className="min-w-[120px] shrink-0">
              <label className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Operator</label>
              <Select
                value={rule.operator}
                onValueChange={(val) => setRule({ operator: val as VisibilityOperator })}
              >
                <SelectTrigger className="w-full text-sm font-semibold text-slate-800 bg-white border border-gray-300 rounded-lg h-[40px] px-3 outline-none focus:border-orange-500 transition-all">
                  <span className="truncate flex-1 text-left">
                    {OPERATOR_LABELS[rule.operator] ?? "Operator"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EQUALS">Is any of</SelectItem>
                  <SelectItem value="NOT_EQUALS">Is not</SelectItem>
                  <SelectItem value="CONTAINS">Contains</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Values</label>
              <RuleValuesInput rule={rule} layout={layout} onChange={(values) => setRule({ values })} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RuleValuesInput({ rule, layout, onChange }: { rule: VisibilityRule; layout: FormLayout; onChange: (values: string[]) => void }) {
  const dependingField = allFields(layout).find((f) => f.id === rule.fieldId);
  if (dependingField && dependingField.options && dependingField.options.length > 0) {
    const selectedValues = Array.isArray(rule.values) ? rule.values : (rule.value ? [rule.value] : []);
    return (
      <CustomMultiDropdown
        options={dependingField.options}
        value={selectedValues}
        onChange={(val) => onChange(Array.isArray(val) ? val : [val as string])}
        placeholder="Select Values..."
      />
    );
  }

  const textValues = rule.values?.join(", ") || rule.value || "";
  return (
    <input
      type="text"
      value={textValues}
      onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
      placeholder="e.g. Wedding, Event"
      className="w-full text-sm font-semibold text-slate-800 bg-white border border-gray-300 rounded-lg h-[40px] px-3 outline-none focus:border-orange-500 transition-all"
    />
  );
}
