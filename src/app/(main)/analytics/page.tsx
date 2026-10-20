"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";
import { useShopQueryParam } from "@/components/providers/ShopProvider";
import type { AnalyticsMetrics, AnalyticsResponse, TopClient } from "@/components/analytics/types";
import AnalyticsHeader from "@/components/analytics/AnalyticsHeader";
import { KpiStrip, SmartInsightsPanel } from "@/components/analytics/InsightsAndKpis";
import { DailyTrendsCard, RevenueIntelligenceCard } from "@/components/analytics/RevenueTrendCards";
import { BookingFunnelCard, GiftsPerformanceCard } from "@/components/analytics/FunnelAndGiftsCards";
import { ClientHistoryPanel, ClientInsightsCard, CollectionHealthCard } from "@/components/analytics/CollectionAndClientCards";

const EMPTY_METRICS: AnalyticsMetrics = {
  totalRevenue: 0, totalExpenses: 0, netProfit: 0, collectionRate: 0,
  avgOrderValue: 0, topEarningCategory: "N/A", growthVelocity: "0.0"
};

const ANALYTICS_STYLES = `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .fade-in { animation: fadeIn 0.5s ease-out forwards; }
        .fade-in-up { animation: fadeInUp 0.5s ease-out forwards; opacity: 0; }
        .skeleton-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .history-panel-enter { max-height: 0; opacity: 0; overflow: hidden; transition: all 0.3s ease; margin-top: 0; border-width: 0; padding-top: 0; padding-bottom: 0; }
        .history-panel-enter-active { max-height: 500px; opacity: 1; margin-top: 1.5rem; border-width: 1px; padding-top: 1.25rem; padding-bottom: 1.25rem; }
      `;

export default function AnalyticsPage() {
  const { openGiftOrderDetails } = useGlobalForm();
  const [dateRange, setDateRange] = useState("this-month"); // 'today', 'this-week', 'this-month', 'this-year', 'custom'

  // Confirmed custom date range for API
  const [confirmedCustomRange, setConfirmedCustomRange] = useState({ start: "", end: "" });

  const [activeDateFilter, setActiveDateFilter] = useState<string | null>(null);
  const [activeProductFilter, setActiveProductFilter] = useState<string | null>(null);
  const [activeClient, setActiveClient] = useState<TopClient | null>(null);

  const handleConfirmCustom = (range: { start: string; end: string }) => {
    setConfirmedCustomRange(range);
    setDateRange('custom');
  };

  const handleRangeChange = (range: string) => {
    setDateRange(range);
    // Reset filters
    setActiveDateFilter(null);
    setActiveProductFilter(null);
    setActiveClient(null);
  };

  // Ledger-derived figures follow the shop switcher (held back until the shop is known).
  const shopParam = useShopQueryParam();

  // Query Params
  const queryStr = useMemo(() => {
    let q = `?range=${dateRange}`;
    if (dateRange === 'custom' && confirmedCustomRange.start && confirmedCustomRange.end) {
      q += `&startDate=${confirmedCustomRange.start}&endDate=${confirmedCustomRange.end}`;
    }
    if (shopParam) q += `&${shopParam}`;
    return q;
  }, [dateRange, confirmedCustomRange, shopParam]);

  const { data: analyticsData, isLoading: isFetching } = useSWR<AnalyticsResponse>(
    shopParam === null ? null : `/api/analytics/unified${queryStr}`,
    fetcher
  );
  const isLoading = isFetching || shopParam === null;

  const data: AnalyticsResponse = analyticsData || {};
  const metrics = data.metrics || EMPTY_METRICS;

  const revenueIntelligence = data.revenueIntelligence || [];
  const bookingFunnel = data.bookingFunnel || [];
  const giftsPerformance = data.giftsPerformance || { topProducts: [], statusDistribution: [] };
  const collectionHealth = data.collectionHealth || { chart: [], overdue: [] };
  const clientInsights = data.clientInsights || { distribution: [], topClients: [] };
  const dailyTrends = data.dailyTrends || [];
  const insights = data.insights || [];

  // Derived filtered data
  const filteredDailyTrends = activeDateFilter
    ? dailyTrends.filter((d) => d.date === activeDateFilter)
    : dailyTrends;

  const filteredOverdue = activeProductFilter
    ? collectionHealth.overdue.filter((o) => o.products?.includes(activeProductFilter))
    : collectionHealth.overdue;

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto pb-20 fade-in">
      <style dangerouslySetInnerHTML={{__html: ANALYTICS_STYLES}} />

      {/* Header & Date Toggles */}
      <AnalyticsHeader dateRange={dateRange} onRangeChange={handleRangeChange} onConfirmCustom={handleConfirmCustom} />

      {/* Smart Insights Panel */}
      <SmartInsightsPanel isLoading={isLoading} insights={insights} />

      {/* Section 1: Smart KPI Strip */}
      <KpiStrip metrics={metrics} />

      {/* Grid Layout for Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 fade-in-up delay-300">
        <RevenueIntelligenceCard
          data={revenueIntelligence}
          activeDateFilter={activeDateFilter}
          onDateFilterChange={setActiveDateFilter}
        />

        <DailyTrendsCard data={filteredDailyTrends} />

        <BookingFunnelCard stages={bookingFunnel} />

        <GiftsPerformanceCard
          giftsPerformance={giftsPerformance}
          activeProductFilter={activeProductFilter}
          onProductFilterChange={setActiveProductFilter}
        />

        <CollectionHealthCard
          chart={collectionHealth.chart}
          overdue={filteredOverdue}
          onOpenOrder={openGiftOrderDetails}
        />

        <ClientInsightsCard
          distribution={clientInsights.distribution}
          topClients={clientInsights.topClients}
          activeClientId={activeClient?.id ?? null}
          onToggleClient={(c) => setActiveClient(activeClient?.id === c.id ? null : c)}
        />

        <ClientHistoryPanel activeClient={activeClient} />
      </div>
    </div>
  );
}
