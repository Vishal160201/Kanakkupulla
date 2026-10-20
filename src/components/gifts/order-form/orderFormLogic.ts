import { uploadFileToDrive } from "@/lib/uploadHelper";
import type { GiftLayoutSchema, GiftProduct, GiftVisibilityRule } from "@/types/gifts";

/** Form state: standard keys (productId, amount, ...) plus raw layout field ids. */
export type OrderFormData = Record<string, unknown>;

/** Layout field id -> payload key for the standard (non-custom) gift order fields. */
export const STANDARD_FIELD_MAP: Record<string, string> = {
  fld_g_product: 'productId',
  fld_g_quantity: 'quantity',
  fld_g_amount: 'amount',
  fld_g_advance: 'advanceAmount',
  fld_g_due: 'dueAmount',
  fld_g_due_date: 'dueDate',
  fld_g_payment_mode: 'paymentMode',
  fld_g_client_name: 'clientName',
  fld_g_client_phone: 'clientPhone'
};

export const fieldKey = (fieldId: string) => STANDARD_FIELD_MAP[fieldId] || fieldId;

/** Evaluates a layout visibility rule against the given form state. */
export function isRuleVisible(rule: GiftVisibilityRule | null | undefined, state: OrderFormData): boolean {
  if (!rule) return true;

  const dependsOnKey = rule.dependsOn || rule.fieldId;
  if (!dependsOnKey) return true;

  const depFieldName = fieldKey(dependsOnKey);
  const depValue = state[dependsOnKey] !== undefined ? state[dependsOnKey] : state[depFieldName];

  const ruleValues: string[] = rule.values || (rule.value ? [rule.value] : []);

  if (rule.operator === 'EQUALS') {
    return ruleValues.includes(depValue as string);
  } else if (rule.operator === 'NOT_EQUALS') {
    return !ruleValues.includes(depValue as string);
  } else if (rule.operator === 'CONTAINS') {
    if (typeof depValue === 'string') {
      return ruleValues.some(v => depValue.includes(v));
    }
    if (Array.isArray(depValue)) {
      return ruleValues.some(v => depValue.includes(v));
    }
    return false;
  }

  // For pure dependsOn + values format without operator
  if (rule.dependsOn && Array.isArray(rule.values) && !rule.operator) {
    return rule.values.includes(depValue as string);
  }

  return true;
}

/** Applies a field change: stores the mapped key and the raw field id, recomputes due, clears hidden fields. */
export function applyFieldChange(
  prev: OrderFormData,
  fieldId: string,
  value: unknown,
  products: GiftProduct[],
  layoutSchema: GiftLayoutSchema | null | undefined
): OrderFormData {
  const key = fieldKey(fieldId);

  let displayValue = value;
  if (key === 'productId') {
    const prod = products.find((p) => p.id === value);
    if (prod) displayValue = prod.name;
  }

  // Store both the standard mapped key and the raw field ID (with display label) so dependsOn can match
  const next: OrderFormData = { ...prev, [key]: value, [fieldId]: displayValue };

  if (key === 'amount' || key === 'advanceAmount') {
    const t = Number(next.amount) || 0;
    const a = Number(next.advanceAmount) || 0;
    next.dueAmount = Math.max(0, t - a).toString();
  }

  // On every change, evaluate visibility and clear hidden fields
  if (layoutSchema && layoutSchema.sections) {
    layoutSchema.sections.forEach((section) => {
      section.fields?.forEach((f) => {
        const rule = f.visibility || f.visibilityRule;
        if (rule && !isRuleVisible(rule, next)) {
          const fKey = fieldKey(f.id);
          delete next[fKey];
          delete next[f.id];
        }
      });
    });
  }

  return next;
}

/** Mandatory-field validation for visible sections/fields. */
export function validateOrderForm(layoutSchema: GiftLayoutSchema | null | undefined, formData: OrderFormData) {
  const errors: Record<string, string> = {};
  let hasError = false;
  if (layoutSchema && layoutSchema.sections) {
    layoutSchema.sections.forEach((section) => {
      if (!isRuleVisible(section.visibilityRule, formData)) return;
      section.fields.forEach((field) => {
        if (!isRuleVisible(field.visibilityRule, formData)) return;
        const key = fieldKey(field.id);
        if (field.mandatory && !formData[key]) {
          errors[key] = `${field.name} is required`;
          hasError = true;
        }
      });
    });
  }
  return { errors, hasError };
}

