export interface PaymentStep {
  label: string;
  amount: string; // pre-formatted currency string
  completed: boolean;
  date?: string; // pre-formatted date string
}

export interface PaymentProgress {
  percentage: number;
  steps: PaymentStep[];
}
