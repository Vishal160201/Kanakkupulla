"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { toast } from "sonner";
import type { FieldErrors, UseFormReturn } from "react-hook-form";
import { saveBookingAction } from "@/app/actions";
import { uploadFileToDrive } from "@/lib/uploadHelper";
import type { BookingFormData } from "@/lib/validations/booking";
import type { Installment, LayoutSchema, VisibilityRule } from "@/types/bookings";
import { getAllFields, STANDARD_FIELD_MAP } from "../layoutUtils";

interface UseBookingFormSubmitOptions {
  form: UseFormReturn<BookingFormData>;
  layoutSchema: LayoutSchema | null;
  evaluateVisibility: (rule: VisibilityRule | null | undefined) => boolean;
  installments: Installment[];
  setInstallments: (installments: Installment[]) => void;
  isEditing: boolean;
  onSaved: () => void;
}

const isMissingValue = (value: unknown) => !value || (Array.isArray(value) && value.length === 0);

const isUploadCandidate = (first: unknown) =>
  first instanceof File || first instanceof Blob ||
  (typeof first === 'object' && (first as { driveFile?: unknown }).driveFile) ||
  (typeof first === 'string' && (first.startsWith('data:') || first.includes('driveFile')));

function scrollToField(fieldName: string, flash: boolean) {
  const element = document.getElementById(`field-container-${fieldName}`);
  if (!element) return;
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (flash) {
    // Flash red background momentarily for better UX
    element.classList.add('bg-red-50', 'p-2', 'rounded-xl', 'transition-colors', 'duration-500');
    setTimeout(() => {
      element.classList.remove('bg-red-50', 'p-2', 'rounded-xl');
    }, 1500);
  }
}

