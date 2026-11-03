// Every minute: read each ticked portal (TIC Fiber, TCCL) in the offscreen document and post it to Kanakkupulla.

const ALARM = "sync";
const PERIOD_MINUTES = 1;

/** The portals this extension can read; each is synced only when ticked in the popup. */
const PORTALS = [
  { id: "TIC_FIBER", name: "TIC Fiber", host: "partner.ticfiber.in", reader: "readTicFiber", setting: "useTicFiber", byDefault: true },
  { id: "TCCL", name: "TCCL", host: "sms.tccl.co.in", reader: "readTccl", setting: "useTccl", byDefault: true },
];

const MESSAGES = {
  NOT_SET_UP: "Add the Kanakkupulla address and sync key in this popup.",
  NONE_TICKED: "Tick at least one portal to sync.",
  LOGGED_OUT: (p) => `log in at ${p.host} in this Chrome.`,
  NO_TABLE: (p) => `the ${p.name} page has changed; the extension needs an update.`,
  TOO_MANY: () => "more than 10,000 subscribers; the extension needs an update. Nothing was changed.",
  EMPTY: () => "the list came back empty, so nothing was changed.",
  NETWORK: () => "couldn't reach it or Kanakkupulla; retrying in a minute.",
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

async function readPortal(portal) {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (contexts.length === 0) {
    await chrome.offscreen.createDocument({ url: "offscreen.html", reasons: ["DOM_PARSER"], justification: "Read the TIC Fiber and TCCL subscriber lists" });
  }
  return chrome.runtime.sendMessage({ target: "offscreen", type: portal.reader });
}

let running = null;

/** One sync; overlapping calls share the run in progress. */
function syncNow() {
  running ??= runSync().finally(() => (running = null));
  return running;
}

/** Reads one portal and posts it; returns a one-line result for the popup. */
async function syncPortal(portal, appUrl, syncKey) {
  let result;
  try {
    result = await readPortal(portal);
  } catch (err) {
    return { ok: false, text: `${portal.name}: ${MESSAGES.NETWORK(portal)}`, detail: String(err?.message ?? err) };
  }
  if (!result || result.error) {
    const message = MESSAGES[result?.error] ?? MESSAGES.NETWORK;
    return { ok: false, text: `${portal.name}: ${message(portal)}`, detail: result?.detail };
  }
  try {
    const res = await fetch(`${appUrl}/api/cable/sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${syncKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ provider: portal.id, rows: result.rows, wallet: result.wallet ?? null }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, text: `${portal.name}: ${data.error ?? `Kanakkupulla answered ${res.status}.`}` };
    const changes = [
      data.created && `${data.created} new`,
      data.updated && `${data.updated} updated`,
      data.renewals && `${data.renewals} renewed`,
      data.charges && `${data.charges} billed`,
      data.gone && `${data.gone} removed`,
    ].filter(Boolean);
    return { ok: true, text: `${portal.name}: ${data.received} synced${changes.length ? ` (${changes.join(", ")})` : ""}` };
  } catch (err) {
    return { ok: false, text: `${portal.name}: ${MESSAGES.NETWORK(portal)}`, detail: String(err?.message ?? err) };
  }
}

async function runSync() {
  const settings = await chrome.storage.local.get(["appUrl", "syncKey", ...PORTALS.map((p) => p.setting)]);
  if (!settings.appUrl || !settings.syncKey) return setStatus({ ok: false, code: "NOT_SET_UP", message: MESSAGES.NOT_SET_UP });
  const ticked = PORTALS.filter((p) => settings[p.setting] ?? p.byDefault);
  if (ticked.length === 0) return setStatus({ ok: false, code: "NONE_TICKED", message: MESSAGES.NONE_TICKED });

  const results = [];
  for (const portal of ticked) results.push(await syncPortal(portal, settings.appUrl, settings.syncKey));
  return setStatus({ ok: results.every((r) => r.ok), message: results.map((r) => r.text).join(" · ") });
}
