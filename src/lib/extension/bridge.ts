// Talks to the Kanakkupulla Sync browser extension through its bridge script (browser-extension/bridge.js).

export class ExtensionMissingError extends Error {}

/**
 * Sends one request to the extension and resolves with its result. The bridge acknowledges at once when the
 * extension is there (and new enough to know this request type); otherwise this rejects with ExtensionMissingError.
 */
export function askExtension<T>(type: string, payload: Record<string, unknown> = {}, { ackMs = 1500, resultMs = 90_000, missing = "The Kanakkupulla Sync extension isn't set up in this browser.", slow = "The extension is taking too long." } = {}): Promise<T> {
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
        resolve(data.status as T);
      }
    };
    const ackTimer = setTimeout(() => {
      if (acked) return;
      done();
      reject(new ExtensionMissingError(missing));
    }, ackMs);
    const resultTimer = setTimeout(() => {
      done();
      reject(new Error(slow));
    }, resultMs);
    window.addEventListener("message", onMessage);
    window.postMessage({ source: "kanakku-page", type, id, ...payload }, window.location.origin);
  });
}

/** True when this browser's extension can send files on WhatsApp Web (v1.2+). */
export async function extensionCanUseWhatsApp(): Promise<boolean> {
  try {
    const r = await askExtension<{ whatsapp?: boolean }>("ping", {}, { ackMs: 800, resultMs: 2000 });
    return !!r?.whatsapp;
  } catch {
    return false;
  }
}

export interface WhatsAppSendResult {
  ok: boolean;
  /** "attached" = PDF and caption ready, "attachedNoCaption" = PDF ready but the message wasn't added */
  stage?: "attached" | "attachedNoCaption";
  message: string;
}

/** Opens the client's chat on WhatsApp Web with the PDF attached and the message as its caption; the user presses Send. */
export function sendOnWhatsAppWeb(input: { phone: string; text: string; filename: string; pdf: Blob }): Promise<WhatsAppSendResult> {
  return input.pdf.arrayBuffer().then((buf) => {
    let binary = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return askExtension<WhatsAppSendResult>(
      "whatsappSend",
      { phone: input.phone, text: input.text, filename: input.filename, pdfBase64: btoa(binary) },
      { resultMs: 75_000, missing: "Update the Kanakkupulla Sync extension to send PDFs on WhatsApp Web.", slow: "WhatsApp Web didn't open the chat in time. Check it's logged in, then try again." }
    );
  });
}
