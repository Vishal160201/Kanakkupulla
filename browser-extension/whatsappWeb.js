// Opens a WhatsApp Web chat with a PDF attached and the message as its caption. Nothing is sent: the user checks it
// and presses Send. WhatsApp Web has no official API for this, so it works with the page itself; when WhatsApp changes
// its layout the steps below may stop finding things, and the user gets a message to use the invoice link instead.

/** Runs inside the WhatsApp Web tab (injected by chrome.scripting); must be self-contained. */
async function attachInWhatsApp(pdfBase64, filename, text) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (find, ms) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const found = find();
      if (found) return found;
      await sleep(250);
    }
    return null;
  };
  const composeBox = () => document.querySelector('footer [contenteditable="true"], [contenteditable="true"][data-tab="10"]');

  // 1. The chat is open (or WhatsApp says why not)
  const state = await until(() => {
    if (composeBox()) return "chat";
    const page = document.body?.innerText || "";
    if (/phone number shared via url is invalid|isn't on whatsapp|is not on whatsapp/i.test(page)) return "invalid";
    if (document.querySelector('canvas[aria-label*="Scan" i], [data-ref] canvas') || /scan to log in|link a device|log in with phone number/i.test(page)) return "login";
    if (/works with google chrome|update (your )?(google )?chrome|browser (is )?not supported/i.test(page)) return "browser";
    return null;
  }, 45_000);
  if (state === "invalid") return { ok: false, message: "WhatsApp says this number isn't on WhatsApp." };
  if (state === "login") return { ok: false, message: "Log in to WhatsApp Web in this Chrome (scan the QR code), then try again." };
  if (state === "browser") return { ok: false, message: "WhatsApp Web wants a newer Chrome. Update Chrome, then try again." };
  if (state !== "chat") return { ok: false, message: "WhatsApp Web didn't open the chat in time. Use the invoice link instead." };
  const compose = composeBox();

  // 2. Open the attach menu, then hand the PDF to its document input (no file picker opens)
  const attach = document.querySelector(
    'footer [data-icon="plus-rounded"], footer [data-icon="plus"], footer [data-icon="attach-menu-plus"], footer [data-icon="clip"], footer [title="Attach"], footer [aria-label="Attach"]'
  );
  (attach?.closest('button, [role="button"]') ?? attach)?.click();
  const input = await until(() => {
    const inputs = [...document.querySelectorAll('input[type="file"]')];
    return inputs.find((i) => !i.accept || i.accept === "*" || !/image|video/.test(i.accept));
  }, 5_000);
  if (!input) return { ok: false, message: "Couldn't find WhatsApp Web's attach option; the extension needs an update. Use the invoice link instead." };
  const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
  const files = new DataTransfer();
  files.items.add(new File([bytes], filename, { type: "application/pdf" }));
  input.files = files.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));

  // 3. The message goes in the preview's caption box
  if (!text) return { ok: true, stage: "attached", message: "PDF attached." };
  const caption = await until(() => {
    const boxes = [...document.querySelectorAll('[contenteditable="true"]')].filter((e) => e !== compose && !e.closest("#side") && !e.closest("footer"));
    return boxes[boxes.length - 1];
  }, 8_000);
  if (!caption) return { ok: true, stage: "attachedNoCaption", message: "PDF attached; add the message yourself." };
  caption.focus();
  // Line by line: inserting "\n" directly doubles the blank lines in WhatsApp's editor
  text.split("\n").forEach((line, i) => {
    if (i > 0) document.execCommand("insertLineBreak");
    if (line) document.execCommand("insertText", false, line);
  });
  return { ok: true, stage: "attached", message: "PDF and message attached." };
}

/** Called from the background worker: opens (or reuses) the WhatsApp Web tab on the client's chat and attaches. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used by background.js via importScripts
async function whatsappSend({ phone, text, filename, pdfBase64 }) {
  if (!/^\d{11,15}$/.test(String(phone))) return { ok: false, message: "That mobile number isn't usable." };
  if (typeof pdfBase64 !== "string" || pdfBase64.length > 20_000_000) return { ok: false, message: "The invoice PDF couldn't be read." };
  const url = `https://web.whatsapp.com/send?phone=${phone}`;
  const [existing] = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" });
  const tab = existing ? await chrome.tabs.update(existing.id, { url, active: true }) : await chrome.tabs.create({ url, active: true });
  await chrome.windows.update(tab.windowId, { focused: true });
  await new Promise((resolve) => {
    const done = (id, info) => {
      if (id === tab.id && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(done);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(done);
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(done);
      resolve();
    }, 30_000);
  });
  try {
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: attachInWhatsApp, args: [pdfBase64, String(filename || "Invoice.pdf"), String(text || "")] });
    return result ?? { ok: false, message: "WhatsApp Web didn't answer. Use the invoice link instead." };
  } catch (err) {
    return { ok: false, message: `Couldn't work in WhatsApp Web: ${err?.message ?? err}` };
  }
}
