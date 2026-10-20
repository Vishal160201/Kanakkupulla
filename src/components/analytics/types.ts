// Response shape of GET /api/analytics/unified.

export interface AnalyticsMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  collectionRate: number;
  avgOrderValue: number;
  topEarningCategory: string;
  growthVelocity: string;
}

export interface RevenueIntelligencePoint {
  date: string;
  Bookings: number;
  Gifts: number;
  'Xerox/PP': number;
  Other: number;
  total: number;
  isPeak?: boolean;
}

export interface FunnelStage {
  stage: string;
  count: number;
}

export interface NameValue {
  name: string;
  value: number;
}

export interface GiftsPerformance {
  topProducts: NameValue[];
  statusDistribution: NameValue[];
  totalDiscountGiven?: number;
}

export interface CollectionPoint {
  date: string;
  billed: number;
  collected: number;
  overdue: number;
}

export interface OverdueOrder {
  id: string;
  clientName: string;
  amount: number;
  date?: string;
  products?: string[];
}

export interface ClientTransaction {
  id: string;
  date: string;
  amount: number;
  category: string;
  type: string;
}

export interface TopClient {
  id: string;
  name: string;
  spend: number;
  transactions: ClientTransaction[];
}

export interface DailyTrendPoint {
  date: string;
  income: number;
  expense: number;
}

export interface AnalyticsResponse {
  metrics?: AnalyticsMetrics;
  revenueIntelligence?: RevenueIntelligencePoint[];
  bookingFunnel?: FunnelStage[];
  giftsPerformance?: GiftsPerformance;
  collectionHealth?: { chart: CollectionPoint[]; overdue: OverdueOrder[] };
  clientInsights?: { distribution: NameValue[]; topClients: TopClient[] };
  dailyTrends?: DailyTrendPoint[];
  insights?: string[];
}

export const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

/** Y-axis tick label in thousands of rupees. */
export const formatThousands = (v: number) => `₹${v/1000}k`;
