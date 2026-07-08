import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== "nithyavishalr@gmail.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const format = searchParams.get("format");

    if (format !== "csv") {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    const whereClause: any = { deletedAt: null };

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        whereClause.date.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.date.lte = end;
      }
    }

    const expenses = await prisma.personalExpense.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
    });

    const headers = ["Date", "Title", "Category", "Payment Source", "Type", "Amount"];
    
    // Construct CSV String
    let csvString = headers.join(",") + "\n";
    
    expenses.forEach(e => {
      const row = [
        new Date(e.date).toLocaleDateString(),
        `"${e.title.replace(/"/g, '""')}"`, // escape quotes in title
        e.category,
        e.paymentSource,
        e.type,
        e.amount
      ];
      csvString += row.join(",") + "\n";
    });

    return new NextResponse(csvString, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="personal-expenses.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/personal/expenses/export error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
