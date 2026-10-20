"use client";

import React from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useShopQueryParam, useShops } from "@/components/providers/ShopProvider";
import type { TransactionLayoutResponse, TransactionsOverviewResponse } from "@/types/transactions";
import {
  buildHeatmapSegments,
  buildQuickAddCategories,
  buildTodaySegments,
  buildWeeklyFlow,
  netForMode,
  sumTodayByCategory,
} from "@/components/transactions/overview/overviewData";
import OverviewKpiCards from "@/components/transactions/overview/OverviewKpiCards";
import TodayCategoryCard from "@/components/transactions/overview/TodayCategoryCard";
import QuickAddCategories from "@/components/transactions/overview/QuickAddCategories";
import TodayTransactionsPanel from "@/components/transactions/overview/TodayTransactionsPanel";
import ExpenseHeatmapCard from "@/components/transactions/overview/ExpenseHeatmapCard";
import IncomeFlowCard from "@/components/transactions/overview/IncomeFlowCard";
import DailyNetTrendCard from "@/components/transactions/overview/DailyNetTrendCard";
import SmartInsightBanner from "@/components/transactions/overview/SmartInsightBanner";

export default function OverviewPage() {
  const shopParam = useShopQueryParam();
  const { activeShopId, shops } = useShops();
  const showShop = activeShopId === "all" && shops.length > 1;

  const queryStr = React.useMemo(() => {
    const todayDate = new Date();
    const yearStart = new Date(todayDate.getFullYear(), 0, 1);
    return `?startDate=${yearStart.toISOString()}`;
  }, []);

  // Held back (null) until the active shop is known; the shop is part of the key.
  const overviewKey = shopParam === null ? null : `/api/transactions/overview${queryStr}${shopParam ? `&${shopParam}` : ''}`;
  const { data, isLoading } = useSWR<TransactionsOverviewResponse>(overviewKey, fetcher);
  const { data: layoutRes } = useSWR<TransactionLayoutResponse>('/api/settings/layouts/TRANSACTION_FORM', fetcher);

  if (isLoading || !data || !overviewKey) {
    return <div className="flex justify-center items-center h-64"><div className="animate-pulse w-8 h-8 rounded-full bg-orange-500"></div></div>;
  }

  const {
    totalIncome = 0,
    totalExpenses = 0,
    expensesByCategory = {},
    recentTransactions: transactions = [],
    todayTransactions = [],
    todayIncome = 0,
    todayExpense = 0,
    todayNet = 0
  } = data;

  const today = new Date();

  const donutSegments = buildHeatmapSegments(expensesByCategory, totalExpenses);
  const highestExpenseCategory = donutSegments.length > 0 ? donutSegments[0] : null;
  const weeklyFlow = buildWeeklyFlow(transactions, today);

  const todayIncomeSegments = buildTodaySegments(sumTodayByCategory(todayTransactions, 'INCOME', todayIncome));
  const todayExpenseSegments = buildTodaySegments(sumTodayByCategory(todayTransactions, 'EXPENSE', todayExpense));

  return (
    <div className="animate-fade-in w-full">
      {/* KPI Cards — Always same row */}
      <OverviewKpiCards
        todayIncome={todayIncome}
        todayExpense={todayExpense}
        todayNet={todayNet}
        todayCashNet={netForMode(todayTransactions, 'cash')}
        todayUpiNet={netForMode(todayTransactions, 'upi')}
        highestExpenseCategory={highestExpenseCategory}
      />

      {/* Row 2: Income & Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8 items-start">
        {/* Card 1: Income Sources */}
        <TodayCategoryCard
          title="Income Sources (Today)"
          headerClassName="p-4 sm:p-5 pb-2"
          emptyText="No income recorded today"
          totalLabel="Total Income"
          total={todayIncome}
          segments={todayIncomeSegments}
          formatAmount={(amount) => amount.toLocaleString('en-IN')}
          formatPct={(pct) => String(Math.round(pct * 100))}
          animationDelay="300ms"
          footer={
            <div className="border-t border-slate-100 p-3 flex justify-end mt-auto">
              <Link href="/transactions/allTransactions?view=day&type=INCOME" className="text-blue-600 font-bold text-[0.8rem] hover:text-blue-700 flex items-center gap-1 px-2">
                View all income <i className="ph-bold ph-arrow-right"></i>
              </Link>
            </div>
          }
        />

        {/* Card 2: Expense Breakdown */}
        <TodayCategoryCard
          title="Expense Breakdown (Today)"
          headerClassName="p-4 sm:p-5 pb-2 flex justify-between items-start"
          emptyText="No expenses recorded today"
          totalLabel="Total Expense"
          total={todayExpense}
          segments={todayExpenseSegments}
          legendLimit={4}
          formatAmount={(amount) => amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          formatPct={(pct) => (pct * 100).toFixed(1)}
          animationDelay="400ms"
          footer={
            <div className="border-t border-slate-100 p-3 flex justify-start mt-auto">
              <Link href="/transactions/allTransactions?view=day&type=EXPENSE" className="text-orange-500 font-bold text-[0.8rem] hover:text-orange-600 flex items-center gap-1 px-2">
                View all expenses <i className="ph-bold ph-arrow-right"></i>
              </Link>
            </div>
          }
        />
      </div>

      {/* Quick Add Transaction */}
      <QuickAddCategories categories={buildQuickAddCategories(layoutRes)} />

      <TodayTransactionsPanel
        overviewKey={overviewKey}
        today={today}
        todayIncome={todayIncome}
        todayExpense={todayExpense}
        todayNet={todayNet}
        todayTransactions={todayTransactions}
        showShop={showShop}
      />

      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">Weekly performance</h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-0.5">Expenses, income, and net movement in one view</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm">
          <i className="ph-bold ph-calendar-blank text-indigo-500"></i>
          Last 7 days
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xl:gap-5 mb-8 items-stretch">
        {/* Expense Heatmap Card */}
        <ExpenseHeatmapCard totalExpenses={totalExpenses} segments={donutSegments} />

        {/* Income Flow by Day Card */}
        <IncomeFlowCard
          totalIncome={totalIncome}
          dayLabels={weeklyFlow.dayLabels}
          actualFlow={weeklyFlow.actualFlow}
          maxFlow={weeklyFlow.maxFlow}
        />

        {/* Daily Net Trend Card */}
        <DailyNetTrendCard {...weeklyFlow} />
      </div>

      {/* Smart Insight Banner */}
      <SmartInsightBanner highestExpenseCategory={highestExpenseCategory} />
    </div>
  );
}
