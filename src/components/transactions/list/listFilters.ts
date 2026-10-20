// URL-driven filter state for the "All Transactions" ledger.

export interface ListFilterParams {
  view: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  categories: string | null;
  amountMin: string | null;
  amountMax: string | null;
  type: string | null;
  paymentMode: string | null;
  month: string | null;
}

/** Draft values edited in the "Advanced Filters" dialog before applying. */
export interface TempFilters {
  dateFrom: string;
  dateTo: string;
  categories: string;
  amountMin: string;
  amountMax: string;
  type: string;
  paymentMode: string;
}

export const EMPTY_TEMP_FILTERS: TempFilters = {
  dateFrom: '',
  dateTo: '',
  categories: '',
  amountMin: '',
  amountMax: '',
  type: 'ALL',
  paymentMode: 'ALL'
};

export const PAGE_SIZE = 25;

export function readFilterParams(searchParams: URLSearchParams): ListFilterParams {
  return {
    view: searchParams.get('view'),
    dateFrom: searchParams.get('dateFrom'),
    dateTo: searchParams.get('dateTo'),
    categories: searchParams.get('categories'),
    amountMin: searchParams.get('amountMin'),
    amountMax: searchParams.get('amountMax'),
    type: searchParams.get('type'),
    paymentMode: searchParams.get('paymentMode'),
    month: searchParams.get('month')
  };
}

export function tempFiltersFromParams(filterParams: ListFilterParams): TempFilters {
  return {
    dateFrom: filterParams.dateFrom || '',
    dateTo: filterParams.dateTo || '',
    categories: filterParams.categories || '',
    amountMin: filterParams.amountMin || '',
    amountMax: filterParams.amountMax || '',
    type: filterParams.type || 'ALL',
    paymentMode: filterParams.paymentMode || 'ALL'
  };
}

/** Writes the dialog's draft filters into a copy of the current URL params. */
export function applyTempFilters(current: URLSearchParams, tempFilters: TempFilters): URLSearchParams {
  const params = new URLSearchParams(current.toString());
  if (tempFilters.dateFrom) params.set('dateFrom', tempFilters.dateFrom); else params.delete('dateFrom');
  if (tempFilters.dateTo) params.set('dateTo', tempFilters.dateTo); else params.delete('dateTo');
  if (tempFilters.categories) params.set('categories', tempFilters.categories.trim()); else params.delete('categories');
  if (tempFilters.amountMin) params.set('amountMin', tempFilters.amountMin); else params.delete('amountMin');
  if (tempFilters.amountMax) params.set('amountMax', tempFilters.amountMax); else params.delete('amountMax');
  if (tempFilters.type && tempFilters.type !== 'ALL') params.set('type', tempFilters.type); else params.delete('type');
  if (tempFilters.paymentMode && tempFilters.paymentMode !== 'ALL') params.set('paymentMode', tempFilters.paymentMode); else params.delete('paymentMode');

  if (tempFilters.dateFrom || tempFilters.dateTo) {
    params.delete('view');
    params.delete('month');
  }
  return params;
}

/** Query string sent to GET /api/transactions (without the page number). */
export function buildListQuery(filterParams: ListFilterParams): string {
  const hasCustomDateRange = filterParams.dateFrom || filterParams.dateTo;
  const params = new URLSearchParams();
  if (filterParams.view && !hasCustomDateRange) params.append('view', filterParams.view);
  if (filterParams.dateFrom) params.append('dateFrom', filterParams.dateFrom);
  if (filterParams.dateTo) params.append('dateTo', filterParams.dateTo);
  if (filterParams.categories) params.append('categories', filterParams.categories);
  if (filterParams.amountMin) params.append('amountMin', filterParams.amountMin);
  if (filterParams.amountMax) params.append('amountMax', filterParams.amountMax);
  if (filterParams.type) params.append('type', filterParams.type);
  if (filterParams.paymentMode) params.append('paymentMode', filterParams.paymentMode);
  if (filterParams.month && filterParams.view === 'month' && !hasCustomDateRange) params.append('month', filterParams.month);
  return params.toString();
}

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** URL params selecting the Sunday–Saturday week containing `dateStr`. */
export function weekParamsFromDate(current: URLSearchParams, dateStr: string): URLSearchParams {
  const d = new Date(dateStr);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // End of week (Saturday)

  const params = new URLSearchParams(current.toString());
  params.set('view', 'week');
  params.set('dateFrom', toDateStr(start));
  params.set('dateTo', toDateStr(end));
  return params;
}

/** URL params selecting the month containing `dateStr`. */
export function monthParamsFromDate(current: URLSearchParams, dateStr: string): URLSearchParams {
  const d = new Date(dateStr);
  const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  const params = new URLSearchParams(current.toString());
  params.set('view', 'month');
  params.set('month', val);
  params.delete('dateFrom');
  params.delete('dateTo');
  return params;
}
