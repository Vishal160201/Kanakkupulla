// Category / payment-mode icons and colours shared by the transactions views.

export interface CategoryColorClasses {
  bg: string;
  text: string;
  stroke: string;
}

export const categoryColors: Record<string, { bg: string; stroke: string }> = {
  "Photography Session": { bg: "bg-emerald-500", stroke: "#10b981" },
  "Equipment": { bg: "bg-amber-500", stroke: "#f59e0b" },
  "Utilities": { bg: "bg-slate-700", stroke: "#334155" },
  "Rent": { bg: "bg-slate-900", stroke: "#0f172a" },
  "Software": { bg: "bg-violet-500", stroke: "#8b5cf6" },
  "Travel": { bg: "bg-sky-500", stroke: "#0ea5e9" },
  "Marketing": { bg: "bg-rose-500", stroke: "#f43f5e" },
  "Misc": { bg: "bg-slate-300", stroke: "#cbd5e1" },
  "Booking Advance": { bg: "bg-blue-500", stroke: "#3b82f6" },
  "Passport Photo": { bg: "bg-pink-500", stroke: "#ec4899" },
  "Frame Sales": { bg: "bg-orange-500", stroke: "#f97316" },
  "Editing Charges": { bg: "bg-amber-700", stroke: "#b45309" },
  "Album Payment": { bg: "bg-violet-500", stroke: "#8b5cf6" },
  "Tea & Snacks": { bg: "bg-sky-500", stroke: "#0ea5e9" },
  "Fuel": { bg: "bg-red-500", stroke: "#ef4444" },
  "Bus Fare": { bg: "bg-indigo-500", stroke: "#6366f1" },
  "System Repair": { bg: "bg-purple-500", stroke: "#a855f7" },
  "Printing": { bg: "bg-emerald-500", stroke: "#10b981" },
  "Courier": { bg: "bg-orange-500", stroke: "#f97316" },
  "Other Expense": { bg: "bg-slate-400", stroke: "#94a3b8" }
};

export const CATEGORY_ICONS: Record<string, string> = {
  "Photography Session": "ph-camera",
  "Equipment": "ph-wrench",
  "Utilities": "ph-lightning",
  "Rent": "ph-house",
  "Software": "ph-code",
  "Travel": "ph-airplane",
  "Marketing": "ph-megaphone",
  "Misc": "ph-dots-three-circle",
  "Booking Advance": "ph-calendar-check",
  "Passport Photo": "ph-user",
  "Frame Sales": "ph-frame-corners",
  "Editing Charges": "ph-pencil-circle",
  "Album Payment": "ph-book-open",
  "Tea & Snacks": "ph-coffee",
  "Fuel": "ph-gas-pump",
  "Bus Fare": "ph-bus",
  "System Repair": "ph-wrench",
  "Printing": "ph-printer",
  "Courier": "ph-package",
  "Other Expense": "ph-dots-three-circle"
};

/** Icons for the fertilizer-shop ledger categories (FERTILIZER_TRANSACTION_FORM). */
export const FERTILIZER_CATEGORY_ICONS: Record<string, string> = {
  "Fertilizer Sales": "ph-plant",
  "Credit Collection": "ph-hand-coins",
  "Stock Purchase": "ph-truck",
  "Produce Sales": "ph-scales",
  "Produce Sale Collection": "ph-hand-coins",
  "Produce Payment": "ph-hand-arrow-up",
  "Transport": "ph-truck-trailer",
  "Loading & Unloading": "ph-package",
  "Labour": "ph-users-three",
  "Shop Rent": "ph-storefront",
  "Electricity": "ph-lightning",
};

export const MODE_ICONS: Record<string, string> = {
  "UPI": "ph-qr-code",
  "Cash": "ph-money",
  "Bank Transfer": "ph-bank",
  "Card": "ph-credit-card",
};

