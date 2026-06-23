import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { DEFAULT_LAYOUTS } from "@/lib/defaultLayouts";

const legacyOwnerFilter = (userId: string) => ({
  OR: [{ userId }, { userId: null }],
});

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  try {
    const { id } = await params;
    const transaction = await prisma.transaction.findFirst({
      where: { id, ...legacyOwnerFilter(userId) },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            category: true,
            client: { select: { name: true } },
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const dateRange = {
      gte: startOfDay(transaction.date),
      lte: endOfDay(transaction.date),
    };
    const scopedDayWhere = {
      date: dateRange,
      ...legacyOwnerFilter(userId),
    };

    const [incomeAggregate, expenseAggregate, categoryAggregate, layout] = await Promise.all([
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { ...scopedDayWhere, type: "INCOME" },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { ...scopedDayWhere, type: "EXPENSE" },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          ...scopedDayWhere,
          type: transaction.type,
          category: transaction.category,
        },
      }),
      prisma.formLayout.findUnique({ where: { formKey: "TRANSACTION_FORM" } }),
    ]);

    const dayIncome = incomeAggregate._sum.amount || 0;
    const dayExpenses = expenseAggregate._sum.amount || 0;
    const categoryTotal = categoryAggregate._sum.amount || 0;
    const typeTotal = transaction.type === "INCOME" ? dayIncome : dayExpenses;
    const customData =
      transaction.customData && typeof transaction.customData === "object"
        ? (transaction.customData as Record<string, unknown>)
        : {};

    const fallbackLayout = DEFAULT_LAYOUTS.find((item) => item.formKey === "TRANSACTION_FORM");
    const layoutSchema = layout?.schema || fallbackLayout?.schema;
    const fields = ((layoutSchema as any)?.sections || [])
      .flatMap((section: any) => section.fields || [])
      .map((field: any) => ({
        id: field.id,
        name: field.name || field.id,
        type: field.type || "SINGLE_LINE",
      }));

    const standardFieldIds = new Set([
      "fld_tx_amount",
      "fld_tx_type",
      "fld_tx_date",
      "fld_tx_category",
      "fld_tx_mode",
      "fld_tx_desc",
    ]);

    const customAttachment = Object.entries(customData).find(([key, value]) => {
      if (typeof value !== "string" || !value) return false;
      const definition = fields.find((field: any) => field.id === key);
      const searchable = `${key} ${definition?.name || ""} ${definition?.type || ""}`.toLowerCase();
      return /(attachment|receipt|invoice|bill|document|file|upload)/.test(searchable);
    });

    const customFields = Object.entries(customData)
      .filter(([key, value]) =>
        !standardFieldIds.has(key) &&
        !["attachmentUrl", "receiptUrl"].includes(key) &&
        key !== customAttachment?.[0] &&
        !key.startsWith("$ACTION") &&
        value !== null &&
        value !== undefined &&
        value !== ""
      )
      .map(([key, value]) => {
        const definition = fields.find((field: any) => field.id === key);
        return {
          id: key,
          label: definition?.name || key.replace(/^fld_tx_/, "").replace(/_/g, " "),
          type: definition?.type || "SINGLE_LINE",
          value,
        };
      });

    const attachmentUrl =
      transaction.attachmentUrl ||
      (typeof customData.attachmentUrl === "string" ? customData.attachmentUrl : null) ||
      (typeof customData.receiptUrl === "string" ? customData.receiptUrl : null) ||
      (typeof customAttachment?.[1] === "string" ? customAttachment[1] : null) ||
      null;

    return NextResponse.json(
      {
        transaction: {
          ...transaction,
          attachmentUrl,
          customFields,
        },
        impact: {
          dayIncome,
          dayExpenses,
          dayNet: dayIncome - dayExpenses,
          categoryTotal,
          categoryShare: typeTotal > 0 ? (categoryTotal / typeTotal) * 100 : 0,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Error fetching transaction:", error);
    return NextResponse.json({ error: "Failed to fetch transaction" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  try {
    const { id } = await params;
    const body = await request.json();
    const { amount, type, date, category, paymentMode, description, status, ...restBody } = body;

    // Confirm ownership
    const existing = await prisma.transaction.findFirst({
      where: { id, ...legacyOwnerFilter(userId) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Validate updated fields
    const errors: Record<string, string> = {};
    const parsedAmount = parseFloat(amount);
    if (amount !== undefined && (isNaN(parsedAmount) || parsedAmount <= 0)) {
      errors.amount = "Amount must be a positive number.";
    }
    if (type && !["INCOME", "EXPENSE"].includes(type)) errors.type = "Invalid type.";
    if (date && isNaN(new Date(date).getTime())) errors.date = "Invalid date.";


    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: "Validation failed", errors }, { status: 422 });
    }

    const customData: Record<string, any> = existing.customData && typeof existing.customData === 'object' ? { ...(existing.customData as any) } : {};
    for (const [key, value] of Object.entries(restBody)) {
      if (key !== 'userId' && !key.startsWith('$ACTION')) {
        customData[key] = value;
      }
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount: parsedAmount }),
        ...(type && { type }),
        ...(date && { date: new Date(date) }),
        ...(category && { category }),
        ...(paymentMode && { paymentMode }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(status && { status }),
        ...(Object.keys(customData).length > 0 && { customData }),
      },
    });

    return NextResponse.json(updatedTransaction, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  try {
    const { id } = await params;

    // Confirm ownership before deleting
    const existing = await prisma.transaction.findFirst({
      where: { id, ...legacyOwnerFilter(userId) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    await prisma.transaction.delete({ where: { id } });
    return NextResponse.json({ success: true }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}
