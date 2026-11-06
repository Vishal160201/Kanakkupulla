// Runs once when a server instance starts: say clearly in the logs when required settings are missing,
// instead of failing later in odd places (e.g. cron jobs refusing every call without CRON_SECRET).
const REQUIRED = ["DATABASE_URL", "NEXTAUTH_SECRET", "CRON_SECRET"] as const;

export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const missing = REQUIRED.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) console.error(`[config] Missing environment variables: ${missing.join(", ")}`);
}