export const getRelatableIcon = (cat: string) => {
  if (FERTILIZER_CATEGORY_ICONS[cat]) return FERTILIZER_CATEGORY_ICONS[cat];
  const lowerCat = cat.toLowerCase();
  if (lowerCat.includes('photo') || lowerCat === 'pp') return 'ph-camera';
  if (lowerCat.includes('xerox') || lowerCat.includes('print')) return 'ph-printer';
  if (lowerCat.includes('bus') || lowerCat.includes('travel') || lowerCat.includes('fare') || lowerCat.includes('transport')) return 'ph-bus';
  if (lowerCat.includes('salary') || lowerCat.includes('pay') || lowerCat.includes('wage')) return 'ph-money';
  if (lowerCat.includes('tea') || lowerCat.includes('snack') || lowerCat.includes('food') || lowerCat.includes('coffee')) return 'ph-coffee';
  if (lowerCat.includes('chit') || lowerCat.includes('fund') || lowerCat.includes('invest') || lowerCat.includes('save') || lowerCat.includes('bank')) return 'ph-piggy-bank';
  if (lowerCat.includes('sevai') || lowerCat.includes('service') || lowerCat.includes('online') || lowerCat.includes('bill') || lowerCat.includes('tax')) return 'ph-desktop';
  if (lowerCat.includes('equip') || lowerCat.includes('tool') || lowerCat.includes('repair') || lowerCat.includes('maint')) return 'ph-wrench';
  if (lowerCat.includes('rent') || lowerCat.includes('office') || lowerCat.includes('shop') || lowerCat.includes('room')) return 'ph-house';
  if (lowerCat.includes('fuel') || lowerCat.includes('gas') || lowerCat.includes('petrol') || lowerCat.includes('diesel')) return 'ph-gas-pump';
  if (lowerCat.includes('courier') || lowerCat.includes('post') || lowerCat.includes('delivery')) return 'ph-package';
  if (lowerCat.includes('market') || lowerCat.includes('ad')) return 'ph-megaphone';
  if (lowerCat.includes('book') || lowerCat.includes('advance')) return 'ph-calendar-check';
  if (lowerCat.includes('album') || lowerCat.includes('frame')) return 'ph-book-open';
  if (lowerCat.includes('other') || lowerCat.includes('misc')) return 'ph-dots-three-circle';
  return 'ph-tag';
};

const colorMap: Record<string, CategoryColorClasses> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', stroke: '#34d399' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', stroke: '#fbbf24' },
  slate: { bg: 'bg-slate-50', text: 'text-slate-600', stroke: '#94a3b8' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', stroke: '#a78bfa' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-600', stroke: '#38bdf8' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', stroke: '#fb7185' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', stroke: '#60a5fa' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-600', stroke: '#f472b6' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', stroke: '#fb923c' },
  red: { bg: 'bg-red-50', text: 'text-red-600', stroke: '#f87171' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', stroke: '#818cf8' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', stroke: '#c084fc' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-600', stroke: '#2dd4bf' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', stroke: '#22d3ee' },
  fuchsia: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-600', stroke: '#e879f9' }
};

/** Stable per-category colour (hash of the name), or a named palette entry when given. */
export const getConsistentColorClasses = (cat: string, predefinedColorName?: string): CategoryColorClasses => {
  if (predefinedColorName && colorMap[predefinedColorName]) {
    return colorMap[predefinedColorName];
  }

  const colorValues = Object.values(colorMap).filter(c => c.text !== 'text-slate-600');
  let hash = 0;
  for (let i = 0; i < cat.length; i++) {
    hash = cat.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colorValues[Math.abs(hash) % colorValues.length];
};

/** Colour for a category, preferring its entry in `categoryColors`. */
export const getCategoryColorClasses = (cat: string): CategoryColorClasses => {
  const definedBg = categoryColors[cat]?.bg;
  const colorName = definedBg ? definedBg.split('-')[1] : undefined;
  return getConsistentColorClasses(cat, colorName);
};

/**
 * Gift-shop entries (category GIFTS_AND_FRAMES) carry the product name in
 * trailing parentheses and an "Advance"/"Due" prefix in the description.
 */
export const getGiftsBadgeInfo = (
  tx: { category: string; description?: string | null },
  defaultTitle: string
) => {
  let title = defaultTitle;
  const isGifts = tx.category === 'GIFTS_AND_FRAMES';
  let isAdvance = false;
  let isDue = false;
  if (isGifts && tx.description) {
    const match = tx.description.match(/\(([^)]+)\)$/);
    if (match) title = match[1];
    if (tx.description.startsWith('Advance')) isAdvance = true;
    if (tx.description.startsWith('Due')) isDue = true;
  }
  return { title, isGifts, isAdvance, isDue };
};