/** Creates (POST) or updates (PUT) the transaction behind each installment; returns true if any were created. */
async function syncInstallmentTransactions(installments: Installment[], booking: { id: string; bookingNumber?: string | null }, clientTitle: unknown) {
  let created = false;
  await Promise.all(installments.map(async (inst) => {
    if (!(inst.amount && parseFloat(inst.amount) > 0)) return;
    const isLegacy = inst.transactionId?.toString().startsWith('legacy');
    if (!inst.transactionId || isLegacy) {
      try {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: parseFloat(inst.amount),
            type: 'INCOME',
            category: 'BOOKING',
            description: `Advance Payment for Booking ${booking.bookingNumber || '#' + booking.id} - ${clientTitle || 'Client'}`,
            date: new Date(inst.date).toISOString(),
            bookingId: booking.id,
            paymentMode: inst.paymentMode || 'Cash'
          })
        });
        if (res.ok) {
          const txData = await res.json();
          inst.transactionId = txData.id;
          created = true;
        }
      } catch (e) {
        console.error("Failed to create transaction for installment", e);
      }
    } else {
      // Update existing transaction
      try {
        await fetch(`/api/transactions/${inst.transactionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: parseFloat(inst.amount),
            date: new Date(inst.date).toISOString(),
            paymentMode: inst.paymentMode || 'Cash'
          })
        });
      } catch (e) {
        console.error("Failed to update transaction for installment", e);
      }
    }
  }));
  return created;
}

/** Validation of layout-driven fields, file uploads, saving the booking and syncing its installment transactions. */
export function useBookingFormSubmit({ form, layoutSchema, evaluateVisibility, installments, setInstallments, isEditing, onSaved }: UseBookingFormSubmitOptions) {
  const router = useRouter();
  const { clearErrors, setError } = form;
  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);

  const onSubmit = async (data: BookingFormData) => {
    clearErrors();

    // Manual required check for visible fields that use setValue (not natively registered with required)
    // or fields that bypassed native validation. Remember the first one to scroll to.
    let firstErrField: string | null = null;
    layoutSchema?.sections?.forEach(section => {
      if (!evaluateVisibility(section.visibilityRule)) return;
      section.fields.forEach(field => {
        if (!evaluateVisibility(field.visibilityRule)) return;
        const fieldName = STANDARD_FIELD_MAP[field.id] || field.id;
        if (field.mandatory && isMissingValue(data[fieldName])) {
          setError(fieldName, { type: 'manual', message: `${field.name} is required` });
          if (!firstErrField) firstErrField = fieldName;
        }
      });
    });

    if (firstErrField) {
      const target: string = firstErrField;
      setTimeout(() => scrollToField(target, true), 50);
      return;
    }

    // Filter out hidden fields from submission
    layoutSchema?.sections?.forEach(section => {
      const secVisible = evaluateVisibility(section.visibilityRule);
      section.fields.forEach(field => {
        const fieldVisible = secVisible && evaluateVisibility(field.visibilityRule);
        if (!fieldVisible) {
          delete data[STANDARD_FIELD_MAP[field.id] || field.id];
        }
      });
    });

    // Handle file uploads
    setIsSubmittingLocal(true);
    try {
      const uploadPromises = [];
      for (const [key, value] of Object.entries(data)) {
        let valToProcess = value;
        if (Array.isArray(value) && value.length > 0 && isUploadCandidate(value[0])) {
          valToProcess = value[0];
          data[key] = valToProcess;
        }

        if (typeof window !== 'undefined' && (valToProcess instanceof File || valToProcess instanceof Blob)) {
          uploadPromises.push(
            uploadFileToDrive(valToProcess, 'Bookings', data.category || 'Uncategorized', data.date)
              .then(uploaded => ({ key, uploaded }))
          );
        } else if (valToProcess && typeof valToProcess === 'object' && !Array.isArray(valToProcess)) {
          data[key] = JSON.stringify(valToProcess);
        }
      }

      const uploadResults = await Promise.all(uploadPromises);
      for (const result of uploadResults) {
        data[result.key] = JSON.stringify(result.uploaded);
      }
    } catch (err) {
      toast.error((err as { message?: string }).message || "Failed to upload file");
      setIsSubmittingLocal(false);
      return;
    }

    const formDataObj = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && !Array.isArray(value)) {
          formDataObj.append(key, JSON.stringify(value));
        } else if (Array.isArray(value)) {
          formDataObj.append(key, value.join(', '));
        } else {
          formDataObj.append(key, value as string);
        }
      }
    });

    // Check for recordDate
    const recordDateField = getAllFields(layoutSchema).find(f => f.isRecordDate);
    if (recordDateField) {
      const recordDateValue = data[STANDARD_FIELD_MAP[recordDateField.id] || recordDateField.id];
      if (recordDateValue) {
        formDataObj.append('recordDate', recordDateValue as string);
      }
    }

    const result = await saveBookingAction(formDataObj);

    if (result.success && result.data) {
      // Work on copies so the transaction ids picked up here land in state via setInstallments.
      const newInstallments = installments.map(inst => ({ ...inst }));
      const needsReSave = await syncInstallmentTransactions(newInstallments, result.data, data.title);
      setInstallments(newInstallments);

      if (needsReSave) {
        formDataObj.set('id', result.data.id);
        formDataObj.set('installments', JSON.stringify(newInstallments));
        await saveBookingAction(formDataObj);
      }

      toast.success(isEditing ? "Booking updated successfully!" : "Booking created successfully!");

      // Use SWR mutate to update cache immediately without full page reload
      mutate(
        (key) => typeof key === 'string' && (key.startsWith('/api/bookings') || key.startsWith('/api/dashboard') || key.startsWith('/api/transactions')),
        undefined,
        { revalidate: true }
      );
      router.refresh();

      onSaved();
    } else {
      toast.error("Failed to save booking. Please check your inputs.");
    }
    setIsSubmittingLocal(false);
  };

  const onError = (errors: FieldErrors<BookingFormData>) => {
    const firstError = Object.keys(errors)[0];
    if (firstError) scrollToField(firstError, false);
  };

  return { onSubmit, onError, isSubmittingLocal };
}
