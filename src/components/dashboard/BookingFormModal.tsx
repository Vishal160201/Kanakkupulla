"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { UserItem } from "../ui/MultiUserPicklist";
import { bookingSchema, BookingFormData } from "@/lib/validations/booking";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";
import type { BookingDetailResponse, BookingListItem, Installment, LayoutResponse, TeamUser, VisibilityRule } from "@/types/bookings";
import { evaluateVisibilityRule, getAllFields, getRuleDependency, STANDARD_FIELD_MAP } from "@/components/bookings/layoutUtils";
import { BASE_DEFAULT_VALUES, buildAddDefaults, buildEditFormValues, buildEditInstallments, newInstallment, todayIso } from "@/components/bookings/booking-form/formDefaults";
import { useBookingFormSubmit } from "@/components/bookings/booking-form/useBookingFormSubmit";
import DynamicField from "@/components/bookings/booking-form/DynamicField";
import InstallmentsFields from "@/components/bookings/booking-form/InstallmentsFields";
import BookingFormSection from "@/components/bookings/booking-form/BookingFormSection";
import { toast } from "sonner";
import DeleteTransactionDialog from "@/components/transactions/list/DeleteTransactionDialog";

type UsersResponse = TeamUser[] | { users?: TeamUser[] };

const parseCurrency = (str: string) => parseFloat(str.replace(/,/g, '')) || 0;
const formatCurrencyInput = (num: number) => num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function BookingFormModalInner() {
  const { isBookingFormOpen, bookingToEditId, bookingInitialDate, closeBookingForm } = useGlobalForm();

  const { data: fetchedBooking, isLoading: isBookingLoading } = useSWR<BookingDetailResponse>(
    bookingToEditId ? `/api/bookings/${bookingToEditId}` : null,
    fetcher
  );

  const booking = bookingToEditId ? fetchedBooking : null;
  const selectedDateForNew = bookingInitialDate;
  const isAddModalOpen = isBookingFormOpen;

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: BASE_DEFAULT_VALUES
  });
  const { register, handleSubmit, reset, setValue, getValues, watch, clearErrors, formState: { errors, isSubmitting } } = form;

  const [isMultiInstallment, setIsMultiInstallment] = useState(false);
  const [installments, setInstallments] = useState<Installment[]>(() => [newInstallment()]);

  const { data: layoutData } = useSWR<LayoutResponse>("/api/settings/layouts/BOOKING_FORM", fetcher);
  const { data: usersData } = useSWR<UsersResponse>("/api/users", fetcher);
  const { data: driveStatus } = useSWR<{ connected: boolean }>("/api/integrations/google", fetcher);

  const selectedDateStr = watch('date');
  // keepPreviousData: while another date's bookings load, availability keeps using the last loaded list.
  const { data: bookingsData } = useSWR<{ items?: BookingListItem[] }>(
    selectedDateStr ? `/api/bookings?startDate=${selectedDateStr}&endDate=${selectedDateStr}` : null,
    fetcher,
    { keepPreviousData: true }
  );

  const layoutSchema = layoutData?.schema?.sections ? layoutData.schema : null;
  const allBookings = bookingsData ? (bookingsData.items || []) : [];
  const teamUsers: UserItem[] = useMemo(() => {
    if (!usersData) return [];
    const staff = (Array.isArray(usersData) ? usersData : usersData?.users ?? []).filter(u => u.role !== 'CLIENT');
    return staff.map(u => ({ id: u.id, name: u.name || 'Unknown', image: u.image, role: u.role ?? '' }));
  }, [usersData]);

  // Per-booking state is re-derived whenever the form opens for a booking (edit) or a new one (add):
  // edit mode takes the booking's installments, add mode starts from a single empty row.
  // The form itself is reset from effects since react-hook-form is an external store.
  const isAddSession = isAddModalOpen && !isBookingLoading && !bookingToEditId;
  const prefillKey = isAddModalOpen && !isBookingLoading && booking && layoutSchema ? `edit:${booking.id}` : (isAddSession ? 'add' : null);
  const [prefill, setPrefill] = useState<{ key: string | null; values: BookingFormData | null }>({ key: null, values: null });
  if (prefill.key !== prefillKey) {
    if (prefillKey?.startsWith('edit:') && booking) {
      const values = buildEditFormValues(booking);
      const next = buildEditInstallments(booking, values);
      setPrefill({ key: prefillKey, values });
      setIsMultiInstallment(next.isMulti);
      setInstallments(next.installments);
    } else {
      if (prefillKey === 'add') {
        setIsMultiInstallment(false);
        setInstallments([newInstallment()]);
      }
      setPrefill({ key: prefillKey, values: null });
    }
  }

  useEffect(() => {
    if (prefill.values) reset(prefill.values);
  }, [prefill, reset]);

  // Add mode default initialization
  useEffect(() => {
    if (isAddSession) {
      reset(buildAddDefaults(layoutSchema, selectedDateForNew || todayIso()));
      clearErrors();
    }
  }, [isAddSession, selectedDateForNew, reset, clearErrors, layoutSchema]);

  const packageValue = watch('package');
  const advanceValue = watch('advance');
  useEffect(() => {
    // If installments change, auto-update the advance
    if (installments.length > 0) {
      const sum = installments.reduce((acc, curr) => acc + parseCurrency(curr.amount || '0'), 0);
      setValue('advance', sum > 0 ? sum.toString() : '');
    }

    const total = parseCurrency(getValues('package') || '0');
    const advance = parseCurrency(getValues('advance') || '0');
    const outstanding = Math.max(0, total - advance);
    if (total > 0 || advance > 0) {
      setValue('due', formatCurrencyInput(outstanding));
    } else {
      setValue('due', '');
    }
  }, [packageValue, advanceValue, installments, setValue, getValues]);

  // Mandatory layout fields are registered inside DynamicField (so hidden fields don't block submit)
  // and custom-component validation happens in onSubmit.
  const formValues = watch();

  const evaluateVisibility = (rule: VisibilityRule | null | undefined) => {
    const dependsOnKey = getRuleDependency(rule);
    if (!rule || !dependsOnKey) return true;

    const depFieldName = STANDARD_FIELD_MAP[dependsOnKey] || dependsOnKey;
    const depValue = formValues[depFieldName] !== undefined ? formValues[depFieldName] : formValues[dependsOnKey];
    return evaluateVisibilityRule(rule, depValue);
  };

  const { onSubmit, onError, isSubmittingLocal } = useBookingFormSubmit({
    form,
    layoutSchema,
    evaluateVisibility,
    installments,
    setInstallments,
    isEditing: !!booking,
    onSaved: closeBookingForm,
  });

  const currentDate = watch('date');
  const currentTime = watch('time');

  const usersWithAvailability = teamUsers.map(user => {
    const isBusy = allBookings.some(b => {
      if (booking && b.id === booking.id) return false;

      const bDateStr = typeof b.date === 'string' ? b.date.split('T')[0] : '';
      if (bDateStr === currentDate && b.time === currentTime) {
        if (b.customData) {
          return Object.values(b.customData).some(val => typeof val === 'string' && val.includes(user.id));
        }
      }
      return false;
    });
    return { ...user, isBusy };
  });

  // Index of a saved installment awaiting delete confirmation (unsaved rows are removed directly)
  const [pendingDeleteIdx, setPendingDeleteIdx] = useState<number | null>(null);
  const [isDeletingInstallment, setIsDeletingInstallment] = useState(false);

  const removeInstallmentRow = (idx: number) => setInstallments(rows => rows.filter((_, i) => i !== idx));

  const handleDeleteInstallment = (idx: number) => {
    if (installments[idx]?.transactionId) setPendingDeleteIdx(idx);
    else removeInstallmentRow(idx);
  };

  const confirmDeleteInstallment = async () => {
    if (pendingDeleteIdx === null) return;
    const inst = installments[pendingDeleteIdx];
    setIsDeletingInstallment(true);
    try {
      const res = await fetch(`/api/transactions/${inst.transactionId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Payment moved to the recycle bin');
      removeInstallmentRow(pendingDeleteIdx);
      setPendingDeleteIdx(null);
    } catch {
      toast.error('Failed to delete payment');
    } finally {
      setIsDeletingInstallment(false);
    }
  };

  const statusFieldId = getAllFields(layoutSchema).find(f => f.type === 'STATUS_PICKER')?.id;
  const totalAdvance = installments.reduce((sum, inst) => sum + (parseFloat(inst.amount) || 0), 0);
  const outstandingBalance = (parseFloat((packageValue || '0').toString().replace(/,/g, '')) || 0) - totalAdvance;
  const isSaving = isSubmitting || isSubmittingLocal;

  return (
    <Dialog open={isAddModalOpen} onOpenChange={(open) => {
      if (!open) { closeBookingForm(); }
    }}>
      <DialogContent className="max-w-[800px] sm:max-w-[800px] w-[95vw] sm:w-full p-0 bg-transparent overflow-visible border-0 shadow-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, type: "spring", bounce: 0.4 }}
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90dvh] relative overflow-hidden"
        >
        <DialogHeader className="bg-slate-50 border-b border-gray-100 px-5 py-5 sm:px-10 sm:py-8 relative shrink-0">
          <div className="flex flex-col">
            <span className="text-[0.65rem] sm:text-[0.75rem] font-bold text-orange-500 uppercase tracking-[1px] mb-1 sm:mb-2">Booking Registration</span>
            <DialogTitle className="text-[1.4rem] sm:text-[1.8rem] font-extrabold text-slate-900 leading-tight">
              {booking ? "Edit Booking" : "Create Studio Booking"}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="px-5 py-5 sm:px-10 sm:py-8 flex-1 overflow-y-auto">
          <form id="booking-form" noValidate onSubmit={handleSubmit(onSubmit, onError)} className="hidden">
            <input type="hidden" {...register('installments')} value={JSON.stringify(installments)} />
          </form>
          {layoutSchema && layoutSchema.sections ? (
            layoutSchema.sections.map(section => {
              if (section.visibilityRule && !evaluateVisibility(section.visibilityRule)) {
                return null;
              }

              return (
                <BookingFormSection
                  key={section.id}
                  section={section}
                  statusFieldId={statusFieldId}
                  isEditing={!!booking}
                  errors={errors}
                  evaluateVisibility={evaluateVisibility}
                  renderField={(field) => (
                    <DynamicField
                      field={field}
                      form={form}
                      users={usersWithAvailability}
                      driveStatus={driveStatus}
                      categoryName={formValues.category || "Uncategorized"}
                    />
                  )}
                  installmentsSlot={
                    <InstallmentsFields
                      key="installments-section"
                      installments={installments}
                      setInstallments={setInstallments}
                      isMultiInstallment={isMultiInstallment}
                      setIsMultiInstallment={setIsMultiInstallment}
                      onDeleteInstallment={handleDeleteInstallment}
                    />
                  }
                  outstandingBalance={outstandingBalance}
                />
              );
            })
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-500">
               <div className="w-5 h-5 border-2 border-slate-300 border-t-orange-500 rounded-full animate-spin mr-3"></div> Loading form layout...
            </div>
          )}
        </div>
        <div className="bg-slate-50 border-t border-gray-100 px-5 py-4 sm:px-10 sm:py-6 flex justify-end gap-3 rounded-b-2xl sm:rounded-b-3xl shrink-0">
          <button type="button" className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-full font-bold text-[0.85rem] sm:text-[0.95rem] bg-transparent text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer" onClick={() => closeBookingForm()}>Cancel</button>
          <button type="button" className="px-5 py-2 sm:px-6 sm:py-2.5 rounded-full font-bold text-[0.85rem] sm:text-[0.95rem] bg-orange-500 text-white shadow-md hover:bg-orange-600 hover:-translate-y-[1px] hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50" disabled={isSaving} onClick={handleSubmit(onSubmit, onError)}>
            <i className="ph-fill ph-calendar-plus"></i> {isSaving ? "Saving..." : booking ? "Save Changes" : "Confirm"}
          </button>
        </div>
        </motion.div>
      </DialogContent>
      <DeleteTransactionDialog
        open={pendingDeleteIdx !== null}
        isDeleting={isDeletingInstallment}
        onCancel={() => setPendingDeleteIdx(null)}
        onConfirm={confirmDeleteInstallment}
      />
    </Dialog>
  );
}

export default function BookingFormModal() {
  return (
    <Suspense fallback={null}>
      <BookingFormModalInner />
    </Suspense>
  );
}
