import { NextResponse } from "next/server";
import prisma, { toNumber } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { getCableShop } from "@/lib/cableSync";
import { subscriberDues } from "@/lib/cable";
import { userNames } from "@/lib/cableUsers";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody, parseParams } from "@/lib/validations/http";
import { idParams } from "@/lib/validations/common";
import { subscriberEditSchema } from "@/lib/validations/cable";

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
        renewals: { orderBy: [{ expiresAt: "desc" }, { createdAt: "desc" }], take: 50 },
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
        monthlyFee: subscriber.monthlyFee === null ? null : toNumber(subscriber.monthlyFee),
        renewals: subscriber.renewals.map((r) => ({ ...r, amount: r.amount === null ? null : toNumber(r.amount) })),
        payments: subscriber.payments.map((p) => ({ ...p, amount: toNumber(p.amount), collectedBy: (p.createdById && names.get(p.createdById)) || null })),
        complaints: subscriber.complaints.map((c) => ({ ...c, assignedToName: (c.assignedToId && names.get(c.assignedToId)) || null })),
      },
    });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to load subscriber");
  }
}

// PATCH /api/cable/subscribers/[id] — the shop corrects a subscriber's name / phone (kept over the portal's on
// every sync) and fills in the Tamil name and old VC number.
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const route = parseParams(await params, idParams);
  if (route.error) return route.error;
  const body = await parseJsonBody(request, subscriberEditSchema);
  if (body.error) return body.error;

  try {
    const current = await prisma.cableSubscriber.findUnique({ where: { id: route.data.id }, select: { shopId: true, name: true, phone: true } });
    if (!current) return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
    await getCableShop(auth.user, current.shopId, "MANAGE");
    const { name, tamilName, phone, oldVcNumber, groupName, nodeHouse, monthlyFee } = body.data;
    const subscriber = await prisma.cableSubscriber.update({
      where: { id: route.data.id },
      data: {
        tamilName,
        oldVcNumber,
        groupName,
        nodeHouse,
        monthlyFee,
        // Only an actual change pins the name, so saving other fields doesn't freeze the portal's name
        ...(name !== current.name ? { name, customName: name } : {}),
        // Same for the phone; a blank one hands it back to the portal (restored on the next sync)
        ...(phone === null ? { customPhone: null } : phone !== current.phone ? { phone, customPhone: phone } : {}),
      },
      select: { id: true },
    });
    return NextResponse.json({ subscriber });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to update the subscriber");
  }
}
