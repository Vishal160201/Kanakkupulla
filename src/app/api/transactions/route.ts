import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // format: 'YYYY-MM'
    const category = searchParams.get('categories'); // Support comma separated categories
    const view = searchParams.get('view'); // 'day', 'week', 'month'
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const amountMin = searchParams.get('amountMin');
    const amountMax = searchParams.get('amountMax');
    const legacyCategory = searchParams.get('category');
    
    let whereClause: any = {};
    
    // 1. Date Logic
    if (dateFrom || dateTo) {
      whereClause.date = {};
      if (dateFrom) whereClause.date.gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        whereClause.date.lte = to;
      }
    } else if (view) {
      const now = new Date();
      whereClause.date = {};
      if (view === 'day') {
        const start = new Date(now.setHours(0, 0, 0, 0));
        const end = new Date(now.setHours(23, 59, 59, 999));
        whereClause.date.gte = start;
        whereClause.date.lte = end;
      } else if (view === 'week') {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6); // End of week (Saturday)
        end.setHours(23, 59, 59, 999);
        whereClause.date.gte = start;
        whereClause.date.lte = end;
      } else if (view === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        whereClause.date.gte = start;
        whereClause.date.lte = end;
      }
    } else if (month) {
      const startDate = new Date(`${month}-01T00:00:00.000Z`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      
      whereClause.date = {
        gte: startDate,
        lt: endDate
      };
    }
    
    // 2. Category Logic
    const activeCategories = category ? category.split(',') : (legacyCategory && legacyCategory !== 'All' ? [legacyCategory] : []);
    if (activeCategories.length > 0) {
      whereClause.category = { in: activeCategories };
    }

    // 3. Amount Logic
    if (amountMin || amountMax) {
      whereClause.amount = {};
      if (amountMin) whereClause.amount.gte = parseFloat(amountMin);
      if (amountMax) whereClause.amount.lte = parseFloat(amountMax);
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      orderBy: { date: 'desc' }
    });
    
    // Inject HTTP Cache headers to withstand extreme load
    return NextResponse.json(transactions, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59',
      },
    });
  } catch (error: any) {
    console.error("Error fetching transactions:", error);
    
    // Graceful degradation for database connection exhaustion timeouts
    if (error.message?.toLowerCase().includes('timeout') || error.message?.toLowerCase().includes('connection')) {
      return NextResponse.json(
        { error: "Service temporarily overloaded. Please try again." }, 
        { 
          status: 503,
          headers: { 'Retry-After': '5' } 
        }
      );
    }
    
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, type, date, category, paymentMode, description, status } = body;

    const newTransaction = await prisma.transaction.create({
      data: {
        amount: parseFloat(amount.toString()),
        type,
        date: new Date(date),
        category,
        paymentMode,
        description: description || null,
        status: status || "SETTLED"
      }
    });

    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}
