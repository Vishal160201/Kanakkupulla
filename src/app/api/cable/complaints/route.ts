import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { getCableShop } from "@/lib/cableSync";
import { shopPeople, userNames } from "@/lib/cableUsers";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseSearchParams } from "@/lib/validations/http";
import { idSchema } from "@/lib/validations/common";

export const dynamic = "force-dynamic";

const query = z.object({ shopId: idSchema, status: z.enum(["open", "fixed"]).default("open") });

// GET /api/cable/complaints?shopId=&status=open|fixed — complaints (open: oldest first; fixed: last 100) and who they can go to.
export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const q = parseSearchParams(request, query);
  if (q.error) return q.error;
  try {
    const shop = await getCableShop(auth.user, q.data.shopId);
    const open = q.data.status === "open";
    const [complaints, people] = await Promise.all([
      prisma.cableComplaint.findMany({
        where: { shopId: shop.id, fixedAt: open ? null : { not: null } },
        orderBy: open ? { createdAt: "asc" } : { fixedAt: "desc" },
        take: open ? undefined : 100,
        include: { subscriber: { select: { id: true, name: true, externalId: true, phone: true, area: true } } },
      }),
      shopPeople(shop.id),
    ]);
    const names = await userNames(complaints.flatMap((c) => [c.assignedToId, c.createdById]));
    return NextResponse.json({
      complaints: complaints.map((c) => ({
        ...c,
        assignedToName: c.assignedToId ? names.get(c.assignedToId) ?? null : null,
        createdByName: c.createdById ? names.get(c.createdById) ?? null : null,
      })),
      people,
    });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to load complaints");
  }
}
