// Answers the background worker's requests to read the portal (DOMParser only exists in documents).
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== "offscreen" || message.type !== "readTicFiber") return false;
  readTicFiber()
    .then(sendResponse)
    .catch((err) => sendResponse({ error: "NETWORK", detail: String(err?.message ?? err) }));
  return true; // responds asynchronously
});
