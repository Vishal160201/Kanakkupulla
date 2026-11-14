/**
 * Demo site (a second deployment with its own database, shown to prospective clients).
 * DEMO_MODE=1 on the server and NEXT_PUBLIC_DEMO_MODE=1 for the browser. Without them the app
 * behaves exactly as before. Safe to import from client and server code.
 */
export const isDemo = (): boolean => process.env.DEMO_MODE === "1" || process.env.NEXT_PUBLIC_DEMO_MODE === "1";

/** Server only: the server flag, so a browser-only flag can never unlock demo sign-in. */
export const isDemoServer = (): boolean => process.env.DEMO_MODE === "1";

/** The account every visitor uses. Fixed id so sessions survive the nightly reset. */
export const DEMO_OWNER_ID = "demo-owner";
export const DEMO_OWNER_EMAIL = "owner@demo.kanakkupulla.app";

/** SystemSetting key written only by the demo setup script; the reset refuses without it. */
export const DEMO_MARKER_KEY = "demo_instance";

export const DEMO_BLOCKED_MESSAGE = "This is turned off on the demo.";
