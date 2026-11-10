import { json, moneyRoute, notFound } from "@/lib/money/server/route";
import { deleteImport } from "@/lib/money/server/importer";

// DELETE /api/money/imports/:id — removes the import and the transactions it added.
export const DELETE = moneyRoute<{ id: string }>("DELETE /api/money/imports/:id", async ({ user, params }) => {
  return (await deleteImport(user.id, params.id)) ? json({ ok: true }) : notFound("Import not found");
});
