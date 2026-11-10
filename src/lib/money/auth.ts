import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "@/lib/authz";
import { canUseMoneyTracker } from "./access";

type MoneyAuthResult = { user: SessionUser; error?: undefined } | { user?: undefined; error: NextResponse };

/** Anyone else gets a plain 404, so the API doesn't reveal that the tracker exists. */
const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

/** The signed-in tracker account, for every /api/money handler. Scope all queries by `user.id`. */
export async function requireMoneyUser(): Promise<MoneyAuthResult> {
  const user = await getSessionUser();
  return user && canUseMoneyTracker(user.email) ? { user } : { error: notFound() };
}

/** For server components: the tracker account, or null. */
export async function getMoneyUser(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  return user && canUseMoneyTracker(user.email) ? user : null;
}
