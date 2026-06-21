import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const today = new Date();
    
    let startDate = new Date('2000-01-01');
    let endDate = new Date('2100-01-01');

    if (range === 'monthly') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (startDateParam) {
      startDate = new Date(startDateParam);
    }
    
    if (endDateParam && range !== 'monthly') {
      endDate = new Date(endDateParam);
    }
    
    // For "current period" metrics
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalEarningsAgg,
      periodRevenueAgg,
      completedShootsCount,
      pendingRetouch,
      totalExpensesAgg,
      upcomingShootsCount,
      upcomingDuesAgg
    ] = await Promise.all([
      // 1. Total all-time earnings
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: 'INCOME' }
      }),
      // 2. Revenue for the selected period
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { 
          type: 'INCOME', 
          date: { 
            gte: startDate,
            lte: endDate
          } 
        }
      }),
      // 3. Completed shoots (past shoots in range)
      prisma.booking.count({
        where: { 
          deletedAt: null, 
          date: { 
            lt: today,
            gte: startDate,
            lte: endDate
          } 
        }
      }),
      // 4. Pending retouch (shoots from last 14 days)
      prisma.booking.count({
        where: { 
          deletedAt: null, 
          date: { 
            lt: today, 
            gte: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000) 
          } 
        }
      }),
      // 5. Total Expenses for the period
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { 
          type: 'EXPENSE',
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      prisma.booking.count({
        where: {
          deletedAt: null,
          date: { gte: today }
        }
      }),
      // 7. Upcoming Dues (14d)
      prisma.order.aggregate({
        _sum: { due: true },
        where: {
          booking: {
            deletedAt: null,
            date: {
              gte: today,
              lte: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
            }
          }
        }
      })
    ]);

    // Calculate percentage growth safely (Mocking previous period for now, but could be dynamic)
    const prevPeriodRevenue = 1; // Avoid division by zero
    const currentRevenue = periodRevenueAgg._sum.amount || 0;
    const growthVelocity = ((currentRevenue - prevPeriodRevenue) / prevPeriodRevenue * 100).toFixed(1);

    return NextResponse.json({
      metrics: {
        totalEarnings: totalEarningsAgg._sum.amount || 0,
        periodRevenue: currentRevenue,
        periodExpenses: totalExpensesAgg._sum.amount || 0,
        netProfit: currentRevenue - (totalExpensesAgg._sum.amount || 0),
        completedShoots: completedShootsCount,
        pendingRetouch: pendingRetouch,
        upcomingShoots: upcomingShootsCount,
        growthVelocity: growthVelocity,
        pendingDueAmount: upcomingDuesAgg?._sum?.due ? Number(upcomingDuesAgg._sum.due) : 0
      }
    });

  } catch (error) {
    console.error("Unified Analytics Error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
