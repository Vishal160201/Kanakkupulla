import { NextResponse } from "next/server";
import { getUserAccess, requireUser } from "@/lib/authz";

export const dynamic = "force-dynamic";

// GET /api/me/access — what the signed-in user can do, per shop and studio-wide.
export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  try {
    return NextResponse.json(await getUserAccess(auth.user), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Failed to load access:", error);
    return NextResponse.json({ error: "Failed to load access" }, { status: 500 });
  }
}
