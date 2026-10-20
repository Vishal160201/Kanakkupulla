"use client";

import { toast } from "sonner";
import EditorHeader from "./layouts-builder/EditorHeader";
import FieldPalette from "./layouts-builder/FieldPalette";
import FormListView from "./layouts-builder/FormListView";
import LayoutCanvas from "./layouts-builder/LayoutCanvas";
import MigrationModal from "./layouts-builder/MigrationModal";
import PropertiesPanel from "./layouts-builder/PropertiesPanel";
import { useCanvasDrag } from "./layouts-builder/useCanvasDrag";
import { useLayoutBuilder } from "./layouts-builder/useLayoutBuilder";
import { useOptionMigration } from "./layouts-builder/useOptionMigration";

export type { FormField } from "@/types/settings";

export default function LayoutsFieldsBuilder() {
  const builder = useLayoutBuilder();
  const { activeLayout, selectedField, updateSelectedField } = builder;

  const drag = useCanvasDrag({
    activeLayout,
    updateActiveLayout: builder.updateActiveLayout,
    replaceSections: builder.replaceSections,
    setSelectedFieldId: builder.setSelectedFieldId,
  });

  const migration = useOptionMigration({ activeLayout, selectedField, updateSelectedField });

  if (builder.loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 flex items-center justify-center text-slate-400">
        <div className="w-5 h-5 border-2 border-slate-300 border-t-orange-500 rounded-full animate-spin mr-3"></div>
        Loading Layouts...
      </div>
    );
  }

  // --- View 1: List of Forms ---
  if (!activeLayout) {
    return <FormListView layouts={builder.layouts} onOpen={builder.setActiveFormKey} newForm={builder.newForm} />;
  }

  // --- View 2: Form Editor (3-Column Layout) ---
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-[850px] flex flex-col font-sans">
      <EditorHeader name={activeLayout.name} saving={builder.saving} onBack={builder.closeEditor} onSave={builder.handleSave} />

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden bg-slate-50">
        <FieldPalette
          onDragStartType={drag.setDraggedNewFieldType}
          onDragEndType={() => drag.setDraggedNewFieldType(null)}
          onAddSection={builder.addSection}
          onPick={(fieldType) => {
            if (activeLayout.schema.sections.length === 0) {
              toast.error("Please add a section first!");
              return;
            }
            builder.addFieldToSection(activeLayout.schema.sections[0].id, fieldType);
          }}
        />

        <LayoutCanvas layout={activeLayout} builder={builder} drag={drag} />

        <PropertiesPanel
          layout={activeLayout}
          field={selectedField}
          update={updateSelectedField}
          allUsers={builder.allUsers}
          onRemoveOption={migration.handleRemoveOption}
          checkingUsage={migration.checkingUsage}
        />
      </div>

      {migration.usageModalData && <MigrationModal data={migration.usageModalData} migration={migration} />}
    </div>
  );
}
