import { NextResponse } from 'next/server';
import prisma, { toNumber } from '@/lib/prisma';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, sub, format } from 'date-fns';
import { requirePermission } from "@/lib/authz";
import { parseSearchParams } from "@/lib/validations/http";
import { analyticsQuerySchema } from "@/lib/validations/dashboard";
import { shopWhere } from "@/lib/shops";

type RevenueDay = { date: string; Bookings: number; Gifts: number; 'Xerox/PP': number; Other: number; total: number; isPeak?: boolean };
type TrendDay = { date: string; income: number; expense: number };
type CollectionDay = { date: string; billed: number; collected: number; overdue: number };

export async function GET(req: Request) {
  try {
    const auth = await requirePermission("view_analytics");
    if (auth.error) return auth.error;

    const query = parseSearchParams(req, analyticsQuerySchema);
    if (query.error) return query.error;
    const { startDate: startDateParam, endDate: endDateParam, shopId } = query.data;
    // Only ledger-derived figures follow the shop filter; booking and gift-order figures are studio-wide
    const shopFilter = shopWhere(shopId);
    const range = query.data.range ?? 'this-month';

    const today = new Date();
    let startDate = startOfMonth(today);
    let endDate = endOfMonth(today);
    let prevStartDate = sub(startDate, { months: 1 });
    let prevEndDate = sub(endDate, { months: 1 });

    if (range === 'today') {
      startDate = startOfDay(today);
      endDate = endOfDay(today);
      prevStartDate = sub(startDate, { days: 1 });
      prevEndDate = sub(endDate, { days: 1 });
    } else if (range === 'this-week') {
      startDate = startOfWeek(today, { weekStartsOn: 1 });
      endDate = endOfWeek(today, { weekStartsOn: 1 });
      prevStartDate = sub(startDate, { weeks: 1 });
      prevEndDate = sub(endDate, { weeks: 1 });
    } else if (range === 'this-month') {
      startDate = startOfMonth(today);
      endDate = endOfMonth(today);
      prevStartDate = sub(startDate, { months: 1 });
      prevEndDate = sub(endDate, { months: 1 });
    } else if (range === 'this-year') {
      startDate = startOfYear(today);
      endDate = endOfYear(today);
      prevStartDate = sub(startDate, { years: 1 });
      prevEndDate = sub(endDate, { years: 1 });
    } else if (range === 'custom' && startDateParam && endDateParam) {
      startDate = startOfDay(startDateParam);
      endDate = endOfDay(endDateParam);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      prevStartDate = new Date(startDate.getTime() - diffTime);
      prevEndDate = new Date(endDate.getTime() - diffTime);
    }

    // Fetch transactions
    // Only the fields the aggregations below need
    const [currentTx, prevTx] = await Promise.all([
      prisma.transaction.findMany({
        where: { date: { gte: startDate, lte: endDate }, deletedAt: null, ...shopFilter },
        select: { id: true, amount: true, type: true, category: true, date: true, booking: { select: { clientId: true } } }
      }),
      prisma.transaction.findMany({
        where: { date: { gte: prevStartDate, lte: prevEndDate }, deletedAt: null, ...shopFilter },
        select: { amount: true, type: true, category: true }
      })
    ]);

    // KPI Metrics
    const totalRevenue = currentTx.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = currentTx.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    
    const prevRevenue = prevTx.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    let growthVelocity = 'New';
    if (prevRevenue > 0) {
      let g = ((totalRevenue - prevRevenue) / prevRevenue) * 100;
      if (g > 999) g = 999;
      if (g < -999) g = -999;
      growthVelocity = g.toFixed(1);
    } else if (totalRevenue === 0) {
      growthVelocity = '0.0';
    }

    // Category calculation
    const categoryTotals = currentTx.filter(t => t.type === 'INCOME').reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
    const topEarningCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Fetch Orders & Bookings for Funnel & Avg Order Value
    const orders = await prisma.order.findMany({
      where: { booking: { date: { gte: startDate, lte: endDate } } },
      select: {
        id: true,
        package: true,
        advance: true,
        due: true,
        createdAt: true,
        booking: { select: { date: true, client: { select: { name: true } } } }
      }
    });
    
    const totalBilled = orders.reduce((sum, o) => sum + o.package, 0);
    const avgOrderValue = orders.length > 0 ? Math.round(totalBilled / orders.length) : 0;
    // Billing is studio-wide, so the collection rate always uses studio-wide income
    const studioRevenue = shopId
      ? toNumber((await prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { date: { gte: startDate, lte: endDate }, deletedAt: null, type: 'INCOME' },
        }))._sum.amount)
      : totalRevenue;
    const collectionRate = totalBilled > 0 ? Math.round((studioRevenue / totalBilled) * 100) : 0;

    // Booking Funnel
    // Upcoming, Confirmed, Completed, Pending Retouch, Delivered
    const allBookings = await prisma.booking.findMany({
      where: { date: { gte: startDate, lte: endDate }, deletedAt: null },
      select: { status: true, date: true, updatedAt: true }
    });
    
    const upcoming = allBookings.filter(b => b.status === 'UPCOMING' || (b.status !== 'CONFIRMED' && b.status !== 'COMPLETED' && b.status !== 'DELIVERED' && b.date >= today)).length;
    const confirmed = allBookings.filter(b => b.status === 'CONFIRMED' || b.status === 'Confirmed').length;
    const completed = allBookings.filter(b => b.status === 'COMPLETED').length;
    
    const pendingRetouch = allBookings.filter(b => 
      b.status === 'COMPLETED' && b.updatedAt < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    ).length;
    
    const delivered = allBookings.filter(b => b.status === 'DELIVERED').length;
    
    const bookingFunnel = [
      { stage: 'Upcoming', count: upcoming },
      { stage: 'Confirmed', count: confirmed },
      { stage: 'Completed', count: completed },
      { stage: 'Pending Retouch', count: pendingRetouch },
      { stage: 'Delivered', count: delivered }
    ];

    // Gifts Performance
    const productOrders = await prisma.productOrder.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: { quantity: true, status: true, discountAmount: true, clientName: true, product: { select: { name: true } } }
    });

    const productRevenue = productOrders.reduce((acc, po) => {
      const name = po.product?.name || 'Unknown';
      acc[name] = (acc[name] || 0) + Number(po.quantity || 1); 
      return acc;
    }, {} as Record<string, number>);
    
    const topProducts = Object.entries(productRevenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    const statusDist = productOrders.reduce((acc, po) => {
      acc[po.status] = (acc[po.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const orderStatusDistribution = Object.entries(statusDist).map(([name, value]) => ({ name, value }));

    const totalDiscountGiven = productOrders.reduce((sum, po) => sum + (po.discountAmount || 0), 0);

    // Revenue Intelligence (Daily/Weekly aggregation)
    const revenueIntelligenceMap = new Map<string, RevenueDay>();
    let peakDay = { date: '', total: 0 };
    
    currentTx.filter(t => t.type === 'INCOME').forEach(t => {
      const dateKey = format(new Date(t.date), 'dd MMM');
      if (!revenueIntelligenceMap.has(dateKey)) {
        revenueIntelligenceMap.set(dateKey, { date: dateKey, Bookings: 0, Gifts: 0, 'Xerox/PP': 0, Other: 0, total: 0 });
      }
      const entry = revenueIntelligenceMap.get(dateKey)!;

      let cat: 'Bookings' | 'Gifts' | 'Xerox/PP' | 'Other' = 'Other';
      if (t.category === 'GIFTS_AND_FRAMES') cat = 'Gifts';
      else if (t.category === 'XEROX/PP') cat = 'Xerox/PP';
      else if (t.category === 'BOOKING') cat = 'Bookings';
      
      entry[cat] += t.amount;
      entry.total += t.amount;
      
      if (entry.total > peakDay.total) {
        peakDay = { date: entry.date, total: entry.total };
      }
    });
    
    const prevCatTotals = prevTx.filter(t => t.type === 'INCOME').reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    const revenueIntelligence = Array.from(revenueIntelligenceMap.values());
    revenueIntelligence.forEach(r => r.isPeak = (r.total === peakDay.total && r.total > 0));

    // Daily Trends
    const dailyTrendsMap = new Map<string, TrendDay>();
    currentTx.forEach(t => {
      const dateKey = format(new Date(t.date), 'dd MMM');
      if (!dailyTrendsMap.has(dateKey)) {
        dailyTrendsMap.set(dateKey, { date: dateKey, income: 0, expense: 0 });
      }
      const entry = dailyTrendsMap.get(dateKey)!;
      if (t.type === 'INCOME') entry.income += t.amount;
      if (t.type === 'EXPENSE') entry.expense += t.amount;
    });
    const dailyTrends = Array.from(dailyTrendsMap.values());

    // Collection Health
    const collectionHealthMap = new Map<string, CollectionDay>();
    orders.forEach(o => {
      const dateKey = format(new Date(o.booking?.date || o.createdAt), 'dd MMM');
      if (!collectionHealthMap.has(dateKey)) {
        collectionHealthMap.set(dateKey, { date: dateKey, billed: 0, collected: 0, overdue: 0 });
      }
      const entry = collectionHealthMap.get(dateKey)!;
      entry.billed += o.package;
      entry.collected += o.advance;
      entry.overdue += o.due;
    });
    const collectionHealth = Array.from(collectionHealthMap.values());
    
    // Add product list to overdue orders to allow filtering
    const overdueOrdersList = orders.filter(o => o.due > 0).map(o => {
      // Find products associated with this order (approximate from productOrders matching the date/client if exact link missing, or just assume general for now)
      // Since order has productOrder relation we can fetch it if we modify the include. For simplicity, we just pass an empty products array or fake it to match click logic if strict DB linkage isn't here.
      // Wait, let's just pass clientName and id
      return {
        id: o.id,
        clientName: o.booking?.client?.name || 'Unknown',
        amount: o.due,
        date: o.booking?.date,
        products: productOrders
          .filter(po => po.clientName === o.booking?.client?.name)
          .flatMap(po => (po.product?.name ? [po.product.name] : []))
      };
    }).slice(0, 10);

    // Client Insights
    // Counts in SQL; only clients with transactions in this period are loaded for the top list
    const spendingClientIds = [...new Set(currentTx.flatMap(t => (t.booking?.clientId ? [t.booking.clientId] : [])))];
    const [totalClients, newClients, clients] = await Promise.all([
      prisma.client.count(),
      prisma.client.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
      prisma.client.findMany({
        where: { id: { in: spendingClientIds } },
        select: { id: true, name: true }
      }),
    ]);
    const returningClients = totalClients - newClients;

    const topClients = clients.map(c => {
      const clientTxs = currentTx.filter(t => t.booking?.clientId === c.id);
      const spend = clientTxs.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
      return { 
        id: c.id, 
        name: c.name, 
        spend,
        transactions: clientTxs.map(t => ({
          id: t.id,
          date: t.date,
          amount: t.amount,
          category: t.category,
          type: t.type
        })).slice(0, 5) // Recent 5
      };
    }).filter(c => c.spend > 0).sort((a, b) => b.spend - a.spend).slice(0, 5);

    // Smart Insights Generation
    const insights: string[] = [];
    const overdueAmount = overdueOrdersList.reduce((sum, o) => sum + o.amount, 0);
    if (overdueAmount > 0) {
      insights.push(`₹${overdueAmount.toLocaleString('en-IN')} overdue from ${overdueOrdersList.length} orders.`);
    }
    
    if (peakDay.total > 0) {
      insights.push(`Best day: ${peakDay.date} (₹${peakDay.total.toLocaleString('en-IN')})`);
    }

    if (topEarningCategory !== 'N/A') {
      const curCatRevenue = categoryTotals[topEarningCategory] || 0;
      const prevCatRev = prevCatTotals[topEarningCategory] || 0;
      if (prevCatRev > 0) {
        const catGrowth = ((curCatRevenue - prevCatRev) / prevCatRev) * 100;
        if (catGrowth > 20) {
          insights.push(`${topEarningCategory} up ${Math.round(catGrowth)}% vs previous period!`);
        }
      }
    }

    if (collectionRate < 50 && totalBilled > 0) {
      insights.push(`Collection rate low (${collectionRate}%). Action needed.`);
    }

    if (topClients.length > 0) {
      insights.push(`Top client: ${topClients[0].name} (₹${topClients[0].spend.toLocaleString('en-IN')})`);
    }

    return NextResponse.json({
      shopId: shopId ?? null,
      metrics: {
        totalRevenue,
        totalExpenses,
        netProfit,
        collectionRate,
        avgOrderValue,
        topEarningCategory,
        growthVelocity
      },
      revenueIntelligence,
      bookingFunnel,
      giftsPerformance: {
        topProducts,
        statusDistribution: orderStatusDistribution,
        totalDiscountGiven
      },
      collectionHealth: {
        chart: collectionHealth,
        overdue: overdueOrdersList
      },
      clientInsights: {
        distribution: [
          { name: 'New', value: newClients },
          { name: 'Returning', value: returningClients }
        ],
        topClients
      },
      dailyTrends,
      insights
    });

  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
