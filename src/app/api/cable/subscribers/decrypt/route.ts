import { NextResponse } from "next/server";
import { decrypt, isEncrypted } from "officecrypto-tool";
import { requireAccess } from "@/lib/authz";
import { MINUTE, limitRequest } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// Vercel caps request bodies at 4.5 MB
const MAX_BYTES = 4 * 1024 * 1024;

// POST /api/cable/subscribers/decrypt (multipart: shopId, file, password) — opens a password-protected Excel file for
// the import and returns the plain .xlsx. Nothing is stored; the browser reads the result as usual.
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const shopId = form?.get("shopId");
  if (typeof shopId !== "string" || !shopId) return NextResponse.json({ error: "Missing shop." }, { status: 400 });
  const auth = await requireAccess("cable", "VIEW", shopId);
  if (auth.error) return auth.error;
  // Each try decrypts the whole file, so cap password guessing
  const limited = await limitRequest(request, "decrypt", 20, 15 * MINUTE);
  if (limited) return limited;

  const file = form?.get("file");
  const password = form?.get("password");
  if (!(file instanceof File) || typeof password !== "string" || !password) return NextResponse.json({ error: "Choose the file and enter its password." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "The file is over 4 MB. Remove its password in Excel and import it, or save it as CSV." }, { status: 413 });

  const input = Buffer.from(await file.arrayBuffer());
  if (!isEncrypted(input)) return NextResponse.json({ error: "This file has no password." }, { status: 400 });
  try {
    const plain = await decrypt(input, { password });
    return new NextResponse(new Uint8Array(plain), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "cache-control": "no-store" } });
  } catch (error) {
    const wrong = error instanceof Error && /password/i.test(error.message);
    return NextResponse.json(
      { error: wrong ? "That password is wrong." : "Couldn't open this file. Remove its password in Excel and import it, or save it as CSV." },
      { status: wrong ? 400 : 422 }
    );
  }
}
