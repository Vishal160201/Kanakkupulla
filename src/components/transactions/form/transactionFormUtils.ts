// Pure helpers for the layout-driven add/edit transaction form.
import { uploadFileToDrive } from "@/lib/uploadHelper";
import type {
  EditableTransaction,
  TransactionFieldOption,
  TransactionFormSchema,
  TransactionFormState,
  TransactionVisibilityRule,
} from "@/types/transactions";

/** Layout field ids that map onto top-level Transaction columns. */
export const standardFieldMap: Record<string, string> = {
  fld_tx_amount: 'amount',
  fld_tx_type: 'type',
  fld_tx_date: 'date',
  fld_tx_category: 'category',
  fld_tx_mode: 'paymentMode',
  fld_tx_desc: 'description',
};

export const fieldNameOf = (fieldId: string) => standardFieldMap[fieldId] || fieldId;

/** "a, b" or ["a", "b"] → ["a", "b"]; anything else → []. */
export const splitSelection = (value: unknown): string[] =>
  typeof value === 'string' && value.trim()
    ? value.split(',').map((s) => s.trim())
    : (Array.isArray(value) ? (value as string[]) : []);

/** Text shown in a plain input: falsy values render as an empty string. */
export const textValue = (value: unknown): string => (value ? String(value) : "");

export const optionValue = (opt: TransactionFieldOption) =>
  typeof opt === 'string' ? opt : (opt.value || opt.label);

export const optionLabel = (opt: TransactionFieldOption) =>
  typeof opt === 'string' ? opt : (opt.label || opt.value || '');

