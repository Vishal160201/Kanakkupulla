import type { Transaction } from "@/types/transactions";

// Response shape of GET /api/dashboard/overview.

export interface DashboardShoot {
  id: string;
  date: string;
  time?: string | null;
  location?: string | null;
  client?: { name?: string | null } | null;
  order?: { package?: number | null } | null;
}

export interface DashboardTopOrder {
  id: string;
  product?: { name?: string | null } | null;
  quantity: number;
  status: string;
  clientName?: string | null;
}

export interface DashboardOverviewResponse {
  totalBookings: number;
  upcomingShoots?: DashboardShoot[];
  pendingRetouch: number;
  topOrder: DashboardTopOrder | null;
  totalActiveOrders: number;
  transactions?: Transaction[];
  periodIncome: number;
  periodExpense: number;
  periodNet?: number;
  hotDatesCount: number;
  revenueChartData: { date: string; income: number; expense: number }[];
  bookingBreakdownData?: { id: string; clientName: string; status: string; date: string }[];
  unconfirmedBookingsCount?: number;
  error?: string;
}
