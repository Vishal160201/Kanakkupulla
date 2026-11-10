import prisma from "@/lib/prisma";
import { json, moneyRoute, notFound } from "@/lib/money/server/route";
import { parseJsonBody } from "@/lib/validations/http";
import { moneyCategorySchema } from "@/lib/validations/money";

type P = { id: string };

export const PUT = moneyRoute<P>("PUT /api/money/categories/:id", async ({ user, request, params }) => {
  const parsed = await parseJsonBody(request, moneyCategorySchema);
  if (parsed.error) return parsed.error;
  const existing = await prisma.moneyCategory.findFirst({ where: { id: params.id, userId: user.id } });
  if (!existing) return notFound("Category not found");
  const clash = await prisma.moneyCategory.findFirst({ where: { userId: user.id, id: { not: existing.id }, name: { equals: parsed.data.name, mode: "insensitive" } }, select: { id: true } });
  if (clash) return json({ error: "You already have a category with that name.", errors: { name: "You already have a category with that name." } }, { status: 409 });
  const row = await prisma.moneyCategory.update({ where: { id: existing.id }, data: parsed.data });
  return json({ id: row.id, name: row.name, color: row.color, icon: row.icon, sortOrder: row.sortOrder });
});

// DELETE — its transactions and rules become uncategorised.
export const DELETE = moneyRoute<P>("DELETE /api/money/categories/:id", async ({ user, params }) => {
  const existing = await prisma.moneyCategory.findFirst({ where: { id: params.id, userId: user.id }, select: { id: true } });
  if (!existing) return notFound("Category not found");
  await prisma.moneyCategory.delete({ where: { id: existing.id } });
  return json({ ok: true });
});
