// Runs on the Kanakkupulla site: lets the page ask this extension to sync now, or to open a WhatsApp Web chat with
// an invoice PDF attached (the user still presses Send in WhatsApp).
const HANDLED = new Set(["ping", "syncNow", "whatsappSend"]);

window.addEventListener("message", async (event) => {
  const data = event.data;
  if (event.source !== window || event.origin !== location.origin || data?.source !== "kanakku-page" || !HANDLED.has(data.type)) return;
  const reply = (type, extra = {}) => window.postMessage({ source: "kanakku-sync-extension", type, id: data.id, ...extra }, location.origin);
  reply("ack");
  if (data.type === "ping") return reply("result", { status: { ok: true, whatsapp: true } });

  let status;
  try {
    status =
      data.type === "syncNow"
        ? await chrome.runtime.sendMessage({ type: "syncNow" })
        : await chrome.runtime.sendMessage({ type: "whatsappSend", phone: data.phone, text: data.text, filename: data.filename, pdfBase64: data.pdfBase64 });
  } catch {
    status = { ok: false, message: "The extension was updated. Reload this page and try again." };
  }
  reply("result", { status });
});
