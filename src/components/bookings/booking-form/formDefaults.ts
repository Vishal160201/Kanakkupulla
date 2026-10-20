import type { BookingFormData } from "@/lib/validations/booking";
import type { BookingDetailResponse, Installment, LayoutSchema } from "@/types/bookings";
import { getAllFields, parseCustomData, STANDARD_FIELD_MAP } from "../layoutUtils";

export const todayIso = () => new Date().toISOString().split('T')[0];

export const newInstallment = (): Installment => ({ amount: '', date: todayIso(), paymentMode: 'Cash' });

export const BASE_DEFAULT_VALUES = {
  title: '', category: 'Wedding', date: '', time: '10:00 AM',
  location: '', phone: '', email: '', package: '', advance: '', due: '', status: 'Confirmed'
};

/** Form values for editing an existing booking (standard columns, falling back to customData). */
export function buildEditFormValues(b: BookingDetailResponse): BookingFormData {
  const parsedCustomData = parseCustomData(b.customData);

  return {
    id: b.id,
    title: b.client?.name || b.title || parsedCustomData.fld_b_client || '',
    phone: b.client?.phone || b.phone || parsedCustomData.fld_b_phone || '',
    email: b.client?.email || b.email || parsedCustomData.fld_b_email || '',
    date: b.date ? (typeof b.date === 'string' ? b.date.split('T')[0] : new Date(b.date).toISOString().split('T')[0]) : (parsedCustomData.fld_b_date || ''),
    time: parsedCustomData.fld_b_time || b.time || '',
    category: b.category || parsedCustomData.fld_b_category || '',
    location: b.location || parsedCustomData.fld_b_location || '',
    status: b.status || parsedCustomData.fld_b_status || '',
    package: b.order?.package ? b.order.package.toString() : (parsedCustomData.fld_b_package || ''),
    advance: b.order?.advance ? b.order.advance.toString() : (parsedCustomData.fld_b_advance || ''),
    due: b.order?.due ? b.order.due.toString() : '',
    ...parsedCustomData
  } as BookingFormData;
}

/** Installment rows for an existing booking: its live transactions, else the stored order installments, else the advance. */
export function buildEditInstallments(b: BookingDetailResponse, formValues: BookingFormData): { installments: Installment[]; isMulti: boolean } {
  const validTransactions = (b.transactions || []).filter(tx => !tx.deletedAt);
  if (validTransactions.length > 0) {
    return {
      isMulti: validTransactions.length > 1,
      installments: validTransactions.sort((a, c) => new Date(a.date).getTime() - new Date(c.date).getTime()).map(tx => ({
        amount: tx.amount.toString(),
        date: new Date(tx.date).toISOString().split('T')[0],
        paymentMode: tx.paymentMode || 'Cash',
        transactionId: tx.id
      })),
    };
  }

  const orderInstallments = b.order?.installments;
  if (orderInstallments && Array.isArray(orderInstallments) && orderInstallments.length > 0) {
    return { isMulti: orderInstallments.length > 1, installments: orderInstallments as Installment[] };
  }

  return {
    isMulti: false,
    installments: [{
      amount: b.order?.advance ? b.order.advance.toString() : ((formValues.advance as string) || ''),
      date: todayIso(),
      paymentMode: (formValues.paymentMode as string) || 'Cash'
    }],
  };
}

/** Defaults for a new booking: base values overridden by the layout's first options / default values. */
export function buildAddDefaults(layoutSchema: LayoutSchema | null, defaultDate: string): BookingFormData {
  const defaultValues: Record<string, unknown> = { ...BASE_DEFAULT_VALUES, date: defaultDate };

  const statusFieldId = getAllFields(layoutSchema).find(f => f.type === 'STATUS_PICKER')?.id || 'fld_b_status';

  layoutSchema?.sections?.forEach(sec => {
    sec.fields.forEach(f => {
      const fname = (f.id === statusFieldId && f.type === 'STATUS_PICKER') ? 'status' : (STANDARD_FIELD_MAP[f.id] || f.id);

      if (f.type === 'STATUS_PICKER' && f.statusOptions && f.statusOptions.length > 0) {
        defaultValues[fname] = f.statusOptions[0].label;
      } else if ((f.type === 'PICK_LIST' || f.type === 'CATEGORY_PICKER' || f.id === 'fld_b_category') && f.options && f.options.length > 0) {
        const first = f.options[0];
        defaultValues[fname] = (typeof first === 'string' ? first : (first.label || first)) || '';
      }

      if (f.defaultValue) {
        defaultValues[fname] = f.defaultValue;
      }
    });
  });

  return defaultValues as BookingFormData;
}
