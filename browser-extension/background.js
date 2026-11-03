// Every minute: read the TIC Fiber report (in the offscreen document) and post it to Kanakkupulla.

const ALARM = "sync";
const PERIOD_MINUTES = 1;

const MESSAGES = {
  NOT_SET_UP: "Add the Kanakkupulla address and sync key in this popup.",
  LOGGED_OUT: "Log in to the TIC Fiber partner portal (partner.ticfiber.in) in this Chrome.",
  NO_TABLE: "The TIC Fiber report page has changed. The extension needs an update.",
  TOO_MANY: "More than 10,000 subscribers: the extension needs an update to read them all. Nothing was changed.",
  EMPTY: "The TIC Fiber report came back empty, so nothing was changed.",
  NETWORK: "Couldn't reach TIC Fiber or Kanakkupulla. It will retry in a minute.",
};

function schedule() {
  chrome.alarms.create(ALARM, { periodInMinutes: PERIOD_MINUTES, delayInMinutes: 0.1 });
  registerBridge();
}

/** Adds bridge.js (the site's "Sync now" button) to the saved Kanakkupulla address, once Chrome allows that site. */
async function registerBridge() {
  const { appUrl } = await chrome.storage.local.get("appUrl");
  await chrome.scripting.unregisterContentScripts({ ids: ["bridge"] }).catch(() => {});
  if (!appUrl || !(await chrome.permissions.contains({ origins: [`${appUrl}/*`] }))) return;
  await chrome.scripting.registerContentScripts([{ id: "bridge", matches: [`${appUrl}/*`], js: ["bridge.js"], runAt: "document_idle" }]);
}

chrome.runtime.onInstalled.addListener(schedule);
chrome.runtime.onStartup.addListener(schedule);
chrome.permissions.onAdded.addListener(registerBridge);
chrome.storage.onChanged.addListener((changes) => changes.appUrl && registerBridge());
chrome.alarms.onAlarm.addListener((alarm) => alarm.name === ALARM && syncNow());
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "syncNow") return false;
  syncNow().then(sendResponse);
  return true;
});

async function setStatus(status) {
  await chrome.storage.local.set({ status: { ...status, at: new Date().toISOString() } });
  await chrome.action.setBadgeText({ text: status.ok ? "" : "!" });
  await chrome.action.setBadgeBackgroundColor({ color: "#e11d48" });
  await chrome.action.setTitle({ title: `Kanakkupulla Sync: ${status.message}` });
  return status;
}

async function readPortal() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (contexts.length === 0) {
    await chrome.offscreen.createDocument({ url: "offscreen.html", reasons: ["DOM_PARSER"], justification: "Read the TIC Fiber subscriber report" });
  }
  return chrome.runtime.sendMessage({ target: "offscreen", type: "readTicFiber" });
}

let running = null;

/** One sync; overlapping calls share the run in progress. */
function syncNow() {
  running ??= runSync().finally(() => (running = null));
  return running;
}

async function runSync() {
  const { appUrl, syncKey } = await chrome.storage.local.get(["appUrl", "syncKey"]);
  if (!appUrl || !syncKey) return setStatus({ ok: false, code: "NOT_SET_UP", message: MESSAGES.NOT_SET_UP });

  let portal;
  try {
    portal = await readPortal();
  } catch (err) {
    return setStatus({ ok: false, code: "NETWORK", message: MESSAGES.NETWORK, detail: String(err?.message ?? err) });
  }
  if (!portal || portal.error) {
    const code = portal?.error ?? "NETWORK";
    return setStatus({ ok: false, code, message: MESSAGES[code] ?? MESSAGES.NETWORK, detail: portal?.detail });
  }

  try {
    const res = await fetch(`${appUrl}/api/cable/sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${syncKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "TIC_FIBER", rows: portal.rows, wallet: portal.wallet ?? null }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setStatus({ ok: false, code: `HTTP_${res.status}`, message: data.error ?? `Kanakkupulla answered ${res.status}.` });
    const changes = [data.created && `${data.created} new`, data.updated && `${data.updated} updated`, data.renewals && `${data.renewals} renewed`, data.gone && `${data.gone} removed`].filter(Boolean);
    return setStatus({ ok: true, message: `${data.received} subscribers synced${changes.length ? ` (${changes.join(", ")})` : ""}.` });
  } catch (err) {
    return setStatus({ ok: false, code: "NETWORK", message: MESSAGES.NETWORK, detail: String(err?.message ?? err) });
  }
}
