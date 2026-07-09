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
  const { openBookingDetails, openTransactionDetails, openGiftOrderDetails } = useGlobalForm();
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
        <div className="bg-white rounded-3xl p-5 lg:p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col flex-1 group/card hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] transition-shadow duration-500">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-[1.05rem] font-black text-slate-800 tracking-tight">Upcoming Shoots</h3>
            </div>
            <Link href="/bookings/overview" className="text-[0.7rem] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg hover:bg-amber-100 flex items-center gap-1 transition-colors">
              <i className="ph-fill ph-calendar-check"></i> View shoots
            </Link>
          </div>

          <div className="flex-1 flex flex-col gap-2.5 mt-1">
            {(!upcomingShoots || upcomingShoots.length === 0) ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400">
                <i className="ph ph-calendar-blank text-3xl mb-2 opacity-50"></i>
                <p className="font-medium text-sm">No upcoming shoots.</p>
              </div>
            ) : (
              upcomingShoots.slice(0, 3).map((shoot: any) => (
                <div key={shoot.id} onClick={() => openBookingDetails(shoot.id)} className="bg-gradient-to-r from-orange-50/50 to-amber-50/50 hover:from-orange-50 hover:to-amber-50 rounded-2xl p-3 border border-orange-100/50 flex items-center justify-between cursor-pointer transition-all duration-300 hover:shadow-[0_8px_20px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 hover:scale-[1.01] relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm text-orange-500 flex items-center justify-center shrink-0 border border-orange-100/50">
                      <i className="ph-fill ph-camera text-xl"></i>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-slate-800 font-extrabold text-[0.85rem] truncate max-w-[140px] uppercase tracking-tight">{shoot.client?.name}</span>
                      <span className="text-slate-500 font-bold text-[0.65rem] flex items-center gap-1">
                        <i className="ph-bold ph-calendar-blank text-slate-400"></i>
                        {new Date(shoot.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}, {shoot.time}
                      </span>
                      <span className="text-slate-400 font-bold text-[0.6rem] uppercase tracking-widest flex items-center gap-1 mt-0.5">
                        <i className="ph-bold ph-map-pin text-slate-300"></i> {shoot.location}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-orange-600 text-[0.6rem] font-black bg-white shadow-sm px-2 py-0.5 rounded-md uppercase tracking-wider border border-orange-100">Pending</span>
                    <div className="flex flex-col items-end">
                      <span className="text-slate-400 text-[0.6rem] font-bold uppercase tracking-widest">Amount</span>
                      <span className="text-slate-800 font-black text-[0.95rem] tracking-tight">₹{shoot.order?.package?.toLocaleString('en-IN') || '0'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-3xl p-5 lg:p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col min-h-[340px] group/card hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] transition-shadow duration-500">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-[1.05rem] font-black text-slate-800 tracking-tight">Recent Transactions</h3>
              <p className="text-slate-400 text-[0.65rem] font-bold mt-1 uppercase tracking-wider">For selected period</p>
            </div>
            <Link href="/transactions" className="text-[0.7rem] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg hover:bg-indigo-100 flex items-center gap-1 transition-colors">
              View All <i className="ph-bold ph-arrow-right"></i>
            </Link>
          </div>

          <div className="flex-1 flex flex-col gap-0.5 mt-1">
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
                  <div key={txn.id} onClick={() => openTransactionDetails(txn.id)} className="flex items-center justify-between group py-2 px-3 -mx-3 rounded-2xl hover:bg-white cursor-pointer transition-all duration-300 hover:shadow-[0_8px_20px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 hover:scale-[1.01] relative z-10">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                        txn.type === 'INCOME' ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-emerald-500/20' : 'bg-gradient-to-br from-red-400 to-red-500 text-white shadow-red-500/20'
                      }`}>
                        <i className={`ph-bold text-base ${txn.type === 'INCOME' ? 'ph-arrow-down-left' : 'ph-arrow-up-right'}`}></i>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-800 font-extrabold text-[0.8rem] truncate max-w-[120px]">{title}</span>
                          <span className={`text-[0.55rem] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            txn.type === 'INCOME' ? 'bg-emerald-100/50 text-emerald-700' : 'bg-red-100/50 text-red-700'
                          }`}>{txn.type}</span>
                          {isGifts && isAdvance && (
                            <span className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded uppercase bg-blue-100 text-blue-700">ADV</span>
                          )}
                          {isGifts && isDue && (
                            <span className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded uppercase bg-rose-100 text-rose-700">DUE</span>
                          )}
                        </div>
                        <span className="text-slate-400 text-[0.65rem] font-medium flex items-center gap-1.5">
                          <span className="truncate max-w-[100px] uppercase text-[9px] font-bold tracking-wider">{isGifts ? 'GIFTS & FRAMES' : txn.category}</span> &middot;
                          <span className="flex items-center gap-1 text-[10px]"><i className={`ph-fill ${MODE_ICONS[txn.paymentMode] || 'ph-wallet'}`}></i> {txn.paymentMode}</span>
                        </span>
                      </div>
                    </div>
                  <div className="flex flex-col items-end gap-0.5 pl-2 shrink-0">
                    <span className="text-slate-400 text-[0.6rem] font-bold uppercase tracking-wider whitespace-nowrap">
                      {new Date(txn.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, {new Date(txn.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`font-black text-[0.95rem] tracking-tight ${txn.type === 'INCOME' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {txn.type === 'INCOME' ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>

        <BookingBreakdown data={bookingBreakdownData} />

        {/* Gift Shop Tracking */}
        <div className="bg-white rounded-3xl p-5 lg:p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col min-h-[340px] group/card hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] transition-shadow duration-500">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-[1.05rem] font-black text-slate-800 tracking-tight">Gift Shop Tracking</h3>
            </div>
            <Link href="/gifts" className="text-[0.7rem] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg hover:bg-emerald-100 flex items-center gap-1 transition-colors">
              <i className="ph-fill ph-shopping-cart"></i> View orders
            </Link>
          </div>

          <div className="flex-1 flex flex-col mt-1">
            {!topOrder ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400">
                <i className="ph ph-package text-3xl mb-2 opacity-30"></i>
                <p className="font-bold text-xs tracking-wide">No active orders</p>
              </div>
            ) : (
              <div onClick={() => openGiftOrderDetails(topOrder.id)} className="cursor-pointer group p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white transition-all duration-300 hover:shadow-[0_8px_20px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 hover:scale-[1.01] relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <span className="font-black text-slate-800 text-[0.95rem] tracking-tight">{topOrder.product?.name} ({topOrder.quantity}x)</span>
                  <span className={`font-black text-[0.6rem] uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    topOrder.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                    topOrder.status === 'PROCESSING' ? 'bg-blue-100 text-blue-700' :
                    topOrder.status === 'SHIPPED' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>{topOrder.status}</span>
                </div>
                <div className="h-3 bg-slate-200/60 rounded-full overflow-hidden mb-4 p-0.5">
                  <div className={`h-full rounded-full transition-all duration-1000 shadow-sm relative overflow-hidden ${
                    topOrder.status === 'PENDING' ? 'bg-gradient-to-r from-amber-400 to-amber-500 w-[20%]' :
                    topOrder.status === 'PROCESSING' ? 'bg-gradient-to-r from-blue-400 to-blue-500 w-[50%]' :
                    topOrder.status === 'SHIPPED' ? 'bg-gradient-to-r from-indigo-400 to-indigo-500 w-[80%]' : 'bg-gradient-to-r from-emerald-400 to-emerald-500 w-[100%]'
                  }`}>
                    <div className="absolute inset-0 bg-white/20 w-full h-full -skew-x-12 translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]"></div>
                  </div>
                </div>
                <div className="text-[0.75rem] font-bold text-slate-500 flex items-center gap-1.5">
                  <span className="text-slate-400">For:</span> <span className="text-slate-700">{topOrder.clientName}</span>
                </div>
              </div>
            )}
          </div>

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
