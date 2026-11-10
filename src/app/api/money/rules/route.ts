import prisma from "@/lib/prisma";
import { encryptText } from "@/lib/money/crypto";
import { json, moneyRoute } from "@/lib/money/server/route";
import { loadRules } from "@/lib/money/server/rows";
import { applyRuleToPast } from "@/lib/money/server/rulesApply";
import { parseJsonBody } from "@/lib/validations/http";
import { moneyRuleSchema } from "@/lib/validations/money";

export const dynamic = "force-dynamic";

export const GET = moneyRoute("GET /api/money/rules", async ({ user }) => json(await loadRules(user.id)));

// POST /api/money/rules?apply=1 — add a rule (and optionally apply it to past transactions).
export const POST = moneyRoute("POST /api/money/rules", async ({ user, request }) => {
  const parsed = await parseJsonBody(request, moneyRuleSchema);
  if (parsed.error) return parsed.error;
  const d = parsed.data;
  if (d.categoryId && !(await prisma.moneyCategory.findFirst({ where: { id: d.categoryId, userId: user.id }, select: { id: true } }))) {
    return json({ error: "Category not found", errors: { categoryId: "Choose a category." } }, { status: 422 });
  }
  if (d.targetAccountId && !(await prisma.moneyAccount.findFirst({ where: { id: d.targetAccountId, userId: user.id }, select: { id: true } }))) {
    return json({ error: "Card not found", errors: { targetAccountId: "Choose a card." } }, { status: 422 });
  }
  const row = await prisma.moneyRule.create({ data: { ...d, pattern: encryptText(d.pattern), userId: user.id } });
  const applied = new URL(request.url).searchParams.get("apply") === "1" ? await applyRuleToPast(user.id, { ...d, id: row.id }) : 0;
  return json({ id: row.id, applied }, { status: 201 });
});
