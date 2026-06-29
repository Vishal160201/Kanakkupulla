import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const month = parseInt(url.searchParams.get("month") || new Date().getMonth() + 1 + "");
    const year = parseInt(url.searchParams.get("year") || new Date().getFullYear() + "");

    const budgets = await prisma.categoryBudget.findMany({
      where: { month, year },
      orderBy: { category: 'asc' }
    });
    return NextResponse.json({ budgets });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await request.json();
    const userId = (session.user as any)?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    // Upsert budget for the category, month, year, userId
    const budget = await prisma.categoryBudget.upsert({
      where: {
        category_month_year_userId: {
          category: data.category,
          month: parseInt(data.month),
          year: parseInt(data.year),
          userId
        }
      },
      update: {
        monthlyLimit: parseFloat(data.monthlyLimit)
      },
      create: {
        category: data.category,
        monthlyLimit: parseFloat(data.monthlyLimit),
        month: parseInt(data.month),
        year: parseInt(data.year),
        userId
      }
    });
    
    return NextResponse.json({ budget });
  } catch (error) {
    console.error("Budget Error:", error);
    return NextResponse.json({ error: "Failed to save budget" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.categoryBudget.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
