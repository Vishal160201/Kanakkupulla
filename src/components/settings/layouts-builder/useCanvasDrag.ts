"use client";

import { useState } from "react";
import type { FormField, FormLayout, FormSection } from "@/types/settings";
import { createField } from "./constants";

export interface FieldSlot {
  sectionId: string;
  fieldIndex: number;
}

interface UseCanvasDragArgs {
  activeLayout: FormLayout | undefined;
  updateActiveLayout: (updated: FormLayout) => void;
  replaceSections: (formKey: string, sections: FormSection[]) => void;
  setSelectedFieldId: (id: string | null) => void;
}

/** Drag-and-drop state for reordering sections and adding/moving fields on the canvas. */
export function useCanvasDrag({ activeLayout, updateActiveLayout, replaceSections, setSelectedFieldId }: UseCanvasDragArgs) {
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);

  const [draggedNewFieldType, setDraggedNewFieldType] = useState<string | null>(null);
  const [draggedFieldContext, setDraggedFieldContext] = useState<FieldSlot | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<FieldSlot | null>(null);

  const handleSectionDrop = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    setDragOverSectionId(null);
    if (!draggedSectionId || draggedSectionId === targetSectionId) return;

    const l = activeLayout;
    if (!l) return;

    const sections = [...l.schema.sections];
    const sourceIdx = sections.findIndex((s) => s.id === draggedSectionId);
    const targetIdx = sections.findIndex((s) => s.id === targetSectionId);

    if (sourceIdx === -1 || targetIdx === -1) return;

    const [moved] = sections.splice(sourceIdx, 1);
    sections.splice(targetIdx, 0, moved);

    replaceSections(l.formKey, sections);
    setDraggedSectionId(null);
  };

  const handleDrop = (e: React.DragEvent, targetSectionId: string, targetIndex: number) => {
    e.preventDefault();
    if (!activeLayout) return;

    if (draggedNewFieldType) {
      // Create new field and insert at targetIndex
      const newField = createField(draggedNewFieldType);

      const sections = activeLayout.schema.sections.map((s) => {
        if (s.id === targetSectionId) {
          const newFields = [...(s.fields || [])];
          newFields.splice(targetIndex, 0, newField);
          return { ...s, fields: newFields };
        }
        return s;
      });
      updateActiveLayout({ ...activeLayout, schema: { ...activeLayout.schema, sections } });
      setSelectedFieldId(newField.id);
    } else if (draggedFieldContext) {
      // Reorder existing field
      const { sectionId: sourceSectionId, fieldIndex: sourceIndex } = draggedFieldContext;

      const sourceSection = activeLayout.schema.sections.find((s) => s.id === sourceSectionId);
      const movedField: FormField | undefined = sourceSection?.fields[sourceIndex];
      if (!movedField) return;

      // Extract the field
      const tempSections = activeLayout.schema.sections.map((s) => {
        if (s.id === sourceSectionId) {
          const fields = [...s.fields];
          fields.splice(sourceIndex, 1);
          return { ...s, fields };
        }
        return s;
      });

      // Calculate adjusted target index if moving down in the same section
      let adjustedTargetIndex = targetIndex;
      if (sourceSectionId === targetSectionId && sourceIndex < targetIndex) {
        adjustedTargetIndex--;
      }

      // Insert the field
      const finalSections = tempSections.map((s) => {
        if (s.id === targetSectionId) {
          const fields = [...s.fields];
          fields.splice(adjustedTargetIndex, 0, movedField);
          return { ...s, fields };
        }
        return s;
      });

      updateActiveLayout({ ...activeLayout, schema: { ...activeLayout.schema, sections: finalSections } });
    }

    setDraggedNewFieldType(null);
    setDraggedFieldContext(null);
    setDragOverTarget(null);
  };

  return {
    draggedSectionId,
    setDraggedSectionId,
    dragOverSectionId,
    setDragOverSectionId,
    draggedNewFieldType,
    setDraggedNewFieldType,
    setDraggedFieldContext,
    dragOverTarget,
    setDragOverTarget,
    handleSectionDrop,
    handleDrop,
  };
}

export type CanvasDrag = ReturnType<typeof useCanvasDrag>;
