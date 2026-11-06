export interface PaymentStep {
  label: string;
  state: 'done' | 'due' | 'overdue';
  /** "Paid · 3 Nov" / "Due · Before event" */
  caption: string;
  amount: string;
}

export interface PaymentProgress {
  percentage: number;
  paid: string;
  total: string;
  steps: PaymentStep[];
}
