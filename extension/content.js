// Injected into LeetCode problem pages.
// Detects AC submissions, scrapes problem data + user code, sends to background.js.
(() => {
  if (window.__lcSyncInjected) return;
  window.__lcSyncInjected = true;

  const getSlug = () => {
    const m = location.pathname.match(/\/problems\/([^/]+)/);
    return m ? m[1] : null;
  };

  const fetchProblemDetail = async (slug) => {
    const isCN = location.hostname.includes("leetcode.cn");
    const url = isCN ? "https://leetcode.cn/graphql" : "https://leetcode.com/graphql";
    const query = `query($titleSlug:String!){question(titleSlug:$titleSlug){questionId title titleSlug difficulty topicTags{name slug}}}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { titleSlug: slug } }),
      });
      const data = await res.json();
      return data?.data?.question || null;
    } catch (e) { console.error("[LC Sync] Fetch failed:", e); return null; }
  };

  const extractUserCode = () => {
    const lines = document.querySelectorAll(".monaco-editor .view-lines .view-line");
    if (lines.length) return Array.from(lines).map((l) => l.textContent).join("\n");
    const cm = document.querySelector(".CodeMirror");
    if (cm?.CodeMirror) return cm.CodeMirror.getValue();
    return "";
  };

  const detectLanguage = () => {
    const btn = document.querySelector('[data-cy="lang-btn"], button[id*="lang"]');
    if (btn) return btn.textContent.trim().toLowerCase();
    const params = new URLSearchParams(location.search);
    if (params.get("lang")) return params.get("lang");
    return "python3";
  };

  // Intercept fetch to detect submission results
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await origFetch.apply(this, args);
    try {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
      if (url.includes("/submit") || url.includes("check")) {
        const clone = res.clone();
        clone.json().then((d) => { if (d?.status_msg === "Accepted") handleAccepted(); }).catch(() => {});
      }
    } catch {}
    return res;
  };

  // Also watch DOM for "Accepted" text
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const n of m.addedNodes) {
        if (n.nodeType === 1 && n.textContent?.includes("Accepted") && !n.textContent.includes("Not Accepted")) {
          if (n.querySelector?.('[data-e2e-locator="submission-result"],[class*="accepted"],[class*="success"]')) handleAccepted();
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  let lastTime = 0;
  const handleAccepted = async () => {
    const now = Date.now();
    if (now - lastTime < 10000) return;
    lastTime = now;

    const slug = getSlug();
    if (!slug) return;

    const [detail, code, lang] = await Promise.all([fetchProblemDetail(slug), extractUserCode(), detectLanguage()]);
    if (!detail) return;

    chrome.runtime.sendMessage({
      type: "PROBLEM_ACCEPTED",
      data: {
        questionId: detail.questionId,
        title: `${detail.questionId}. ${detail.title}`,
        titleSlug: detail.titleSlug,
        difficulty: detail.difficulty,
        tags: detail.topicTags.map((t) => t.name),
        url: location.href.split("?")[0],
        userCode: code,
        language: lang,
        submittedAt: new Date().toISOString(),
      },
    }, (resp) => {
      showToast(resp?.success ? "Synced to notebook!" : "Sync failed: " + (resp?.error || "unknown"));
    });
  };

  // Listen for manual sync from popup
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "MANUAL_SYNC") handleAccepted();
  });

  const showToast = (text) => {
    const el = document.createElement("div");
    el.textContent = text;
    Object.assign(el.style, {
      position: "fixed", top: "20px", right: "20px", padding: "12px 20px",
      background: "#1a1a2e", color: "#e0e0e0", borderRadius: "8px", fontSize: "14px",
      fontWeight: "600", zIndex: "999999", boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      border: "1px solid #6c5ce7", transition: "opacity 0.3s",
    });
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 300); }, 3000);
  };
})();
