const digits = (amount: number) =>
  Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: Number.isInteger(Math.round(amount * 100) / 100) ? 0 : 2,
    maximumFractionDigits: 2,
  });

/** "₹41,000" / "₹1,250.50" (paise only when there are some). */
export const formatCurrency = (amount: number): string => `${amount < 0 ? '-' : ''}₹${digits(amount)}`;

/** "41,000" without the sign, for the big serif amount (Playfair has no ₹ glyph). */
export const formatAmountDigits = (amount: number): string => digits(amount);
