import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { getCableShop } from "@/lib/cableSync";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody } from "@/lib/validations/http";
import { groupAssignSchema, groupRenameSchema } from "@/lib/validations/cable";

// PATCH /api/cable/groups — renames a subscriber group (area / line) for everyone in it; renaming onto an
// existing group merges the two.
export async function PATCH(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = await parseJsonBody(request, groupRenameSchema);
  if (body.error) return body.error;
  try {
    const shop = await getCableShop(auth.user, body.data.shopId, "MANAGE");
    const { count } = await prisma.cableSubscriber.updateMany({ where: { shopId: shop.id, groupName: body.data.from }, data: { groupName: body.data.to } });
    return NextResponse.json({ renamed: count });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to rename the group");
  }
}

// POST /api/cable/groups — moves the picked subscribers into a group (new or existing), or out of their group.
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = await parseJsonBody(request, groupAssignSchema);
  if (body.error) return body.error;
  try {
    const shop = await getCableShop(auth.user, body.data.shopId, "MANAGE");
    const { count } = await prisma.cableSubscriber.updateMany({ where: { shopId: shop.id, id: { in: body.data.ids } }, data: { groupName: body.data.groupName } });
    return NextResponse.json({ moved: count });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to update the group");
  }
}
