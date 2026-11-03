// Talks to the Kanakkupulla Sync browser extension through its bridge script (browser-extension/bridge.js).

export interface ExtensionSyncStatus {
  ok: boolean;
  message: string;
}

export class ExtensionMissingError extends Error {}

/** Asks the extension in this browser to sync now; resolves with its result. */
export function requestExtensionSync(): Promise<ExtensionSyncStatus> {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    let acked = false;
    const done = () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(ackTimer);
      clearTimeout(resultTimer);
    };
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (event.source !== window || data?.source !== "kanakku-sync-extension" || data.id !== id) return;
      if (data.type === "ack") acked = true;
      if (data.type === "result") {
        done();
        resolve(data.status as ExtensionSyncStatus);
      }
    };
    // The bridge answers at once when the extension is there
    const ackTimer = setTimeout(() => {
      if (acked) return;
      done();
      reject(new ExtensionMissingError("The Kanakkupulla Sync extension isn't set up in this browser. If you just set it up, reload this page."));
    }, 1500);
    const resultTimer = setTimeout(() => {
      done();
      reject(new Error("The sync is taking too long. It will keep trying every minute."));
    }, 90_000);
    window.addEventListener("message", onMessage);
    window.postMessage({ source: "kanakku-page", type: "syncNow", id }, window.location.origin);
  });
}
