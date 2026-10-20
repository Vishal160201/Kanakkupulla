// Shared shapes for the Transactions area (ledger list, overview, add/edit
// form, details modal). Money fields arrive from the API as plain numbers.

export type TransactionType = "INCOME" | "EXPENSE";

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
  children: Transaction[];
}

export type TodayTransactionItem = Transaction | TodayTransactionGroup;

// ---------------------------------------------------------------------------
// Transaction form layout (GET /api/settings/layouts/TRANSACTION_FORM)
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
  customData?: Record<string, unknown> | null;
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
  booking?: {
    id: string;
    bookingNumber?: string | null;
    category: string;
    client: { name: string };
  } | null;
  user?: { id: string; name?: string | null; email?: string | null } | null;
  productOrder?: { id: string; orderNumber?: string | null } | null;
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
