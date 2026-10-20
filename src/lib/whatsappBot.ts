/** Calls the standalone WhatsApp bot server, authenticating with the shared secret. */
export function botFetch(path: string, init: RequestInit = {}) {
  const baseUrl = process.env.WHATSAPP_BOT_URL;
  if (!baseUrl) throw new Error("WHATSAPP_BOT_URL is not configured");
  const headers = new Headers(init.headers);
  if (process.env.WHATSAPP_BOT_SECRET) headers.set("x-bot-secret", process.env.WHATSAPP_BOT_SECRET);
  return fetch(`${baseUrl.replace(/\/$/, "")}${path}`, { cache: "no-store", ...init, headers });
}
