import { NextResponse } from "next/server";
import prisma, { toNumber } from "@/lib/prisma";
import { canWriteTransaction, forbiddenResponse, requirePermission, requireUser } from "@/lib/authz";
import { DEFAULT_LAYOUTS } from "@/lib/defaultLayouts";
import { parseJsonBody, parseSearchParams } from "@/lib/validations/http";
import { resolveShopForWrite, shopSummarySelect, shopWhere, ShopError } from "@/lib/shops";
import { asJsonRecord, pickCustomFields } from "@/lib/validations/common";
import { transactionDetailQuerySchema, transactionPatchSchema, transactionUpdateSchema } from "@/lib/validations/transactions";

type LayoutField = { id: string; name: string; type: string };

/** Flattens a form layout schema (`{ sections: [{ fields: [...] }] }`) into its field definitions. */
function layoutFields(schema: unknown): LayoutField[] {
  if (!schema || typeof schema !== "object" || !("sections" in schema) || !Array.isArray(schema.sections)) return [];
  const fields: LayoutField[] = [];
  for (const section of schema.sections as unknown[]) {
    if (!section || typeof section !== "object" || !("fields" in section) || !Array.isArray(section.fields)) continue;
    for (const field of section.fields as unknown[]) {
      if (!field || typeof field !== "object" || !("id" in field) || typeof field.id !== "string") continue;
      const name = "name" in field && typeof field.name === "string" && field.name ? field.name : field.id;
      const type = "type" in field && typeof field.type === "string" && field.type ? field.type : "SINGLE_LINE";
      fields.push({ id: field.id, name, type });
    }
  }
  return fields;
}

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission("view_transactions", "manage_transactions", "manage_bookings");
  if (auth.error) return auth.error;

  const query = parseSearchParams(request, transactionDetailQuerySchema);
  if (query.error) return query.error;

  try {
    const { id } = await params;
    
    // Handle Legacy Advance Transactions (dynamically generated for old bookings)
    if (id.startsWith("legacy-advance-")) {
      const bookingId = id.replace("legacy-advance-", "");
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { 
          client: { select: { name: true } }, 
          createdBy: { select: { id: true, name: true, email: true } },
          order: true
        }
      });
      
      if (!booking) {
        return NextResponse.json({ error: "Booking not found for legacy transaction" }, { status: 404 });
      }
      
      const customData = asJsonRecord(booking.customData);
      const advanceAmount = Number(booking.order?.advance || customData.fld_b_advance || 0);
      const paymentMode = customData.paymentMode || customData.fld_b_payment_mode || "Cash";
      const txDate = booking.date || new Date();
      
      const legacyTransaction = {
        id,
        transactionId: id,
        amount: advanceAmount,
        type: "INCOME",
        date: txDate,
        category: "BOOKING",
        paymentMode: paymentMode,
        description: "Advance Payment (Legacy)",
        status: "SETTLED",
        customData: {},
        attachmentUrl: null,
        booking: {
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          category: booking.category,
          client: { name: booking.client?.name || "" }
        },
        user: booking.createdBy || null,
        productOrder: null,
        shopId: null,
        shop: null,
        customFields: []
      };

      return NextResponse.json(
        {
          transaction: legacyTransaction,
          impact: { dayIncome: advanceAmount, dayExpenses: 0, dayNet: advanceAmount, categoryTotal: advanceAmount, categoryShare: 100 },
        },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id },
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
        productOrder: { select: { id: true, orderNumber: true } },
        shop: { select: shopSummarySelect },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const dateRange = {
      gte: startOfDay(transaction.date),
      lte: endOfDay(transaction.date),
    };
    // Day totals follow the shop being viewed (all shops when none is selected)
    const scopedDayWhere = {
      date: dateRange,
      deletedAt: null,
      ...shopWhere(query.data.shopId),
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

    const dayIncome = toNumber(incomeAggregate._sum.amount);
    const dayExpenses = toNumber(expenseAggregate._sum.amount);
    const categoryTotal = toNumber(categoryAggregate._sum.amount);
    const typeTotal = transaction.type === "INCOME" ? dayIncome : dayExpenses;
    const customData =
      transaction.customData && typeof transaction.customData === "object"
        ? (transaction.customData as Record<string, unknown>)
        : {};

    const fallbackLayout = DEFAULT_LAYOUTS.find((item) => item.formKey === "TRANSACTION_FORM");
    const layoutSchema = layout?.schema || fallbackLayout?.schema;
    const fields = layoutFields(layoutSchema);

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
      const definition = fields.find((field) => field.id === key);
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
        const definition = fields.find((field) => field.id === key);
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
    console.error("Failed to fetch transaction:", error);
    return NextResponse.json({ error: "Failed to fetch transaction" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const parsed = await parseJsonBody(request, transactionUpdateSchema);
    if (parsed.error) return parsed.error;
    const { amount, type, date, category, paymentMode, description, status, shopId, ...restBody } = parsed.data;

    const existing = await prisma.transaction.findUnique({
      where: { id },
    });
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (!(await canWriteTransaction(auth.user, existing))) {
      return forbiddenResponse();
    }

    const customData = { ...asJsonRecord(existing.customData), ...pickCustomFields(restBody) };
    // Moving an entry to another shop requires that shop to be active
    const nextShopId = shopId && shopId !== existing.shopId ? await resolveShopForWrite(shopId) : undefined;

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount }),
        ...(type && { type }),
        ...(date && { date }),
        ...(category && { category }),
        ...(paymentMode && { paymentMode }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(status && { status }),
        ...(Object.keys(customData).length > 0 && { customData }),
        ...(nextShopId && { shopId: nextShopId }),
      },
      include: { shop: { select: shopSummarySelect } },
    });

    return NextResponse.json(updatedTransaction, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof ShopError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Failed to update transaction:", error);
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const parsed = await parseJsonBody(request, transactionPatchSchema);
    if (parsed.error) return parsed.error;
    const body = parsed.data;

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (!(await canWriteTransaction(auth.user, existing))) {
      return forbiddenResponse();
    }

    // Only support patching deletedAt for soft-deletion right now
    if (body.deletedAt !== undefined) {
      const updated = await prisma.transaction.update({
        where: { id },
        data: { deletedAt: body.deletedAt },
      });
      return NextResponse.json({ message: "Transaction updated successfully", transaction: updated });
    }
    
    return NextResponse.json({ error: "Invalid patch request" }, { status: 400 });
  } catch (error) {
    console.error("Failed to patch transaction:", error);
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const userId = auth.user.id;

  try {
    const { id } = await params;

    const existing = await prisma.transaction.findUnique({
      where: { id },
    });
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (!(await canWriteTransaction(auth.user, existing))) {
      return forbiddenResponse();
    }

    await prisma.$transaction([
      prisma.recycleBin.create({
        data: {
          itemType: "transaction",
          itemId: id,
          originalData: JSON.parse(JSON.stringify(existing)),
          trashedById: userId,
        }
      }),
      prisma.transaction.update({
        where: { id },
        data: { deletedAt: new Date() }
      }),
    ]);

    if (existing.productOrderId) {
      const order = await prisma.productOrder.findUnique({
        where: { id: existing.productOrderId }
      });
      if (order) {
        if (existing.description?.startsWith("Advance") || existing.description?.startsWith("Full Payment")) {
          const cData = asJsonRecord(order.customData);
          const oldAdvance = Number(cData.advanceAmount) || 0;
          const newAdvance = Math.max(0, oldAdvance - existing.amount);
          await prisma.productOrder.update({
            where: { id: order.id },
            data: { 
              customData: { ...cData, advanceAmount: newAdvance }
            }
          });
        } else if (existing.description?.startsWith("Due Collection")) {
          // If due collection is reverted, revert status back to READY and reset discount
          await prisma.productOrder.update({
            where: { id: order.id },
            data: { 
              status: "READY",
              discountAmount: 0 
            }
          });
        }
      }
    }
    return NextResponse.json({ success: true }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to delete transaction:", error);
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}
