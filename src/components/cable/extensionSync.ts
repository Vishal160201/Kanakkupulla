// Talks to the Kanakkupulla Sync browser extension through its bridge script (browser-extension/bridge.js).
import { askExtension, ExtensionMissingError } from "@/lib/extension/bridge";

export { ExtensionMissingError };

export interface ExtensionSyncStatus {
  ok: boolean;
  message: string;
}

/** Asks the extension in this browser to sync now; resolves with its result. */
export function requestExtensionSync(): Promise<ExtensionSyncStatus> {
  return askExtension<ExtensionSyncStatus>("syncNow", {}, {
    missing: "The Kanakkupulla Sync extension isn't set up in this browser. If you just set it up, reload this page.",
    slow: "The sync is taking too long. It will keep trying every minute.",
  });
}