export function evaluateVisibility(rule: TransactionVisibilityRule | undefined, form: TransactionFormState) {
  if (!rule) return true;

  const dependsOnKey = rule.dependsOn || rule.fieldId;
  if (!dependsOnKey) return true;

  const depFieldName = fieldNameOf(dependsOnKey);
  const depValue = form[depFieldName] !== undefined
    ? form[depFieldName]
    : form[dependsOnKey];

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

/** Form state for editing an existing (single or grouped) transaction. */
export function buildEditFormState(editTransaction: EditableTransaction): TransactionFormState {
  const formState: TransactionFormState = {
    amount: String(editTransaction.amount),
    type: editTransaction.type,
    date: new Date(editTransaction.date as string).toISOString(),
    category: editTransaction.category,
    paymentMode: editTransaction.paymentMode,
    description: editTransaction.description || "",
    status: editTransaction.status,
    ...(editTransaction.customData || {}),
    shopId: editTransaction.shopId ?? "",
  };

  if (editTransaction.items && Array.isArray(editTransaction.items)) {
    editTransaction.items.forEach((item) => {
      formState[`amount_${item.category}`] = String(item.amount);
    });
  }
  return formState;
}

/** Blank form seeded with each layout field's default plus URL / caller presets. */
export function buildDefaultFormState(
  layoutSchema: TransactionFormSchema,
  presetType: string | null | undefined,
  presetCategory: string | null | undefined,
  now: Date
): TransactionFormState {
  const defaultForm: TransactionFormState = { type: "INCOME", status: "SETTLED", date: now.toISOString() };
  layoutSchema.sections.forEach((sec) => {
    sec.fields.forEach((f) => {
      const fname = fieldNameOf(f.id);
      if ((f.type === "PICK_LIST" || f.type === "MULTI_PICKLIST") && f.options && f.options.length > 0) {
        if (fname !== "category") {
          defaultForm[fname] = f.options[0];
        } else {
          defaultForm[fname] = "";
        }
      } else if (f.type === "STATUS_PICKER" && f.statusOptions && f.statusOptions.length > 0) {
        defaultForm[fname] = f.statusOptions[0].label;
      } else if (!defaultForm[fname]) {
        defaultForm[fname] = "";
      }
    });
  });
  if (presetType) defaultForm.type = presetType;
  if (presetCategory) defaultForm.category = presetCategory;
  return defaultForm;
}

export function validateTransactionForm(form: TransactionFormState, layoutSchema: TransactionFormSchema | null | undefined) {
  const errs: Record<string, string> = {};
  if (layoutSchema?.sections) {
    layoutSchema.sections.forEach((sec) => {
      sec.fields.forEach((f) => {
        const fname = fieldNameOf(f.id);
        if (f.mandatory) {
          const val = form[fname];
          if (val === undefined || val === null || val === "") {
            errs[fname] = `${f.name} is required.`;
          }
        }
      });
    });
  }

  const selectedCategoryArray = splitSelection(form.category);

  if (selectedCategoryArray.length > 1) {
    let allValid = true;
    selectedCategoryArray.forEach((cat) => {
      const catAmount = parseFloat(textValue(form[`amount_${cat}`]) || "0");
      if (isNaN(catAmount) || catAmount <= 0) {
        errs[`amount_${cat}`] = "Required";
        allValid = false;
      }
    });
    if (!allValid) {
      errs.category = "Enter valid amounts for all selected categories.";
    }
    delete errs.amount;
  } else {
    const parsedAmount = parseFloat(textValue(form.amount) || "0");
    if (form.amount !== undefined && (isNaN(parsedAmount) || parsedAmount <= 0)) {
      errs.amount = "Enter a valid positive amount.";
    }
  }

  return errs;
}

const isUploadable = (value: unknown): value is File | Blob =>
  typeof window !== 'undefined' && (value instanceof File || value instanceof Blob);

const looksLikeAttachment = (first: unknown) =>
  first instanceof File ||
  first instanceof Blob ||
  (typeof first === 'object' && (first as { driveFile?: unknown }).driveFile) ||
  (typeof first === 'string' && (first.startsWith('data:') || first.includes('driveFile')));

/**
 * Unwraps single-attachment arrays and uploads any local files to Drive,
 * replacing them in `payload` with the stored Drive file reference.
 */
export async function uploadPayloadFiles(payload: TransactionFormState) {
  const uploadPromises: Promise<{ key: string; uploaded: { driveFile: unknown } }>[] = [];
  for (const key in payload) {
    let valToProcess = payload[key];
    if (Array.isArray(valToProcess) && valToProcess.length > 0) {
      const first: unknown = valToProcess[0];
      if (looksLikeAttachment(first)) {
         valToProcess = first;
         payload[key] = valToProcess;
      }
    }

    if (isUploadable(valToProcess)) {
      uploadPromises.push(
        uploadFileToDrive(valToProcess, 'Transactions', textValue(payload.category) || 'Uncategorized', payload.date as string | undefined)
          .then(uploaded => ({ key, uploaded }))
      );
    }
  }

  const uploadResults = await Promise.all(uploadPromises);
  for (const result of uploadResults) {
    payload[result.key] = result.uploaded.driveFile;
  }
}

/** Copies the layout's "record date" field into `payload.recordDate`. */
export function applyRecordDate(payload: TransactionFormState, layoutSchema: TransactionFormSchema | null | undefined) {
  if (!layoutSchema?.sections) return;
  const recordDateField = layoutSchema.sections
    .flatMap((s) => s.fields)
    .find((f) => f.isRecordDate);
  if (recordDateField) {
    const fname = fieldNameOf(recordDateField.id);
    if (payload[fname]) {
      payload.recordDate = payload[fname];
    }
  }
}

/** One payload per selected category, each carrying its own `amount_<cat>` value. */
export function buildCategoryPayloads(payload: TransactionFormState, categories: string[]) {
  return categories.map((cat) => {
    const catPayload = { ...payload };
    catPayload.category = cat;
    catPayload.amount = parseFloat(textValue(catPayload[`amount_${cat}`]) || "0");
    categories.forEach((c) => delete catPayload[`amount_${c}`]);
    return catPayload;
  });
}
