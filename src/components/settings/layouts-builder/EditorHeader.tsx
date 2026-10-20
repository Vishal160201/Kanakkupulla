"use client";

interface EditorHeaderProps {
  name: string;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
}

export default function EditorHeader({ name, saving, onBack, onSave }: EditorHeaderProps) {
  return (
    <div className="min-h-[4rem] h-auto border-b border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between p-4 sm:px-6 sm:py-0 shrink-0 gap-4 sm:gap-0">
      <div className="flex items-center gap-4 w-full sm:w-auto">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to form layouts"
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <i className="ph-bold ph-arrow-left text-lg"></i>
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-orange-100 text-orange-600 text-[0.65rem] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">Layout Editor</span>
          </div>
          <h2 className="font-extrabold text-slate-900 text-lg leading-tight">{name}</h2>
        </div>
      </div>
      <div className="w-full sm:w-auto flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="px-6 py-2 bg-slate-900 text-white font-semibold text-sm rounded-lg hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <i className="ph-bold ph-check"></i>}
          Save Layout
        </button>
      </div>
    </div>
  );
}
