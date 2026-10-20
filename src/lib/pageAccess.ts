import { redirect } from "next/navigation";
import { can, getSessionUser } from "@/lib/authz";
import type { AccessLevel, ModuleKey } from "@/lib/access";

/**
 * For server-component pages that read the database directly: send people without access
 * away before any data is rendered (the proxy already handles signed-out users).
 */
export async function requirePageAccess(module: ModuleKey, level: AccessLevel = "VIEW") {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await can(user, module, level))) redirect("/settings");
  return user;
}
