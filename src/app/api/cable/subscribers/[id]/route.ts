import { NextResponse } from "next/server";
import prisma, { toNumber } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { getCableShop } from "@/lib/cableSync";
import { subscriberDues } from "@/lib/cable";
import { userNames } from "@/lib/cableUsers";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseParams } from "@/lib/validations/http";
import { idParams } from "@/lib/validations/common";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/cable/subscribers/[id] — one subscriber with their due, renewals, payments and complaints.
export async function GET(_request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const route = parseParams(await params, idParams);
  if (route.error) return route.error;

  try {
    const subscriber = await prisma.cableSubscriber.findUnique({
      where: { id: route.data.id },
      include: {
        renewals: { orderBy: { expiresAt: "desc" }, take: 50 },
        payments: { orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 50 },
        complaints: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!subscriber) return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
    await getCableShop(auth.user, subscriber.shopId);
    const [dues, names] = await Promise.all([
      subscriberDues(prisma, subscriber.shopId, [subscriber.id]),
      userNames([...subscriber.payments.map((p) => p.createdById), ...subscriber.complaints.map((c) => c.assignedToId)]),
    ]);
    return NextResponse.json({
      subscriber: {
        ...subscriber,
        due: dues.get(subscriber.id) ?? 0,
        renewals: subscriber.renewals.map((r) => ({ ...r, amount: r.amount === null ? null : toNumber(r.amount) })),
        payments: subscriber.payments.map((p) => ({ ...p, amount: toNumber(p.amount), collectedBy: (p.createdById && names.get(p.createdById)) || null })),
        complaints: subscriber.complaints.map((c) => ({ ...c, assignedToName: (c.assignedToId && names.get(c.assignedToId)) || null })),
      },
    });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to load subscriber");
  }
}
