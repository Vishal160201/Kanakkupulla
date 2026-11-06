// Studio dates are Indian calendar days; format in IST so a server in UTC never shows the day before.
const long = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
const short = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

const valid = (d: Date | string | null | undefined): Date | null => {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? null : date;
};

/** "28 June 2026", or undefined for a missing/invalid date (so the line is left out). */
export const formatDate = (d: Date | string | null | undefined): string | undefined => {
  const date = valid(d);
  return date ? long.format(date) : undefined;
};

/** "3 Nov" for payment steps. */
export const formatShortDate = (d: Date | string | null | undefined): string | undefined => {
  const date = valid(d);
  return date ? short.format(date) : undefined;
};