/** True when the layout's record-date field is set to a day before today. */
export function isRecordDateBackdated(layoutSchema: GiftLayoutSchema | null | undefined, formData: OrderFormData) {
  if (!layoutSchema) return false;
  let past = false;
  layoutSchema.sections?.forEach((sec) => {
    sec.fields?.forEach((fld) => {
      if (fld.isRecordDate) {
        const val = formData[fieldKey(fld.id)];
        if (val) {
          const selectedDate = new Date(val as string);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          selectedDate.setHours(0, 0, 0, 0);
          if (selectedDate < today) past = true;
        }
      }
    });
  });
  return past;
}

export interface GiftOrderPayload {
  productId: unknown;
  quantity: number;
  clientName: unknown;
  clientPhone: unknown;
  amount: number;
  advanceAmount?: number;
  dueAmount?: number;
  dueDate: unknown;
  createTransaction: boolean;
  paymentMode: unknown;
  customData: Record<string, unknown>;
  recordDate?: unknown;
  advanceDate?: string;
}

const isFileLike = (value: unknown): value is File | Blob =>
  typeof window !== 'undefined' && (value instanceof File || value instanceof Blob);

/**
 * Builds the POST /api/gifts/orders payload. Non-standard fields go to customData;
 * local files are uploaded to Drive first (throws if an upload fails).
 */
export async function buildOrderPayload(
  source: OrderFormData,
  products: GiftProduct[],
  layoutSchema: GiftLayoutSchema | null | undefined,
  advanceDate: string | null
): Promise<GiftOrderPayload> {
  // Work on a copy: single-attachment arrays are collapsed to their first item below.
  const formData: OrderFormData = { ...source };

  const payload: GiftOrderPayload = {
    productId: formData.productId,
    quantity: Number(formData.quantity) || 1,
    clientName: formData.clientName || "Unknown",
    clientPhone: formData.clientPhone,
    amount: Number(formData.amount) || 0,
    advanceAmount: formData.advanceAmount ? Number(formData.advanceAmount) : undefined,
    dueAmount: formData.dueAmount ? Number(formData.dueAmount) : undefined,
    dueDate: formData.dueDate,
    createTransaction: true,
    paymentMode: formData.paymentMode || "Cash",
    customData: {}
  };

  // Populate customData with anything that isn't a standard field
  const uploadPromises: Promise<{ key: string; uploaded: Awaited<ReturnType<typeof uploadFileToDrive>> }>[] = [];
  for (const key of Object.keys(formData)) {
    let value = formData[key];
    if (Array.isArray(value) && value.length > 0) {
      const first: unknown = value[0];
      if (first instanceof File || first instanceof Blob || (typeof first === 'object' && (first as { driveFile?: unknown }).driveFile) || (typeof first === 'string' && (first.startsWith('data:') || first.includes('driveFile')))) {
         value = first;
         formData[key] = value;
      }
    }

    if (isFileLike(value)) {
       const categoryName = products.find((p) => p.id === formData.productId)?.name || "Uncategorized";
       uploadPromises.push(
         uploadFileToDrive(value, 'Gifts & Frames', categoryName)
           .then(uploaded => ({ key, uploaded }))
       );
    } else if (!Object.values(STANDARD_FIELD_MAP).includes(key)) {
      payload.customData[key] = value;
    }
  }

  const uploadResults = await Promise.all(uploadPromises);
  for (const result of uploadResults) {
    payload.customData[result.key] = result.uploaded.driveFile;
  }

  // Check for recordDate
  if (layoutSchema?.sections) {
    const recordDateField = layoutSchema.sections
      .flatMap((s) => s.fields)
      .find((f) => f.isRecordDate);
    if (recordDateField) {
      const fname = fieldKey(recordDateField.id);
      if (formData[fname]) {
        payload.recordDate = formData[fname];
      }
    }
  }

  if (advanceDate) {
    payload.advanceDate = advanceDate;
  }

  return payload;
}
