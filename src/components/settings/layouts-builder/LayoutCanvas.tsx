"use client";

import type { FormLayout } from "@/types/settings";
import SectionCard from "./SectionCard";
import type { CanvasDrag } from "./useCanvasDrag";
import type { LayoutBuilder } from "./useLayoutBuilder";

interface LayoutCanvasProps {
  layout: FormLayout;
  builder: LayoutBuilder;
  drag: CanvasDrag;
}

/** Center column: WYSIWYG representation of the form being edited. */
export default function LayoutCanvas({ layout, builder, drag }: LayoutCanvasProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-10 relative bg-white" onClick={() => builder.setSelectedFieldId(null)}>
      <div className="max-w-[850px] mx-auto flex flex-col gap-6 lg:gap-8 pb-20">
        {layout.schema.sections.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 bg-slate-50/50 rounded-2xl p-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
              <i className="ph ph-layout text-3xl text-slate-400"></i>
            </div>
            <h3 className="font-extrabold text-slate-900 text-lg mb-2">No Sections Yet</h3>
            <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">Start building your form by adding a section. Sections help group related fields together logically.</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); builder.addSection(); }}
              className="px-5 py-2.5 bg-orange-100 text-orange-700 font-bold text-sm rounded-xl hover:bg-orange-200 transition-colors"
            >
              Add First Section
            </button>
          </div>
        ) : (
          layout.schema.sections.map((section) => (
            <SectionCard key={section.id} section={section} builder={builder} drag={drag} />
          ))
        )}
      </div>
    </div>
  );
}
