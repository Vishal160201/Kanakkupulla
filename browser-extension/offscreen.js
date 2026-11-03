// Answers the background worker's requests to read the portal (DOMParser only exists in documents).
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const readers = { readTicFiber: globalThis.readTicFiber, readTccl: globalThis.readTccl };
  if (message?.target !== "offscreen" || !readers[message.type]) return false;
  readers[message.type]()
    .then(sendResponse)
    .catch((err) => sendResponse({ error: "NETWORK", detail: String(err?.message ?? err) }));
  return true; // responds asynchronously
});
