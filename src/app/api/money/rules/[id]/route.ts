import prisma from "@/lib/prisma";
import { encryptText } from "@/lib/money/crypto";
import { json, moneyRoute, notFound } from "@/lib/money/server/route";
import { applyRuleToPast } from "@/lib/money/server/rulesApply";
import { parseJsonBody } from "@/lib/validations/http";
import { moneyRuleSchema } from "@/lib/validations/money";

type P = { id: string };

export const PUT = moneyRoute<P>("PUT /api/money/rules/:id", async ({ user, request, params }) => {
  const parsed = await parseJsonBody(request, moneyRuleSchema);
  if (parsed.error) return parsed.error;
  const existing = await prisma.moneyRule.findFirst({ where: { id: params.id, userId: user.id }, select: { id: true } });
  if (!existing) return notFound("Rule not found");
  const d = parsed.data;
  if (d.categoryId && !(await prisma.moneyCategory.findFirst({ where: { id: d.categoryId, userId: user.id }, select: { id: true } }))) {
    return json({ error: "Category not found" }, { status: 422 });
  }
  if (d.targetAccountId && !(await prisma.moneyAccount.findFirst({ where: { id: d.targetAccountId, userId: user.id }, select: { id: true } }))) {
    return json({ error: "Card not found" }, { status: 422 });
  }
  await prisma.moneyRule.update({ where: { id: existing.id }, data: { ...d, pattern: encryptText(d.pattern) } });
  const applied = new URL(request.url).searchParams.get("apply") === "1" ? await applyRuleToPast(user.id, { ...d, id: existing.id }) : 0;
  return json({ id: existing.id, applied });
});

export const DELETE = moneyRoute<P>("DELETE /api/money/rules/:id", async ({ user, params }) => {
  const existing = await prisma.moneyRule.findFirst({ where: { id: params.id, userId: user.id }, select: { id: true } });
  if (!existing) return notFound("Rule not found");
  await prisma.moneyRule.delete({ where: { id: existing.id } });
  return json({ ok: true });
});
