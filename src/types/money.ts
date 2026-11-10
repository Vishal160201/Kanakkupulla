export type MoneyAccountType = "BANK" | "CREDIT_CARD";

export interface MoneyAccountDTO {
  id: string;
  name: string;
  institution: string;
  type: MoneyAccountType;
  last4: string | null;
  ownIdentifiers: string[];
  isPool: boolean;
  /** Decimal string, e.g. "1000.00" */
  lowBalanceAlert: string;
  cycleStartDay: number | null;
  dueDay: number | null;
  creditLimit: string | null;
  /** Cards: amount used as of outstandingAsOf (YYYY-MM-DD) */
  outstanding: string | null;
  outstandingAsOf: string | null;
  /** Bank accounts with no statement yet: balance typed in, as of manualBalanceAsOf */
  manualBalance: string | null;
  manualBalanceAsOf: string | null;
  color: string;
  sortOrder: number;
  transactionCount: number;
  importCount: number;
}

export interface MoneyAccountInput {
  name: string;
  institution: string;
  type: MoneyAccountType;
  last4?: string | null;
  ownIdentifiers: string[];
  isPool: boolean;
  lowBalanceAlert: string;
  cycleStartDay?: number | null;
  dueDay?: number | null;
  creditLimit?: string | null;
  outstanding?: string | null;
  manualBalance?: string | null;
  color: string;
}
