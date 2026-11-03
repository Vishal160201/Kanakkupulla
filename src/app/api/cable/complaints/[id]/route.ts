import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { updateComplaint } from "@/lib/cable";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody, parseParams } from "@/lib/validations/http";
import { idParams } from "@/lib/validations/common";
import { complaintUpdateSchema } from "@/lib/validations/cable";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/cable/complaints/[id] — assign, add notes, mark fixed / reopen.
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const route = parseParams(await params, idParams);
  if (route.error) return route.error;
  const body = await parseJsonBody(request, complaintUpdateSchema);
  if (body.error) return body.error;
  try {
    return NextResponse.json(await updateComplaint(auth.user, route.data.id, body.data));
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to update the complaint");
  }
}
