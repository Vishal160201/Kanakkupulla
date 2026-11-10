import { NextResponse } from "next/server";
import type { SessionUser } from "@/lib/authz";
import { requireMoneyUser } from "../auth";
import { MoneyCryptoError } from "../crypto";
import { StatementParseError } from "../parsers/types";
import { ImportError } from "./importer";
import { ensureMoneySetup } from "./setup";

type Ctx<P> = { user: SessionUser; request: Request; params: P };

export const NO_STORE = { "Cache-Control": "private, no-store" };

export const json = (data: unknown, init?: ResponseInit) =>
  NextResponse.json(data, { ...init, headers: { ...NO_STORE, ...(init?.headers ?? {}) } });

export const notFound = (what = "Not found") => json({ error: what }, { status: 404 });

/**
 * Every /api/money handler: the tracker account only (others get 404), first-run setup, and
 * one place that turns known errors into readable messages. Never logs bank text.
 */
export function moneyRoute<P = Record<string, never>>(label: string, handler: (ctx: Ctx<P>) => Promise<Response>) {
  return async (request: Request, context?: { params: Promise<P> }) => {
    const auth = await requireMoneyUser();
    if (auth.error) return auth.error;
    try {
      await ensureMoneySetup(auth.user.id);
      const params = (context?.params ? await context.params : {}) as P;
      return await handler({ user: auth.user, request, params });
    } catch (error) {
      if (error instanceof ImportError) return json({ error: error.message }, { status: error.status });
      if (error instanceof StatementParseError) {
        const status = 422; // the client reads `code` (NEEDS_PASSWORD, WRONG_PASSWORD, …)
        return json({ error: error.message, code: error.code }, { status });
      }
      if (error instanceof MoneyCryptoError) {
        console.error(`${label}: encryption key problem`);
        return json({ error: error.message }, { status: 500 });
      }
      // Name, code and where it happened, but not the message: it could echo bank text
      const e = error as { name?: string; code?: string; stack?: string };
      console.error(`${label} failed: ${e?.name ?? "error"} ${e?.code ?? ""} ${e?.stack?.split("\n")[1]?.trim() ?? ""}`);
      return json({ error: "Something went wrong. Try again." }, { status: 500 });
    }
  };
}
