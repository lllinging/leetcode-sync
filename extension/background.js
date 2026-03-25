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

  // Build prompt with category list
  const categoryList = [
    "滑动窗口", "单序列双指针", "双序列双指针",
    "二分查找", "二分答案", "动态规划", "树", "图论",
    "栈/队列", "贪心", "回溯", "哈希表", "链表",
    "排序", "数学", "字符串", "位运算", "设计",
  ].join(", ");

  const prompt = [
    "You are a LeetCode interview prep assistant.",
    "Given the problem and user code, generate structured study notes.",
    "",
    "Problem: " + data.title,
    "Difficulty: " + data.difficulty,
    "Tags: " + data.tags.join(", "),
    "User code (" + data.language + "):",
    "```",
    data.userCode,
    "```",
    "",
    "Respond ONLY with a JSON object. No markdown, no extra text.",
    "",
    "Rules for the category field:",
    "- Pick a main category from this list: " + categoryList,
    "- If there is a clear subcategory, format as: 主类--子类",
    "- Examples: 滑动窗口--定长滑动窗口, 单序列双指针--双向双指针, 二分查找--基础",
    "- If unsure of subcategory, just use the main category, e.g. 滑动窗口",
    "",
    "Rules for language:",
    "- category, approach, keyPoints, pitfalls: write in Chinese",
    "- All interview fields: write in English",
    "",
    "JSON format:",
    "{",
    '  "category": "主类--子类 (see rules above)",',
    '  "subCategory": "",',
    '  "complexity": "O(n) / O(1)",',
    '  "approach": "简洁的解题思路，2-3句中文",',
    '  "keyPoints": "核心要点，1-2句中文",',
    '  "pitfalls": "常见错误，1-2句中文",',
    '  "interviewClarify": "2-3 clarifying questions in English",',
    '  "interviewBrute": "Brute force approach, 2-3 sentences in English",',
    '  "interviewOptimal": "Optimal approach, 3-4 sentences in English",',
    '  "interviewWalkthrough": "Code walkthrough, 4-6 sentences in English"',
    "}",
  ].join("\n");

  try {
    const res = await fetch(CONFIG.ollamaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CONFIG.ollamaModel,
        stream: false,
        options: { temperature: 0.3, num_predict: 2000 },
        prompt: prompt,
      }),
    });

    if (!res.ok) throw new Error("Ollama returned " + res.status);

    const d = await res.json();
    const raw = d.response || "";
    console.log("[LC Sync BG] Ollama raw response:", raw.slice(0, 200));

    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      const parsed = JSON.parse(m[0]);
      console.log("[LC Sync BG] Parsed category:", parsed.category);
      return { ...defaults, ...parsed };
    } else {
      console.warn("[LC Sync BG] No JSON found in Ollama response");
    }
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