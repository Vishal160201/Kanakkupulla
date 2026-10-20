"use client";

import useSWR from "swr";
import { Suspense, useState, useMemo } from "react";
import OverdueBookingBanners from "@/components/bookings/OverdueBookingBanners";
import DashboardDateRangePicker from "@/components/dashboard/DashboardDateRangePicker";
import RevenueChart from "@/components/dashboard/RevenueChart";
import BookingBreakdown from "@/components/dashboard/BookingBreakdown";
import QuickActions from "@/components/dashboard/QuickActions";
import TaskAlerts from "@/components/dashboard/TaskAlerts";
import RevenueTarget from "@/components/dashboard/RevenueTarget";
import StatCards from "@/components/dashboard/StatCards";
import { usePermissions } from "@/hooks/usePermissions";
import { useShopQueryParam } from "@/components/providers/ShopProvider";
import ShopSwitcher from "@/components/shops/ShopSwitcher";
import { GiftShopCard, RecentTransactionsCard, UpcomingShootsCard } from "./DashboardCards";
import type { DashboardOverviewResponse } from "./types";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch');
  if (data.error) throw new Error(data.error);
  return data;
};

function DashboardMetrics({ dateRange }: { dateRange: { startDate: Date; endDate: Date } | null }) {
  const { checkPermission } = usePermissions();
  const canViewAnalytics = checkPermission('view_export_analytics');
  // Ledger figures (income, expense, revenue chart, recent transactions) follow the shop switcher.
  const shopParam = useShopQueryParam();

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (dateRange) {
      params.set('startDate', dateRange.startDate.toISOString());
      params.set('endDate', dateRange.endDate.toISOString());
    }
    const qs = [params.toString(), shopParam].filter(Boolean).join('&');
    return qs ? `?${qs}` : '';
  }, [dateRange, shopParam]);

  const { data, error, isLoading } = useSWR<DashboardOverviewResponse>(
    shopParam === null ? null : `/api/dashboard/overview${query}`,
    fetcher
  );

  if (isLoading || shopParam === null) return <DashboardSkeleton />;
  if (error || !data) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">
        <h3 className="font-bold mb-1">Failed to load dashboard data</h3>
        <p className="text-sm">{error?.message || 'Unknown error occurred'}</p>
      </div>
    );
  }

  const {
    totalBookings,
    upcomingShoots,
    pendingRetouch,
    topOrder,
    totalActiveOrders,
    transactions,
    periodIncome,
    periodExpense,
    hotDatesCount,
    revenueChartData,
    bookingBreakdownData
  } = data;

  const showHotDates = typeof hotDatesCount === 'number' && hotDatesCount > 0;

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        <div className="flex-1 lg:w-[65%] min-w-0 flex flex-col">
          <TaskAlerts />
          <StatCards 
            totalBookings={totalBookings}
            pendingRetouch={pendingRetouch}
            hotDatesCount={hotDatesCount}
            totalActiveOrders={totalActiveOrders}
            showHotDates={showHotDates}
          />
          {canViewAnalytics && (
            <RevenueChart data={revenueChartData} periodIncome={periodIncome} periodExpense={periodExpense} />
          )}
        </div>
        
        <div className="w-full lg:w-[35%] shrink-0 flex flex-col gap-6">
          {canViewAnalytics && <RevenueTarget currentRevenue={periodIncome} />}
          {/* Upcoming Shoots */}
          <UpcomingShootsCard upcomingShoots={upcomingShoots} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <RecentTransactionsCard transactions={transactions} />

        <BookingBreakdown data={bookingBreakdownData} />

        {/* Gift Shop Tracking */}
        <GiftShopCard topOrder={topOrder} />
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8 w-full animate-pulse">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 lg:w-[65%]">
          <div className="bg-white rounded-2xl h-[100px] mb-6 border border-gray-100"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl h-[110px] border border-gray-100"></div>
            ))}
          </div>
          <div className="bg-white rounded-2xl h-[350px] border border-gray-100"></div>
        </div>
        <div className="w-full lg:w-[35%] flex flex-col gap-6">
          <div className="bg-white rounded-2xl h-[180px] border border-gray-100"></div>
          <div className="bg-white rounded-2xl h-[300px] border border-gray-100"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl h-[350px] border border-gray-100"></div>
        <div className="bg-white rounded-2xl h-[350px] border border-gray-100"></div>
        <div className="bg-white rounded-2xl h-[350px] border border-gray-100"></div>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [dateRange, setDateRange] = useState<{ startDate: Date; endDate: Date } | null>(null);

  return (
    <section id="view-dashboard" className="flex flex-col gap-5 w-full max-w-[1400px] mx-auto pb-20 pt-4 bg-[#fafafa] min-h-screen">
      <OverdueBookingBanners />

      <ShopSwitcher note="Income, expenses and recent transactions follow the selected shop. Bookings and gift orders are studio-wide." />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <QuickActions />
        <div className="ml-auto flex items-center justify-end z-20">
          <DashboardDateRangePicker onRangeChange={setDateRange} />
        </div>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardMetrics dateRange={dateRange} />
      </Suspense>
    </section>
  );
}
