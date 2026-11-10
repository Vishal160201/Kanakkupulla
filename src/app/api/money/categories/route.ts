import prisma from "@/lib/prisma";
import { json, moneyRoute } from "@/lib/money/server/route";
import { loadCategories } from "@/lib/money/server/rows";
import { parseJsonBody } from "@/lib/validations/http";
import { moneyCategorySchema } from "@/lib/validations/money";

export const dynamic = "force-dynamic";

const shape = (c: { id: string; name: string; color: string; icon: string; sortOrder: number }) => ({ id: c.id, name: c.name, color: c.color, icon: c.icon, sortOrder: c.sortOrder });

export const GET = moneyRoute("GET /api/money/categories", async ({ user }) => json((await loadCategories(user.id)).map(shape)));

export const POST = moneyRoute("POST /api/money/categories", async ({ user, request }) => {
  const parsed = await parseJsonBody(request, moneyCategorySchema);
  if (parsed.error) return parsed.error;
  const clash = await prisma.moneyCategory.findFirst({ where: { userId: user.id, name: { equals: parsed.data.name, mode: "insensitive" } }, select: { id: true } });
  if (clash) return json({ error: "You already have a category with that name.", errors: { name: "You already have a category with that name." } }, { status: 409 });
  const last = await prisma.moneyCategory.findFirst({ where: { userId: user.id }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  const row = await prisma.moneyCategory.create({ data: { ...parsed.data, userId: user.id, sortOrder: (last?.sortOrder ?? -1) + 1 } });
  return json(shape(row), { status: 201 });
});
