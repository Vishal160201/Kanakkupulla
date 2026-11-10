import prisma from "@/lib/prisma";
import { json, moneyRoute } from "@/lib/money/server/route";
import { commitStatement, ImportError, parseStatementFile, previewStatement, uploadKind } from "@/lib/money/server/importer";
import { commitSheet, previewSheet } from "@/lib/money/server/sheetImport";
import { moneySheetOptionsSchema } from "@/lib/validations/money";
import { parseWith } from "@/lib/validations/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;

/**
 * POST /api/money/import (multipart): file, mode=preview|commit, password?, accountId?, options? (sheet).
 * PDF (HDFC/KVB), CSV (card spends), JSON (Account Aggregator) or XLSX (your commitments sheet).
 * The file and its password are used in memory only: neither is stored or logged.
 */
export const POST = moneyRoute("POST /api/money/import", async ({ user, request }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Upload a file." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "Upload a file." }, { status: 400 });
  if (file.size > MAX_BYTES) return json({ error: "Files up to 4 MB can be imported." }, { status: 413 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = uploadKind(file.name, bytes);
  if (!kind) return json({ error: "Use a PDF statement, a CSV of card spends, an Account Aggregator JSON file or your Excel sheet." }, { status: 415 });

  const mode = form.get("mode") === "commit" ? "commit" : "preview";
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : undefined;
  const accountIdRaw = form.get("accountId");
  const accountId = typeof accountIdRaw === "string" && accountIdRaw ? accountIdRaw : null;
  if (accountId && !(await prisma.moneyAccount.findFirst({ where: { id: accountId, userId: user.id }, select: { id: true } }))) {
    throw new ImportError("That account wasn't found.", 404);
  }

  if (kind === "xlsx") {
    const rawOptions = form.get("options");
    let options: unknown = {};
    try {
      options = typeof rawOptions === "string" && rawOptions ? JSON.parse(rawOptions) : { firstYear: new Date().getFullYear() };
    } catch {
      return json({ error: "Invalid options." }, { status: 400 });
    }
    const parsed = parseWith(moneySheetOptionsSchema, options);
    if (parsed.error) return parsed.error;
    return mode === "commit" ? json(await commitSheet(user.id, bytes, parsed.data), { status: 201 }) : json(await previewSheet(user.id, bytes, parsed.data));
  }

  const statement = await parseStatementFile(kind, bytes, password);
  if (mode === "preview") return json(await previewStatement(user.id, statement, bytes, accountId));
  return json(await commitStatement(user.id, statement, bytes, { accountId, filename: file.name.slice(0, 200) }), { status: 201 });
});
