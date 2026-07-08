import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== "nithyavishalr@gmail.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const emis = await prisma.personalEMI.findMany({
      orderBy: { nextDueDate: 'asc' },
      include: {
        expenses: {
          where: { deletedAt: null },
          orderBy: { date: 'desc' },
          take: 5
        }
      }
    });
    return NextResponse.json(emis);
  } catch (error) {
    console.error("GET /api/personal/emis error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== "nithyavishalr@gmail.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const data = await req.json();
    
    const totalAmount = parseFloat(data.totalAmount);
    const emiAmount = parseFloat(data.emiAmount);
    const totalMonths = parseInt(data.totalMonths);
    const startDate = new Date(data.startDate);

    // Initial next due date is same as start date (first month)
    const nextDueDate = new Date(startDate);
    
    const emi = await prisma.personalEMI.create({
      data: {
        title: data.title,
        totalAmount,
        emiAmount,
        totalMonths,
        paidMonths: 0,
        startDate,
        nextDueDate,
        cardId: data.cardId || null,
        status: "ACTIVE"
      }
    });

    return NextResponse.json(emi, { status: 201 });
  } catch (error) {
    console.error("POST /api/personal/emis error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
