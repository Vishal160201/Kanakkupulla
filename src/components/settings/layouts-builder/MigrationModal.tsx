"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OptionMigration, UsageModalData } from "./useOptionMigration";

interface MigrationModalProps {
  data: UsageModalData;
  migration: OptionMigration;
}

/** Shown when deleting a pick-list value that existing records still use. */
export default function MigrationModal({ data, migration }: MigrationModalProps) {
  const { migrating, migrationValue, setMigrationValue, closeUsageModal, handleMigrateOption } = migration;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !migrating && closeUsageModal()}></div>
      <div className="relative bg-white rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] border border-gray-100 w-full max-w-[450px] mx-4 overflow-hidden animate-fade-in p-7">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4 border border-red-100">
          <i className="ph-fill ph-warning-circle text-2xl"></i>
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Value in Use</h3>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          The value <strong className="text-slate-800">&quot;{data.oldValue}&quot;</strong> is currently used in <strong className="text-orange-600">{data.inUseCount} record(s)</strong>.
          Before you can delete this option, please select a replacement value to migrate the existing records to.
        </p>
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Replacement Value</label>
            <Select value={migrationValue} onValueChange={(val) => setMigrationValue(val || "")}>
              <SelectTrigger className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 h-[46px] outline-none focus:border-orange-400 focus:bg-white transition-colors">
                <SelectValue placeholder="Select an option..." />
              </SelectTrigger>
              <SelectContent>
                {data.availableOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={closeUsageModal}
            disabled={migrating}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleMigrateOption}
            disabled={!migrationValue || migrating}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {migrating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Migrate & Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
