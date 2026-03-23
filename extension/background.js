// background.js — Service Worker
// 1. Listens for LeetCode page loads -> injects bridge.js (isolated) + content.js (MAIN)
// 2. Receives AC data forwarded from bridge.js
// 3. Calls Ollama for analysis -> saves to storage -> notifies web app

const CONFIG = {
  ollamaUrl: "http://localhost:11434/api/generate",
  ollamaModel: "llama3.2",
  webAppUrl: "http://localhost:3000",
};

// ========== 1. Script injection ==========

function injectScripts(tabId) {
  // Inject bridge.js first (isolated world, has chrome.runtime)
  chrome.scripting.executeScript({
    target: { tabId },
    files: ["bridge.js"],
    world: "ISOLATED",
  }).then(() => {
    console.log("[LC Sync BG] bridge.js injected, tab:", tabId);
    // Then inject content.js (MAIN world, can intercept fetch / access DOM)
    return chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
      world: "MAIN",
    });
  }).then(() => {
    console.log("[LC Sync BG] content.js injected (MAIN), tab:", tabId);
  }).catch((err) => {
    console.warn("[LC Sync BG] Inject error (may be duplicate):", err.message);
  });
}

// Inject on page load
chrome.webNavigation.onCompleted.addListener(
  (details) => {
    if (details.frameId !== 0) return;
    console.log("[LC Sync BG] Page loaded:", details.url);
    injectScripts(details.tabId);
  },
  {
    url: [
      { hostEquals: "leetcode.com", pathPrefix: "/problems/" },
      { hostEquals: "leetcode.cn", pathPrefix: "/problems/" },
    ],
  }
);

// Also inject on SPA navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url?.match(/leetcode\.(com|cn)\/problems\//)
  ) {
    injectScripts(tabId);
  }
});

// ========== 2. Message listener ==========

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "PROBLEM_ACCEPTED") {
    console.log("[LC Sync BG] Received PROBLEM_ACCEPTED:", msg.data.title);
    processProblem(msg.data)
      .then((r) => sendResponse({ success: true, data: r }))
      .catch((e) => {
        console.error("[LC Sync BG] Error:", e);
        sendResponse({ success: false, error: e.message });
      });
    return true;
  }
  if (msg.type === "GET_HISTORY") {
    chrome.storage.local.get(["syncHistory"], (d) =>
      sendResponse({ history: d.syncHistory || [] })
    );
    return true;
  }
  if (msg.type === "UPDATE_CONFIG") {
    chrome.storage.local.set({ config: msg.config }, () =>
      sendResponse({ success: true })
    );
    return true;
  }
});

// ========== 3. Main processing pipeline ==========

async function processProblem(data) {
  console.log("[LC Sync BG] Processing:", data.title);

  const analysis = await callOllama(data);

  const record = {
    id: Date.now().toString(),
    title: data.title,
    titleSlug: data.titleSlug,
    difficulty: data.difficulty,
    tags: data.tags,
    url: data.url,
    category: analysis.category || "Uncategorized",
    subCategory: analysis.subCategory || "",
    complexity: analysis.complexity || "",
    approach: analysis.approach || "",
    keyPoints: analysis.keyPoints || "",
    pitfalls: analysis.pitfalls || "",
    highlights: analysis.highlights || "",
    interviewClarify: analysis.interviewClarify || "",
    interviewBrute: analysis.interviewBrute || "",
    interviewOptimal: analysis.interviewOptimal || "",
    interviewWalkthrough: analysis.interviewWalkthrough || "",
    solutions: [
      {
        label: `Solution (${data.language})`,
        code: data.userCode,
        lang: data.language,
      },
    ],
    reviewHistory: [],
    nextReview: new Date().toISOString().split("T")[0],
    reviewStage: 0,
    dateAdded: new Date().toISOString().split("T")[0],
    submittedAt: data.submittedAt,
    aiGenerated: true,
  };

  await saveRecord(record);
  await notifyWebApp(record);

  console.log("[LC Sync BG] Done:", record.title);
  return record;
}

