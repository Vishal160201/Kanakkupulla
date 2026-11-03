import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { createComplaint } from "@/lib/cable";
import { inventoryErrorResponse } from "@/lib/inventoryHttp";
import { parseJsonBody, parseParams } from "@/lib/validations/http";
import { idParams } from "@/lib/validations/common";
import { complaintCreateSchema } from "@/lib/validations/cable";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/cable/subscribers/[id]/complaints — log a fault for a subscriber.
export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const route = parseParams(await params, idParams);
  if (route.error) return route.error;
  const body = await parseJsonBody(request, complaintCreateSchema);
  if (body.error) return body.error;
  try {
    return NextResponse.json(await createComplaint(auth.user, route.data.id, body.data), { status: 201 });
  } catch (error) {
    return inventoryErrorResponse(error, "Failed to log the complaint");
  }
}
