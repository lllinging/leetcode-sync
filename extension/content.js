// content.js — Runs in MAIN world (shares window with page)
// Intercepts fetch to detect AC, extracts code, sends to bridge.js via postMessage
(() => {
  if (window.__lcSyncInjected) return;
  window.__lcSyncInjected = true;

  console.log("[LC Sync] Content script loaded in MAIN world");

  // ========== 1. Helpers ==========

  const getSlug = () => {
    const m = location.pathname.match(/\/problems\/([^/]+)/);
    return m ? m[1] : null;
  };

  // ========== 2. Fetch problem details via GraphQL ==========

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
    } catch (e) {
      console.error("[LC Sync] Fetch problem detail failed:", e);
      return null;
    }
  };

  // ========== 3. Extract code from submission result ==========

  const extractCodeFromSubmissionResult = () => {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 40; // 40 x 250ms = 10s

      const poll = () => {
        attempts++;

        // Method 1: <pre><code> in submission result area
        const codeBlocks = document.querySelectorAll("pre code");
        for (const block of codeBlocks) {
          const text = block.textContent?.trim();
          if (text && text.length > 20 && looksLikeUserCode(text)) {
            console.log("[LC Sync] Got code from <pre><code>, length:", text.length);
            resolve(text);
            return;
          }
        }

        // Method 2: styled code elements
        const styledCode = document.querySelectorAll(
          '[class*="code-area"] code, [class*="submissionCode"] code, [class*="submitted-code"] code'
        );
        for (const el of styledCode) {
          const text = el.textContent?.trim();
          if (text && text.length > 20) {
            console.log("[LC Sync] Got code from styled element, length:", text.length);
            resolve(text);
            return;
          }
        }

        // Method 3: Monaco editor (MAIN world has direct access)
        const monacoCode = tryMonacoExtraction();
        if (monacoCode) {
          console.log("[LC Sync] Got code from Monaco, length:", monacoCode.length);
          resolve(monacoCode);
          return;
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 250);
        } else {
          console.warn("[LC Sync] Code extraction timeout");
          resolve("");
        }
      };

      setTimeout(poll, 1000);
    });
  };

  const looksLikeUserCode = (text) => {
    const patterns = [
      /\bdef\s+\w+/, /\bclass\s+\w+/, /\bfunction\s*\(/,
      /\breturn\b/, /\bfor\s*\(/, /\bwhile\s*\(/,
      /\bif\s*\(/, /\bint\s+\w+/, /\bvoid\s+\w+/,
      /\bpublic\s+/, /\bvar\s+\w+/, /\blet\s+\w+/,
      /\bconst\s+\w+/, /=>/, /\bself\.\w+/,
      /\bvector</, /\bList\[/, /\bTreeNode/, /\bListNode/,
      /\.\w+\(.*\)/,
    ];
    let hits = 0;
    for (const p of patterns) {
      if (p.test(text)) hits++;
      if (hits >= 2) return true;
    }
    return false;
  };

  const tryMonacoExtraction = () => {
    const lines = document.querySelectorAll(".monaco-editor .view-lines .view-line");
    if (lines.length > 0) {
      return Array.from(lines).map((l) => l.textContent).join("\n");
    }
    const cm = document.querySelector(".CodeMirror");
    if (cm?.CodeMirror) return cm.CodeMirror.getValue();
    return null;
  };

  // ========== 4. Fetch latest AC submission via API (fallback) ==========

  const fetchLatestACSubmission = async (slug) => {
    const isCN = location.hostname.includes("leetcode.cn");
    const url = isCN ? "https://leetcode.cn/graphql" : "https://leetcode.com/graphql";
    const query = `query($questionSlug:String!,$limit:Int,$offset:Int){
      questionSubmissionList(questionSlug:$questionSlug,offset:$offset,limit:$limit,status:10){
        submissions{ id lang code statusDisplay }
      }
    }`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          query,
          variables: { questionSlug: slug, limit: 1, offset: 0 },
        }),
      });
      const data = await res.json();
      const sub = data?.data?.questionSubmissionList?.submissions?.[0];
      if (sub?.code) {
        console.log("[LC Sync] Got code from submissions API, lang:", sub.lang);
        return { code: sub.code, lang: sub.lang };
      }
    } catch (e) {
      console.error("[LC Sync] Submissions API failed:", e);
    }
    return null;
  };

  // ========== 5. Detect language ==========

  const detectLanguage = () => {
    const langBtn = document.querySelector(
      '[data-cy="lang-btn"], button[id*="lang"], [class*="lang-select"] button'
    );
    if (langBtn) return langBtn.textContent.trim().toLowerCase();
    const params = new URLSearchParams(location.search);
    if (params.get("lang")) return params.get("lang");
    return "python3";
  };

  // ========== 6. Listen for AC ==========

  // Method A: intercept fetch (MAIN world can intercept page's fetch)
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await origFetch.apply(this, args);
    try {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
      if (url.includes("/submissions/detail/") && url.includes("/check/")) {
        const clone = res.clone();
        clone.json().then((d) => {
          if (d?.status_msg === "Accepted") {
            console.log("[LC Sync] AC detected via fetch intercept");
            handleAccepted();
          }
        }).catch(() => {});
      }
    } catch {}
    return res;
  };

  // Method B: DOM mutation observer
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const n of m.addedNodes) {
        if (n.nodeType === 1) {
          const text = n.textContent || "";
          if (
            text.includes("Accepted") &&
            !text.includes("Not Accepted") &&
            (n.querySelector?.('[data-e2e-locator="submission-result"]') ||
              n.querySelector?.('[class*="accepted"]') ||
              n.querySelector?.('[class*="success"]'))
          ) {
            console.log("[LC Sync] AC detected via DOM observer");
            handleAccepted();
          }
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // ========== 7. Handle AC ==========

  let lastTime = 0;
  const handleAccepted = async () => {
    const now = Date.now();
    if (now - lastTime < 10000) return; // 10s debounce
    lastTime = now;

    const slug = getSlug();
    if (!slug) return;

    console.log("[LC Sync] Processing AC for:", slug);

    const [detail, lang] = await Promise.all([
      fetchProblemDetail(slug),
      detectLanguage(),
    ]);
    if (!detail) {
      console.error("[LC Sync] Could not fetch problem detail");
      return;
    }

    // Extract code
    let code = await extractCodeFromSubmissionResult();
    let finalLang = lang;

    if (!code) {
      console.log("[LC Sync] DOM extraction failed, trying API...");
      const apiResult = await fetchLatestACSubmission(slug);
      if (apiResult) {
        code = apiResult.code;
        finalLang = apiResult.lang || lang;
      }
    }

    if (!code) {
      console.warn("[LC Sync] All extraction methods failed");
      showToast("Sync failed: could not extract code");
      return;
    }

    // Send to bridge.js via postMessage (bridge has chrome.runtime access)
    const payload = {
      questionId: detail.questionId,
      title: `${detail.questionId}. ${detail.title}`,
      titleSlug: detail.titleSlug,
      difficulty: detail.difficulty,
      tags: detail.topicTags.map((t) => t.name),
      url: location.href.split("?")[0],
      userCode: code,
      language: finalLang,
      submittedAt: new Date().toISOString(),
    };

    console.log("[LC Sync] Sending to bridge:", payload.title);
    window.postMessage({ type: "__LC_SYNC_TO_BG__", payload }, "*");
  };

  // ========== 8. Listen for bridge responses ==========

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    if (event.data?.type === "__LC_SYNC_RESPONSE__") {
      showToast(
        event.data.success
          ? "Synced to notebook!"
          : "Sync failed: " + (event.data.error || "unknown")
      );
    }

    if (event.data?.type === "__LC_SYNC_MANUAL__") {
      handleAccepted();
    }
  });

  // ========== 9. Toast notification ==========

  const showToast = (text) => {
    const el = document.createElement("div");
    el.textContent = text;
    Object.assign(el.style, {
      position: "fixed", top: "20px", right: "20px", padding: "12px 20px",
      background: "#1a1a2e", color: "#e0e0e0", borderRadius: "8px",
      fontSize: "14px", fontWeight: "600", zIndex: "999999",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)", border: "1px solid #6c5ce7",
      transition: "opacity 0.3s",
    });
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 300);
    }, 3000);
  };
})();