import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireMoneyUser } from "@/lib/money/auth";
import { outstandingAsOf, serializeAccount } from "@/lib/money/accounts";
import { parseJsonBody, parseParams } from "@/lib/validations/http";
import { moneyAccountSchema, moneyIdParamsSchema } from "@/lib/validations/money";

type Params = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ error: "Account not found" }, { status: 404 });

// PUT /api/money/accounts/:id — replace the account's settings.
export async function PUT(request: Request, { params }: Params) {
  const auth = await requireMoneyUser();
  if (auth.error) return auth.error;
  const p = parseParams(await params, moneyIdParamsSchema);
  if (p.error) return p.error;
  const parsed = await parseJsonBody(request, moneyAccountSchema);
  if (parsed.error) return parsed.error;
  try {
    const existing = await prisma.moneyAccount.findFirst({
      where: { id: p.data.id, userId: auth.user.id },
      include: { _count: { select: { transactions: true, imports: true } } },
    });
    if (!existing) return notFound();
    // Transactions were imported as this kind of account; switching bank <-> card would misread them
    if (existing.type !== parsed.data.type && existing._count.transactions > 0) {
      const error = "This account already has transactions, so its type can't change.";
      return NextResponse.json({ error, errors: { type: error } }, { status: 422 });
    }
    const account = await prisma.moneyAccount.update({
      where: { id: existing.id },
      data: {
        ...parsed.data,
        outstandingAsOf: outstandingAsOf(parsed.data.outstanding, {
          outstanding: existing.outstanding?.toFixed(2) ?? null,
          outstandingAsOf: existing.outstandingAsOf,
        }),
        manualBalanceAsOf: outstandingAsOf(parsed.data.manualBalance, {
          outstanding: existing.manualBalance?.toFixed(2) ?? null,
          outstandingAsOf: existing.manualBalanceAsOf,
        }),
      },
    });
    return NextResponse.json(serializeAccount(account, existing._count));
  } catch (error) {
    console.error("PUT /api/money/accounts/:id failed:", error);
    return NextResponse.json({ error: "Couldn't save the account" }, { status: 500 });
  }
}

// DELETE /api/money/accounts/:id — only while nothing has been imported into it.
export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireMoneyUser();
  if (auth.error) return auth.error;
  const p = parseParams(await params, moneyIdParamsSchema);
  if (p.error) return p.error;
  try {
    const existing = await prisma.moneyAccount.findFirst({
      where: { id: p.data.id, userId: auth.user.id },
      include: { _count: { select: { transactions: true, imports: true } } },
    });
    if (!existing) return notFound();
    if (existing._count.transactions > 0 || existing._count.imports > 0) {
      return NextResponse.json(
        { error: "This account has imported transactions. Delete its imports first." },
        { status: 409 },
      );
    }
    await prisma.moneyAccount.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/money/accounts/:id failed:", error);
    return NextResponse.json({ error: "Couldn't delete the account" }, { status: 500 });
  }
}
