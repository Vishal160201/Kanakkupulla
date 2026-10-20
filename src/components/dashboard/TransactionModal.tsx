"use client";

import React, { Suspense } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTransactionForm } from "@/components/transactions/form/useTransactionForm";
import { evaluateVisibility } from "@/components/transactions/form/transactionFormUtils";
import TransactionFormField from "@/components/transactions/form/TransactionFormField";

function TransactionModalInner() {
  const {
    isOpen,
    isEditMode,
    layoutSchema,
    driveStatus,
    form,
    errors,
    isSubmitting,
    setField,
    handleSubmit,
    onClose,
  } = useTransactionForm();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[700px] w-[calc(100vw-2rem)] sm:w-full sm:max-w-[700px] p-0 bg-transparent border-0 shadow-none overflow-visible">
        <div className="bg-slate-50 rounded-3xl overflow-hidden shadow-2xl flex flex-col w-full max-h-[90dvh] relative">
          <div className="px-5 sm:px-8 pt-5 sm:pt-7 pb-4 sm:pb-5 bg-white border-b border-slate-100 shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[0.65rem] font-bold text-orange-500 uppercase tracking-[1px]">
                  {isEditMode ? "Edit Record" : "New Record"}
                </span>
                <DialogTitle className="text-[1.5rem] font-extrabold text-slate-900 mt-0.5">
                  {isEditMode ? "Edit Transaction" : "Add Transaction"}
                </DialogTitle>
              </div>
            </div>
          </div>

          <div className="px-5 sm:px-8 py-5 sm:py-6 overflow-y-auto flex-1 min-h-0">
            {layoutSchema?.sections ? (
              layoutSchema.sections.map((section) => {
                if (section.visibilityRule && !evaluateVisibility(section.visibilityRule, form)) return null;

                return (
                  <div key={section.id} className="bg-white rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-sm border border-slate-100">
                    <div className="flex flex-col mb-5">
                      <div className="flex items-center gap-2.5 font-extrabold text-[1.1rem] text-slate-900 tracking-tight">
                        <i className={`ph-fill ${section.icon || 'ph-squares-four'} text-orange-500 text-[1.2rem]`}></i> {section.title}
                      </div>
                      {section.description && <div className="text-[0.85rem] text-slate-500 mt-1 font-medium leading-[1.4]">{section.description}</div>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                      {section.fields.map((field) => {
                        if (field.visibilityRule && !evaluateVisibility(field.visibilityRule, form)) return null;

                        return (
                          <React.Fragment key={field.id}>
                            <TransactionFormField
                              field={field}
                              form={form}
                              errors={errors}
                              setField={setField}
                              driveStatus={driveStatus}
                            />
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex justify-center p-10"><i className="ph ph-circle-notch animate-spin text-2xl text-slate-400"></i></div>
            )}
          </div>

          <div className="px-5 sm:px-8 py-4 sm:py-5 bg-white border-t border-slate-100 flex justify-end gap-3 z-10 relative shrink-0 rounded-b-3xl">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 py-2.5 rounded-xl font-bold text-sm text-white bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <><i className="ph ph-circle-notch animate-spin"></i> Saving...</>
              ) : (
                <><i className={`ph-bold ${isEditMode ? "ph-pencil-simple" : "ph-floppy-disk"}`}></i> {isEditMode ? "Save Changes" : "Save Transaction"}</>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TransactionModal() {
  return (
    <Suspense fallback={null}>
      <TransactionModalInner />
    </Suspense>
  );
}
