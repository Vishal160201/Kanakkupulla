// Shared shapes for the Transactions area (ledger list, overview, add/edit
// form, details modal). Money fields arrive from the API as plain numbers.

import type { ShopSummary } from "./shops";

export type TransactionType = "INCOME" | "EXPENSE";

/**
 * Where an entry came from when another module posted it (Fertilizer Inventory).
 * Such entries are locked in the ledger: the API answers 409 to edits and deletes.
 */
export interface TransactionSource {
  kind: "SALE" | "PURCHASE" | "CREDIT_PAYMENT" | "PRODUCE_SALE" | "PRODUCE_PAYMENT" | "PRODUCE_RECEIPT";
  id: string;
  billNumber?: string | null;
}

/** A transaction row as returned by the list / overview APIs. */
export interface Transaction {
  id: string;
  transactionId?: string | null;
  amount: number;
  type: TransactionType;
  date: string;
  category: string;
  paymentMode: string;
  description?: string | null;
  status?: string;
  attachmentUrl?: string | null;
  bookingId?: string | null;
  productOrderId?: string | null;
  groupId?: string | null;
  /** Shop the entry belongs to. */
  shopId?: string | null;
  shop?: ShopSummary | null;
  /** Set for entries created by the inventory (locked); null for normal entries. */
  source?: TransactionSource | null;
  /** Free-form layout field values; shape depends on the form layout. */
  customData?: unknown;
}

// ---------------------------------------------------------------------------
// GET /api/transactions
// ---------------------------------------------------------------------------

export interface TransactionListResponse {
  items: Transaction[];
  total: number;
  page?: number;
  pageSize?: number;
}

/** A multi-category entry collapsed into one row in the ledger list. */
export interface TransactionListGroup extends Transaction {
  isGroup: true;
  children: Transaction[];
  totalAmount: number;
  categoryNames: string[];
}

export type TransactionListItem = Transaction | TransactionListGroup;

// ---------------------------------------------------------------------------
// GET /api/transactions/overview
// ---------------------------------------------------------------------------

export interface TransactionsOverviewResponse {
  totalIncome?: number;
  totalExpenses?: number;
  expensesByCategory?: Record<string, number>;
  recentTransactions?: Transaction[];
  todayTransactions?: Transaction[];
  todayIncome?: number;
  todayExpense?: number;
  todayNet?: number;
}

/** A multi-category entry collapsed into one row in "Today's Transactions". */
export interface TodayTransactionGroup {
  isGroup: true;
  id: string;
  groupId: string;
  category: string;
  type: TransactionType;
  amount: number;
  date: string;
  paymentMode: string;
  shop?: ShopSummary | null;
  children: Transaction[];
}

export type TodayTransactionItem = Transaction | TodayTransactionGroup;

// ---------------------------------------------------------------------------
// Transaction form layout (GET /api/settings/layouts/TRANSACTION_FORM, or
// FERTILIZER_TRANSACTION_FORM for fertilizer shops)
// ---------------------------------------------------------------------------

/** Options are saved as strings; older layouts may hold {label, value} objects. */
export type TransactionFieldOption = string | { label?: string; value?: string };

export interface TransactionVisibilityRule {
  dependsOn?: string;
  fieldId?: string;
  operator?: string;
  values?: string[];
  value?: string;
}

export interface TransactionStatusOption {
  label: string;
  color?: string;
}

export interface TransactionFormField {
  id: string;
  name: string;
  type: string;
  mandatory?: boolean;
  options?: TransactionFieldOption[];
  statusOptions?: TransactionStatusOption[];
  placeholder?: string;
  visibilityRule?: TransactionVisibilityRule;
  isRecordDate?: boolean;
  restrictFutureDate?: boolean;
}

export interface TransactionFormSection {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  fields: TransactionFormField[];
  visibilityRule?: TransactionVisibilityRule;
}

export interface TransactionFormSchema {
  sections: TransactionFormSection[];
}

export interface TransactionLayoutResponse {
  schema?: TransactionFormSchema | null;
}

/** Values held by the add/edit form, keyed by standard name or layout field id. */
export type TransactionFormState = Record<string, unknown>;

/** Record loaded into the add/edit form (single or bulk GET, or initial data). */
export interface EditableTransaction {
  id?: string;
  amount?: number | string;
  type?: string;
  date?: string;
  category?: string;
  paymentMode?: string;
  description?: string | null;
  status?: string;
  shopId?: string | null;
  shop?: ShopSummary | null;
  customData?: Record<string, unknown> | null;
  source?: TransactionSource | null;
  items?: { category: string; amount: number | string }[];
}

export interface TransactionEditResponse {
  transaction?: EditableTransaction;
}

// ---------------------------------------------------------------------------
// GET /api/transactions/[id]
// ---------------------------------------------------------------------------

export interface TransactionCustomField {
  id: string;
  label: string;
  type: string;
  value: unknown;
}

export interface TransactionDetail {
  id: string;
  transactionId: string;
  amount: number;
  type: TransactionType;
  date: string;
  category: string;
  paymentMode: string;
  description?: string | null;
  status: string;
  attachmentUrl?: string | null;
  bookingId?: string | null;
  shopId?: string | null;
  shop?: ShopSummary | null;
  booking?: {
    id: string;
    bookingNumber?: string | null;
    category: string;
    client: { name: string };
  } | null;
  user?: { id: string; name?: string | null; email?: string | null } | null;
  productOrder?: { id: string; orderNumber?: string | null } | null;
  /** Set for entries created by the inventory (locked); null for normal entries. */
  source?: TransactionSource | null;
  customFields: TransactionCustomField[];
}

export interface TransactionImpact {
  dayIncome: number;
  dayExpenses: number;
  dayNet: number;
  categoryTotal: number;
  categoryShare: number;
}

export interface TransactionDetailResponse {
  transaction: TransactionDetail;
  impact: TransactionImpact;
}
