import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/authz";

export async function POST() {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  // The bot server only supports QR login; it has no pairing-code endpoint.
  return NextResponse.json({ error: "Pairing codes are not supported. Scan the QR code instead." }, { status: 501 });
}
