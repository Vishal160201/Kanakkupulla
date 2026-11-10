import { NextResponse } from "next/server";
import { json, moneyRoute } from "@/lib/money/server/route";
import { buildBackup, parseBackup, restoreBackup } from "@/lib/money/server/backup";
import { issuesToErrors, validationError } from "@/lib/validations/http";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// GET /api/money/backup — every tracker row as a JSON download (readable text: keep it safe).
export const GET = moneyRoute("GET /api/money/backup", async ({ user }) => {
  const backup = await buildBackup(user.id);
  const name = `money-backup-${backup.exportedAt.slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(backup), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" },
  });
});

// POST /api/money/backup — restore: replaces all of your tracker data with the uploaded backup.
export const POST = moneyRoute("POST /api/money/backup", async ({ user, request }) => {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ error: "That isn't a backup file." }, { status: 400 });
  }
  const parsed = parseBackup(raw);
  if (!parsed.success) return validationError({ _root: "That backup file isn't valid.", ...issuesToErrors(parsed.error) });
  return json(await restoreBackup(user.id, parsed.data));
});
