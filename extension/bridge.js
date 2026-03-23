// bridge.js — Runs in isolated world (has chrome.runtime access)
// Bridges MAIN world content.js <-> background.js via postMessage

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== "__LC_SYNC_TO_BG__") return;

  const payload = event.data.payload;
  console.log("[LC Bridge] Forwarding to background:", payload.title);

  chrome.runtime.sendMessage(
    { type: "PROBLEM_ACCEPTED", data: payload },
    (resp) => {
      // Relay background response back to MAIN world content.js
      window.postMessage(
        {
          type: "__LC_SYNC_RESPONSE__",
          success: resp?.success ?? false,
          error: resp?.error || chrome.runtime.lastError?.message || "",
        },
        "*"
      );
    }
  );
});

// Listen for manual sync from popup, relay to MAIN world
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "MANUAL_SYNC") {
    window.postMessage({ type: "__LC_SYNC_MANUAL__" }, "*");
  }
});

console.log("[LC Bridge] Bridge loaded in isolated world");