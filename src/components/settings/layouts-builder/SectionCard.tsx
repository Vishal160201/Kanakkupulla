"use client";

import type { FormSection } from "@/types/settings";
import { isLockedSection } from "./constants";
import FieldCard from "./FieldCard";
import SectionIconPicker from "./SectionIconPicker";
import type { CanvasDrag } from "./useCanvasDrag";
import type { LayoutBuilder } from "./useLayoutBuilder";

interface SectionCardProps {
  section: FormSection;
  builder: LayoutBuilder;
  drag: CanvasDrag;
}

export default function SectionCard({ section, builder, drag }: SectionCardProps) {
  const isSectionLocked = isLockedSection(section);
  const isEndDropTarget = drag.dragOverTarget?.sectionId === section.id && drag.dragOverTarget?.fieldIndex === section.fields.length;

  return (
    <div
      draggable={!isSectionLocked}
      onDragStart={(e) => {
        if (isSectionLocked) {
          e.preventDefault();
          return;
        }
        e.stopPropagation();
        drag.setDraggedSectionId(section.id);
      }}
      onDragEnd={() => {
        if (isSectionLocked) return;
        drag.setDraggedSectionId(null);
        drag.setDragOverSectionId(null);
      }}
      className={`group/section relative bg-slate-50 border rounded-2xl p-8 transition-colors ${
        drag.dragOverSectionId === section.id ? "border-orange-500 shadow-[0_0_0_3px_rgba(249,115,22,0.3)] -translate-y-1" : ""} ${
        isEndDropTarget
          ? "border-orange-400 shadow-[0_0_0_2px_rgba(249,115,22,0.2)]"
          : "border-gray-100"
      }`}
      onClick={(e) => e.stopPropagation()}
      onDragOver={(e) => {
        e.preventDefault();
        if (drag.draggedSectionId) {
          e.dataTransfer.dropEffect = "move";
          if (drag.dragOverSectionId !== section.id) drag.setDragOverSectionId(section.id);
        } else {
          e.dataTransfer.dropEffect = drag.draggedNewFieldType ? "copy" : "move";
          drag.setDragOverTarget({ sectionId: section.id, fieldIndex: section.fields.length });
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (drag.draggedSectionId) {
          drag.handleSectionDrop(e, section.id);
        } else {
          drag.handleDrop(e, section.id, section.fields.length);
        }
      }}
    >
      {/* Section Header */}
      <div className="flex items-start gap-4 mb-8">
        <SectionIconPicker icon={section.icon} onChange={(icon) => builder.updateSectionIcon(section.id, icon)} />
        <div className="flex-1">
          <input
            type="text"
            value={section.title}
            onChange={(e) => builder.updateSectionTitle(section.id, e.target.value)}
            className={`font-extrabold text-slate-900 bg-transparent border-none outline-none focus:ring-0 p-0 text-xl placeholder:text-slate-300 w-full mb-1 ${isSectionLocked ? "pointer-events-none" : ""}`}
            placeholder="Section Title"
            readOnly={isSectionLocked}
          />
          <input
            type="text"
            value={section.description || ""}
            onChange={(e) => builder.updateSectionDescription(section.id, e.target.value)}
            className={`text-[0.95rem] text-slate-500 bg-transparent border-none outline-none focus:ring-0 p-0 w-full placeholder:text-slate-300 ${isSectionLocked ? "pointer-events-none" : ""}`}
            placeholder="Section Description..."
            readOnly={isSectionLocked}
          />
        </div>
        {!isSectionLocked && (
          <button
            type="button"
            onClick={() => builder.removeSection(section.id)}
            className="opacity-0 group-hover/section:opacity-100 text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-all"
            title="Delete Section"
            aria-label="Delete section"
          >
            <i className="ph-bold ph-trash text-lg"></i>
          </button>
        )}
      </div>

      {/* Section Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
        {section.fields.map((field, idx) => (
          <FieldCard
            key={field.id}
            field={field}
            index={idx}
            sectionId={section.id}
            isSectionLocked={isSectionLocked}
            isSelected={builder.selectedFieldId === field.id}
            drag={drag}
            onSelect={builder.setSelectedFieldId}
            onRemove={builder.removeField}
          />
        ))}
      </div>

      {/* Inline Add Field Area (Drop Zone) */}
      {!isSectionLocked && (
        <button
          type="button"
          onClick={() => builder.addFieldToSection(section.id)}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            drag.setDragOverTarget({ sectionId: section.id, fieldIndex: section.fields.length });
          }}
          onDrop={(e) => {
            e.stopPropagation();
            drag.handleDrop(e, section.id, section.fields.length);
          }}
          className={`mt-8 w-full py-3.5 border border-dashed rounded-xl text-[0.85rem] font-bold transition-colors flex items-center justify-center gap-2 ${
            isEndDropTarget
              ? "border-orange-500 bg-orange-50 text-orange-600 shadow-sm outline outline-2 outline-orange-200"
              : "border-gray-300 text-slate-500 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50/50"
          }`}
        >
          <i className="ph-bold ph-plus"></i> Add Field Here
        </button>
      )}
    </div>
  );
}