// ========== 4. Ollama ==========

async function callOllama(data) {
  const defaults = {
    category: "Uncategorized", subCategory: "", complexity: "",
    approach: "", keyPoints: "", pitfalls: "",
    highlights: "", interviewClarify: "", interviewBrute: "",
    interviewOptimal: "", interviewWalkthrough: "",
  };

  try {
    const res = await fetch(CONFIG.ollamaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CONFIG.ollamaModel,
        stream: false,
        options: { temperature: 0.3, num_predict: 2000 },
        prompt: `You are a LeetCode interview prep assistant. Given the problem and user's accepted code, generate structured study notes AND a full interview walkthrough guide.

Problem: ${data.title}
Difficulty: ${data.difficulty}
Tags: ${data.tags.join(", ")}
User code (${data.language}):
\`\`\`
${data.userCode}
\`\`\`

Respond ONLY with a JSON object (no markdown, no extra text):
{
  "category": "main category (e.g. Sliding Window, Binary Search, DP, Graph, Tree, etc.)",
  "subCategory": "sub-method (e.g. 1.1 Sliding Window, 2.1 Standard Binary Search)",
  "complexity": "time and space, e.g. O(n) / O(1)",
  "approach": "concise approach description, 2-3 sentences",
  "keyPoints": "core takeaways, 1-2 sentences",
  "pitfalls": "common mistakes, 1-2 sentences",
  "interviewClarify": "2-3 short clarifying questions to ask interviewer before coding, e.g. 'Can the array contain duplicates?' Write as a short bullet list separated by newlines.",
  "interviewBrute": "Briefly describe the brute force approach, its time/space complexity, and why it's suboptimal. 2-3 sentences.",
  "interviewOptimal": "Explain the optimal approach to the interviewer: what data structure/algorithm to use, why it improves on brute force, and the time/space complexity. 3-4 sentences, as if speaking to interviewer before coding.",
  "interviewWalkthrough": "Line-by-line or block-by-block walkthrough of the user's code as if explaining to interviewer while coding. Use short sentences like 'First I initialize a hashmap to store seen values. Then I iterate through the array...' Keep it concise, 4-6 sentences."
}

IMPORTANT: All interview fields must be in English. Be concise and natural — write as if actually speaking to an interviewer, not writing an essay.`,
      }),
    });

    if (!res.ok) throw new Error(`Ollama returned ${res.status}`);

    const d = await res.json();
    const raw = d.response || "";
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) return { ...defaults, ...JSON.parse(m[0]) };
  } catch (e) {
    console.error("[LC Sync BG] Ollama error:", e);
  }

  return { ...defaults, approach: "(Ollama unavailable - fill in manually)" };
}

// ========== 5. Storage ==========

async function saveRecord(record) {
  return new Promise((resolve) => {
    chrome.storage.local.get(["syncHistory"], (d) => {
      const history = d.syncHistory || [];
      history.unshift(record);
      if (history.length > 500) history.length = 500;
      chrome.storage.local.set({ syncHistory: history }, resolve);
    });
  });
}

// ========== 6. Notify web app ==========
// Uses chrome.scripting.executeScript to postMessage into the web app tab
// React's useExtensionSync hook picks it up

async function notifyWebApp(record) {
  try {
    const tabs = await chrome.tabs.query({ url: CONFIG.webAppUrl + "/*" });
    if (tabs.length === 0) {
      console.log("[LC Sync BG] Web app not open");
      return;
    }
    for (const tab of tabs) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          world: "MAIN",
          func: (data) => {
            window.postMessage({ type: "LC_SYNC_NEW_PROBLEM", problem: data }, "*");
            console.log("[LC Sync] postMessage sent to web app:", data.title);
          },
          args: [record],
        });
        console.log("[LC Sync BG] Notified web app tab:", tab.id);
      } catch (e) {
        console.warn("[LC Sync BG] Notify tab failed:", e);
      }
    }
  } catch (e) {
    console.error("[LC Sync BG] notifyWebApp error:", e);
  }
}