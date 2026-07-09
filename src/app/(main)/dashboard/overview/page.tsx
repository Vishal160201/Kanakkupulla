"use client";

import Link from "next/link";
import useSWR from "swr";
import { Suspense, useState, useMemo } from "react";
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";
import { useRouter } from "next/navigation";
import OverdueBookingBanners from "@/components/bookings/OverdueBookingBanners";
import DashboardDateRangePicker from "@/components/dashboard/DashboardDateRangePicker";
import RevenueChart from "@/components/dashboard/RevenueChart";
import BookingBreakdown from "@/components/dashboard/BookingBreakdown";
import QuickActions from "@/components/dashboard/QuickActions";
import TaskAlerts from "@/components/dashboard/TaskAlerts";
import RevenueTarget from "@/components/dashboard/RevenueTarget";
import StatCards from "@/components/dashboard/StatCards";
import { usePermissions } from "@/hooks/usePermissions";

const CATEGORY_ICONS: Record<string, string> = {
  "Photography Session": "ph-camera",
  "Equipment": "ph-wrench",
  "Utilities": "ph-lightning",
  "Rent": "ph-house",
  "Software": "ph-code",
  "Travel": "ph-airplane",
  "Marketing": "ph-megaphone",
  "Misc": "ph-dots-three-circle",
};

const MODE_ICONS: Record<string, string> = {
  "UPI": "ph-qr-code",
  "Cash": "ph-money",
  "Bank Transfer": "ph-bank",
  "Card": "ph-credit-card",
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch');
  if (data.error) throw new Error(data.error);
  return data;
};

