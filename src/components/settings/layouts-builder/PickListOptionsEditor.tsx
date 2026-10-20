"use client";

import { useState } from "react";
import type { FormField } from "@/types/settings";

interface PickListOptionsEditorProps {
  field: FormField;
  update: (updates: Partial<FormField>) => void;
  onRemoveOption: (idx: number) => void;
  checkingUsage: boolean;
}

/** Editable, drag-sortable list of values for PICK_LIST / MULTI_SELECT fields. */
export default function PickListOptionsEditor({ field, update, onRemoveOption, checkingUsage }: PickListOptionsEditorProps) {
  const [draggedOptionIdx, setDraggedOptionIdx] = useState<number | null>(null);

  return (
    <div className="pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <label className="text-[0.75rem] font-bold text-slate-600 flex items-center gap-1">
          Pick List Values <span className="text-red-500">*</span>
        </label>
      </div>

      <div className="bg-slate-50 border border-gray-200 rounded-xl p-2 space-y-2">
        {(field.options || []).map((opt, idx) => (
          <div
            key={idx}
            draggable
            onDragStart={(e) => {
              setDraggedOptionIdx(idx);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedOptionIdx === null || draggedOptionIdx === idx) return;
              const newOpts = [...(field.options || [])];
              const [moved] = newOpts.splice(draggedOptionIdx, 1);
              newOpts.splice(idx, 0, moved);
              update({ options: newOpts });
              setDraggedOptionIdx(null);
            }}
            onDragEnd={() => setDraggedOptionIdx(null)}
            className={`flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1.5 shadow-sm group/opt ${draggedOptionIdx === idx ? "opacity-50" : "cursor-grab active:cursor-grabbing"}`}
          >
            <div className="w-6 h-6 flex items-center justify-center text-slate-300">
              <i className="ph-bold ph-dots-six-vertical"></i>
            </div>
            <input
              type="text"
              value={opt}
              onChange={(e) => {
                const newOpts = [...(field.options || [])];
                newOpts[idx] = e.target.value;
                update({ options: newOpts });
              }}
              className="flex-1 text-[0.85rem] font-semibold text-slate-800 bg-transparent border-none outline-none focus:ring-0 p-0"
            />
            <button
              type="button"
              aria-label="Remove option"
              onClick={() => onRemoveOption(idx)}
              disabled={checkingUsage}
              className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-500 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <i className="ph-fill ph-x-circle"></i>
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => update({ options: [...(field.options || []), "New Option"] })}
          className="w-full mt-2 py-2.5 bg-white border border-dashed border-gray-300 rounded-lg text-[0.8rem] font-bold text-slate-500 hover:border-orange-400 hover:text-orange-600 transition-colors flex items-center gap-2 px-3"
        >
          <i className="ph-bold ph-plus"></i> Add Value
        </button>
      </div>
    </div>
  );
}
