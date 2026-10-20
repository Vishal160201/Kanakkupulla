"use client";

import type { FormLayout } from "@/types/settings";
import type { LayoutBuilder } from "./useLayoutBuilder";

interface FormListViewProps {
  layouts: FormLayout[];
  onOpen: (formKey: string) => void;
  newForm: LayoutBuilder["newForm"];
}

export default function FormListView({ layouts, onOpen, newForm }: FormListViewProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden lg:h-[calc(100vh-140px)] flex flex-col">
      <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white shrink-0">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Form Layouts</h2>
          <p className="text-slate-500 text-sm mt-0.5">Manage and customize your data entry forms.</p>
        </div>
        <button
          type="button"
          onClick={() => newForm.setShow(true)}
          className="px-5 py-2.5 bg-orange-500 text-white font-semibold text-sm rounded-xl hover:bg-orange-600 transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
        >
          <i className="ph-bold ph-plus"></i> Create Form
        </button>
      </div>

      <div className="flex-1 lg:overflow-y-auto p-4 sm:p-8 bg-slate-50">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {layouts.map((layout) => (
            <button
              type="button"
              key={layout.formKey}
              onClick={() => onOpen(layout.formKey)}
              className="w-full text-left bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-orange-300 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                <i className="ph-fill ph-layout"></i>
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg mb-1">{layout.name}</h3>
              <p className="text-sm text-slate-500 mb-4 line-clamp-2">{layout.description}</p>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>{layout.schema.sections?.length || 0} Sections</span>
                <span className="text-orange-600 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-visible:opacity-100 transition-opacity flex items-center gap-1">
                  Edit Layout <i className="ph-bold ph-arrow-right"></i>
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {newForm.show && <NewFormModal newForm={newForm} />}
    </div>
  );
}

function NewFormModal({ newForm }: { newForm: LayoutBuilder["newForm"] }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => newForm.setShow(false)}></div>
      <div className="relative bg-white rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] border border-gray-100 w-full max-w-[450px] mx-4 overflow-hidden animate-fade-in p-7">
        <h3 className="text-lg font-bold text-slate-900 mb-1">Create New Form</h3>
        <p className="text-sm text-slate-500 mb-6">Define a new dynamic form to collect custom information.</p>
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Form Name</label>
            <input
              type="text"
              value={newForm.name}
              onChange={(e) => newForm.setName(e.target.value)}
              placeholder="e.g. Employee Feedback"
              className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-orange-400 focus:bg-white transition-colors"
            />
          </div>
          <div>
            <label className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Description</label>
            <textarea
              value={newForm.description}
              onChange={(e) => newForm.setDescription(e.target.value)}
              placeholder="What is this form used for?"
              rows={2}
              className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-orange-400 focus:bg-white transition-colors resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => newForm.setShow(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
          <button type="button" onClick={newForm.create} disabled={!newForm.name} className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Create Form</button>
        </div>
      </div>
    </div>
  );
}