function DashboardMetrics({ dateRange }: { dateRange: { startDate: Date; endDate: Date } | null }) {
  const router = useRouter();
  const { openBookingDetails } = useGlobalForm();
  const { checkPermission } = usePermissions();
  const canViewAnalytics = checkPermission('view_export_analytics');
  
  const query = useMemo(() => {
    if (!dateRange) return '';
    return `?startDate=${dateRange.startDate.toISOString()}&endDate=${dateRange.endDate.toISOString()}`;
  }, [dateRange]);

  const { data, error, isLoading } = useSWR(`/api/dashboard/overview${query}`, fetcher);

  if (isLoading) return <DashboardSkeleton />;
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
        <div className="flex-1 lg:w-[65%] min-w-0">
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
          <BookingBreakdown data={bookingBreakdownData} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm flex flex-col min-h-[350px]">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-[1.1rem] font-extrabold text-slate-900 tracking-tight">Recent Transactions</h3>
              <p className="text-slate-400 text-[0.75rem] font-medium">For selected period</p>
            </div>
            <Link href="/transactions" className="text-[0.7rem] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors">
              View All
            </Link>
          </div>

          <div className="flex-1 flex flex-col gap-3 mt-2">
            {(!transactions || transactions.length === 0) ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400">
                <i className="ph ph-receipt text-3xl mb-2 opacity-50"></i>
                <p className="font-medium text-sm">No transactions.</p>
              </div>
            ) : (
              transactions.slice(0, 5).map((txn: any) => {
                let title = txn.description ? txn.description.split(' - ')[0] : txn.category;
                const isGifts = txn.category === 'GIFTS_AND_FRAMES';
                let isAdvance = false;
                let isDue = false;
                if (isGifts && txn.description) {
                  const match = txn.description.match(/\(([^)]+)\)$/);
                  if (match) title = match[1];
                  if (txn.description.startsWith('Advance')) isAdvance = true;
                  if (txn.description.startsWith('Due')) isDue = true;
                }

                return (
                  <div key={txn.id} className="flex items-center justify-between group py-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        txn.type === 'INCOME' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'
                      }`}>
                        <i className={`ph-bold ${txn.type === 'INCOME' ? 'ph-arrow-down-left' : 'ph-arrow-up-right'}`}></i>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-900 font-bold text-[0.85rem]">{title}</span>
                          <span className={`text-[0.55rem] font-bold px-1.5 py-0.5 rounded-md uppercase ${
                            txn.type === 'INCOME' ? 'bg-emerald-100/50 text-emerald-600' : 'bg-red-100/50 text-red-600'
                          }`}>{txn.type}</span>
                          {isGifts && isAdvance && (
                            <span className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded-md uppercase bg-blue-50 text-blue-600">ADV</span>
                          )}
                          {isGifts && isDue && (
                            <span className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded-md uppercase bg-red-50 text-red-600">DUE</span>
                          )}
                        </div>
                        <span className="text-slate-400 text-[0.7rem] flex items-center gap-1">
                          <span className="truncate max-w-[120px] uppercase text-[10px]">{isGifts ? 'GIFTS & FRAMES' : txn.category}</span> &middot;
                          <i className={`ph-fill ${MODE_ICONS[txn.paymentMode] || 'ph-wallet'}`}></i> {txn.paymentMode}
                        </span>
                      </div>
                    </div>
                  <div className="flex flex-col items-end">
                    <span className="text-slate-400 text-[0.65rem] font-semibold">
                      {new Date(txn.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, {new Date(txn.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`font-extrabold text-[0.95rem] ${txn.type === 'INCOME' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {txn.type === 'INCOME' ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>

        {/* Upcoming Shoots */}
        <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm flex flex-col min-h-[350px]">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-[1.1rem] font-extrabold text-slate-900 tracking-tight">Upcoming Shoots</h3>
            </div>
            <Link href="/bookings/overview" className="text-[0.7rem] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors">
              View Calendar <i className="ph-bold ph-arrow-right"></i>
            </Link>
          </div>

          <div className="flex-1 flex flex-col gap-4 mt-2">
            {(!upcomingShoots || upcomingShoots.length === 0) ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400">
                <i className="ph ph-calendar-blank text-3xl mb-2 opacity-50"></i>
                <p className="font-medium text-sm">No upcoming shoots.</p>
              </div>
            ) : (
              upcomingShoots.slice(0, 3).map((shoot: any) => (
                <div key={shoot.id} onClick={() => openBookingDetails(shoot.id)} className="bg-orange-50/50 rounded-xl p-3 border border-orange-100 flex items-center justify-between cursor-pointer hover:bg-orange-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-500 flex items-center justify-center shrink-0">
                      <i className="ph-fill ph-camera text-xl"></i>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-900 font-bold text-[0.85rem] truncate max-w-[150px] uppercase">{shoot.client?.name}</span>
                      <span className="text-slate-500 text-[0.7rem] mt-0.5">
                        {new Date(shoot.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}, {shoot.time}
                      </span>
                      <span className="text-slate-400 text-[0.65rem] uppercase">{shoot.location}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-orange-500 text-[0.65rem] font-bold bg-orange-100 px-2 py-0.5 rounded-md uppercase">Pending</span>
                    <div className="flex flex-col items-end">
                      <span className="text-slate-400 text-[0.6rem] font-semibold uppercase tracking-wider">Amount</span>
                      <span className="text-slate-900 font-extrabold text-[0.9rem]">₹{shoot.order?.package?.toLocaleString('en-IN') || '0'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {upcomingShoots && upcomingShoots.length > 0 && (
            <Link href="/bookings/allBookings" className="mt-4 text-center text-[0.75rem] font-bold text-slate-500 hover:text-slate-900 transition-colors">
              View All Shoots <i className="ph-bold ph-arrow-right"></i>
            </Link>
          )}
        </div>

        {/* Gift Shop Tracking */}
        <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-sm flex flex-col min-h-[350px]">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-[1.1rem] font-extrabold text-slate-900 tracking-tight">Gift Shop Tracking</h3>
            </div>
            <i className="ph-fill ph-shopping-cart text-slate-300 text-lg"></i>
          </div>

          <div className="flex-1 flex flex-col mt-2">
            {!topOrder ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400">
                <i className="ph ph-package text-3xl mb-2 opacity-50"></i>
                <p className="font-medium text-sm">No active orders.</p>
              </div>
            ) : (
              <div onClick={() => router.push('/gifts')} className="cursor-pointer group">
                <div className="flex justify-between items-end mb-3">
                  <span className="font-extrabold text-slate-900 text-[0.95rem]">{topOrder.product?.name} ({topOrder.quantity}x)</span>
                  <span className="font-bold text-slate-500 text-[0.7rem] uppercase">{topOrder.status}</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div className={`h-full rounded-full transition-all duration-1000 ${
                    topOrder.status === 'PENDING' ? 'bg-amber-500 w-[20%]' :
                    topOrder.status === 'PROCESSING' ? 'bg-blue-500 w-[50%]' :
                    topOrder.status === 'SHIPPED' ? 'bg-indigo-500 w-[80%]' : 'bg-emerald-500 w-[100%]'
                  }`}></div>
                </div>
                <div className="text-[0.7rem] font-semibold text-slate-500">For: {topOrder.clientName}</div>
              </div>
            )}
          </div>
          {topOrder && (
            <Link href="/gifts" className="mt-auto pt-4 text-center text-[0.75rem] font-bold text-slate-500 hover:text-slate-900 transition-colors">
              View All Orders <i className="ph-bold ph-arrow-right"></i>
            </Link>
          )}
        </div>
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
