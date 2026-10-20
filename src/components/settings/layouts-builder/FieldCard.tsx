"use client";

import type { FormField } from "@/types/settings";
import { getFieldTypeDef } from "./constants";
import type { CanvasDrag } from "./useCanvasDrag";
import { Tooltip } from "@/components/ui/Tooltip";

interface FieldCardProps {
  field: FormField;
  index: number;
  sectionId: string;
  isSectionLocked: boolean | undefined;
  isSelected: boolean;
  drag: CanvasDrag;
  onSelect: (fieldId: string) => void;
  onRemove: (sectionId: string, fieldId: string, e: React.MouseEvent) => void;
}

/** WYSIWYG preview of a single field on the layout canvas. */
export default function FieldCard({ field, index, sectionId, isSectionLocked, isSelected, drag, onSelect, onRemove }: FieldCardProps) {
  const typeDef = getFieldTypeDef(field.type);
  const isDragOver = drag.dragOverTarget?.sectionId === sectionId && drag.dragOverTarget?.fieldIndex === index;

  return (
    <div className="relative">
      {isDragOver && !isSectionLocked && (
        <div className="absolute -left-3 -top-3 bottom-0 w-1.5 bg-orange-500 rounded-full z-20 shadow-[0_0_8px_rgba(249,115,22,0.6)] animate-pulse"></div>
      )}
      {/* Not a <button>: it hosts the nested delete button and is a drag source. */}
      <div
        draggable={!isSectionLocked}
        onDragStart={(e) => {
          if (isSectionLocked) return;
          drag.setDraggedFieldContext({ sectionId, fieldIndex: index });
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", `field_${field.id}`);
        }}
        onDragEnd={() => {
          if (isSectionLocked) return;
          drag.setDraggedFieldContext(null);
          drag.setDragOverTarget(null);
        }}
        onDragOver={(e) => {
          if (isSectionLocked) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = drag.draggedNewFieldType ? "copy" : "move";
          drag.setDragOverTarget({ sectionId, fieldIndex: index });
        }}
        onDrop={(e) => {
          if (isSectionLocked) return;
          e.stopPropagation();
          drag.handleDrop(e, sectionId, index);
        }}
        onClick={(e) => {
          if (isSectionLocked) return;
          e.stopPropagation();
          onSelect(field.id);
        }}
        className={`relative transition-all group/field rounded-2xl p-3 -m-3 ${
          isSectionLocked ? "" : "cursor-grab active:cursor-grabbing"
        } ${
          isSelected
            ? "bg-orange-50/50 outline outline-2 outline-orange-500 z-10"
            : isSectionLocked ? "" : "hover:bg-slate-100/50 hover:outline hover:outline-1 hover:outline-gray-200"
        }`}
      >
        {/* Realistic Label */}
        {field.type !== "CHECKBOX" && (
          <label className="text-[0.7rem] font-bold text-slate-600 uppercase tracking-wider mb-2 block truncate cursor-grab active:cursor-grabbing">
            {field.name || "Untitled Field"} {field.mandatory && <span className="text-red-500">*</span>}
          </label>
        )}

        {/* Realistic Input Field */}
        {field.type === "CHECKBOX" ? (
          <div className="w-full h-[52px] bg-white border border-gray-200 rounded-xl flex items-center px-4 shadow-sm pointer-events-none gap-3">
            <div className="w-5 h-5 rounded border-2 border-gray-300 bg-white flex shrink-0"></div>
            <span className="text-[0.95rem] text-slate-600 font-semibold truncate">{field.name || "Untitled Field"}</span>
          </div>
        ) : (
          <div className="w-full h-[52px] bg-white border border-gray-200 rounded-xl flex items-center justify-between px-4 shadow-sm pointer-events-none">
            <span className="text-[0.95rem] text-slate-400 truncate">
              {field.placeholder || (field.type === "PICK_LIST" || field.type === "DATE" ? `Select ${field.name.toLowerCase()}...` : `e.g. Enter ${field.name.toLowerCase()}...`)}
            </span>
            <i className={`ph ${typeDef?.icon || "ph-text-t"} text-slate-400 text-lg`}></i>
          </div>
        )}

        {/* Floating Action Menu (Delete) */}
        {!isSectionLocked && (
          <div className={`absolute -right-2 -top-2 bg-white border border-gray-200 rounded-full shadow-sm flex items-center transition-opacity z-20 ${isSelected ? "opacity-100" : "opacity-0 group-hover/field:opacity-100"}`}>
            <Tooltip content="Delete Field">
              <button
                type="button"
                onClick={(e) => onRemove(sectionId, field.id, e)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-600 rounded-full hover:bg-slate-50"
                aria-label="Delete field"
              >
                <i className="ph-bold ph-trash"></i>
              </button>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
}
