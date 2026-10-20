"use client";

import { FIELD_TYPES } from "./constants";

interface FieldPaletteProps {
  onPick: (fieldType: string) => void;
  onAddSection: () => void;
  onDragStartType: (fieldType: string) => void;
  onDragEndType: () => void;
}

export default function FieldPalette({ onPick, onAddSection, onDragStartType, onDragEndType }: FieldPaletteProps) {
  return (
    <div className="w-full lg:w-[280px] h-[250px] lg:h-auto bg-white border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col shrink-0">
      <div className="flex border-b border-gray-100 px-4 py-3">
        <span className="text-[0.75rem] font-extrabold text-slate-500 uppercase tracking-wider">New Fields</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-2">
          {FIELD_TYPES.map((type) => (
            <button
              type="button"
              key={type.value}
              draggable
              onDragStart={(e) => {
                onDragStartType(type.value);
                e.dataTransfer.effectAllowed = "copy";
                e.dataTransfer.setData("text/plain", `new_${type.value}`);
              }}
              onDragEnd={onDragEndType}
              onClick={() => onPick(type.value)}
              className="flex items-center gap-2 p-2.5 border border-gray-200 rounded-lg hover:border-orange-300 hover:shadow-sm hover:text-orange-600 transition-all text-left group bg-white cursor-grab active:cursor-grabbing"
            >
              <i className={`ph ${type.icon} text-lg text-slate-400 group-hover:text-orange-500`}></i>
              <span className="text-[0.75rem] font-semibold text-slate-700 group-hover:text-orange-700 truncate">{type.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-8 px-2">
          <button
            type="button"
            onClick={onAddSection}
            className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm font-bold text-slate-600 hover:border-orange-400 hover:text-orange-600 transition-colors flex items-center justify-center gap-2 bg-slate-50"
          >
            <i className="ph-bold ph-plus"></i> Add Section
          </button>
        </div>
      </div>
    </div>
  );
}
