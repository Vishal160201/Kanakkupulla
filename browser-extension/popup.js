const $ = (id) => document.getElementById(id);

function showStatus(status) {
  const el = $("status");
  if (!status) return;
  const when = status.at ? new Date(status.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
  el.textContent = `${status.message}${when ? ` (${when})` : ""}`;
  el.className = status.ok ? "ok" : "bad";
}

function show(message, ok) {
  showStatus({ ok, message });
}

// Chrome closes the popup when you click elsewhere (e.g. to copy the key), so keep what was typed
const DRAFTS = { appUrl: "draftAppUrl", syncKey: "draftSyncKey" };
for (const [field, draft] of Object.entries(DRAFTS)) {
  $(field).addEventListener("input", () => chrome.storage.local.set({ [draft]: $(field).value }));
}

// Portal switches: saved straight away; both are on until switched off
const portals = [...document.querySelectorAll(".portal")];
for (const button of portals) {
  button.addEventListener("click", async () => {
    const on = button.getAttribute("aria-checked") !== "true";
    button.setAttribute("aria-checked", String(on));
    await chrome.storage.local.set({ [button.dataset.setting]: on });
  });
}

async function load() {
  const saved = await chrome.storage.local.get(["appUrl", "syncKey", "status", ...Object.values(DRAFTS), ...portals.map((b) => b.dataset.setting)]);
  for (const button of portals) button.setAttribute("aria-checked", String(saved[button.dataset.setting] ?? true));
  $("appUrl").value = saved.draftAppUrl ?? saved.appUrl ?? "";
  $("syncKey").value = saved.draftSyncKey ?? saved.syncKey ?? "";
  showStatus(saved.status);
}

$("save").addEventListener("click", async () => {
  let origin;
  try {
    origin = new URL($("appUrl").value.trim()).origin;
  } catch {
    return show("Enter the Kanakkupulla address, e.g. https://kanakkupulla.vercel.app", false);
  }
  const syncKey = $("syncKey").value.trim();
  if (!syncKey.startsWith("kks_")) return show("Paste the sync key from Subscribers → Sync setup. It starts with kks_.", false);
  // Saved before Chrome's permission prompt, which can close the popup
  await chrome.storage.local.set({ appUrl: origin, syncKey });
  await chrome.storage.local.remove(Object.values(DRAFTS));
  // Lets the extension post to Kanakkupulla (Chrome asks once)
  const granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
  if (!granted) return show("Chrome needs permission to send to Kanakkupulla. Click Save again and choose Allow.", false);
  $("appUrl").value = origin;
  show("Saved. Syncing…", true);
  showStatus(await chrome.runtime.sendMessage({ type: "syncNow" }));
});

$("sync").addEventListener("click", async () => {
  $("sync").disabled = true;
  show("Syncing…", true);
  showStatus(await chrome.runtime.sendMessage({ type: "syncNow" }));
  $("sync").disabled = false;
});

$("openTab").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

load();
