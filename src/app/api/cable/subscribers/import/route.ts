import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { getCableShop } from "@/lib/cableSync";
import { matchRows } from "@/lib/cableImport";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody } from "@/lib/validations/http";
import { subscriberImportSchema } from "@/lib/validations/cable";

export const dynamic = "force-dynamic";

// POST /api/cable/subscribers/import — rows of an imported sheet, matched to the shop's TCCL subscribers by VC
// number (then old VC). Returns every row's box status; with `apply` also saves the matched rows' English /
// Tamil name, mobile and old VC (name and mobile are then kept over TCCL's on every sync).
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = await parseJsonBody(request, subscriberImportSchema);
  if (body.error) return body.error;

  try {
    const shop = await getCableShop(auth.user, body.data.shopId, body.data.apply ? "MANAGE" : "VIEW");
    const subs = await prisma.cableSubscriber.findMany({
      where: { shopId: shop.id, provider: "TCCL" },
      select: { id: true, vcNumber: true, status: true, goneAt: true, externalId: true, name: true, phone: true },
    });
    const matched = matchRows(body.data.rows, subs);

    let saved = 0;
    if (body.data.apply) {
      const writes = matched.flatMap(({ row, sub, shared }) => {
        if (!sub || shared) return [];
        const phone = row.phone && /^\+?\d{10,13}$/.test(row.phone) ? row.phone : null;
        return [
          prisma.cableSubscriber.update({
            where: { id: sub.id },
            data: {
              ...(row.name && row.name !== sub.name ? { name: row.name, customName: row.name } : {}),
              ...(row.tamilName ? { tamilName: row.tamilName } : {}),
              ...(phone && phone !== sub.phone ? { phone, customPhone: phone } : {}),
              ...(row.oldVcNumber && row.oldVcNumber !== sub.vcNumber ? { oldVcNumber: row.oldVcNumber } : {}),
            },
          }),
        ];
      });
      // One transaction: a half-applied sheet would be hard to tell apart from a full one
      await prisma.$transaction(writes);
      saved = writes.length;
    }

    return NextResponse.json({
      saved,
      results: matched.map(({ row, sub, byOldVc, shared, status }) => ({
        line: row.line,
        name: row.name,
        tamilName: row.tamilName,
        vcNumber: row.vcNumber,
        oldVcNumber: row.oldVcNumber,
        status,
        byOldVc,
        shared,
        account: sub?.externalId ?? null,
        tcclName: sub?.name ?? null,
      })),
    });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to import subscribers");
  }
}
