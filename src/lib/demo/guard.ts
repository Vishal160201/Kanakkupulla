import { NextResponse } from "next/server";
import { DEMO_BLOCKED_MESSAGE, isDemoServer } from "./mode";

/** On the demo site: a 403 for actions that would reach outside the demo or lock visitors out. Otherwise null. */
export function demoBlocked(message = DEMO_BLOCKED_MESSAGE): NextResponse | null {
  return isDemoServer() ? NextResponse.json({ error: message, demo: true }, { status: 403 }) : null;
}
