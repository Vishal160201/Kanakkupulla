// Runs on the Kanakkupulla site: lets its "Sync now" button ask this extension for an instant sync.
window.addEventListener("message", async (event) => {
  const data = event.data;
  if (event.source !== window || event.origin !== location.origin || data?.source !== "kanakku-page" || data.type !== "syncNow") return;
  const reply = (type, extra = {}) => window.postMessage({ source: "kanakku-sync-extension", type, id: data.id, ...extra }, location.origin);
  reply("ack");
  let status;
  try {
    status = await chrome.runtime.sendMessage({ type: "syncNow" });
  } catch {
    status = { ok: false, message: "The extension was updated. Reload this page and try again." };
  }
  reply("result", { status });
});
