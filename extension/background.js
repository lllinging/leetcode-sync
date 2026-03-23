// Background service worker.
// Receives problem data from content.js, calls Ollama for analysis, stores results.

const CONFIG = {
  ollamaUrl: "http://localhost:11434/api/generate",
  ollamaModel: "llama3.2",
  webAppUrl: "http://localhost:3000",
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "PROBLEM_ACCEPTED") {
    processProblem(msg.data).then((r) => sendResponse({ success: true, data: r })).catch((e) => sendResponse({ success: false, error: e.message }));
    return true;
  }
  if (msg.type === "GET_HISTORY") {
    chrome.storage.local.get(["syncHistory"], (d) => sendResponse({ history: d.syncHistory || [] }));
    return true;
  }
  if (msg.type === "UPDATE_CONFIG") {
    chrome.storage.local.set({ config: msg.config }, () => sendResponse({ success: true }));
    return true;
  }
});

async function processProblem(data) {
  const analysis = await callOllama(data);
  const record = {
    id: Date.now().toString(), title: data.title, titleSlug: data.titleSlug,
    difficulty: data.difficulty, tags: data.tags, url: data.url,
    category: analysis.category || "Uncategorized", subCategory: analysis.subCategory || "",
    complexity: analysis.complexity || "", approach: analysis.approach || "",
    keyPoints: analysis.keyPoints || "", pitfalls: analysis.pitfalls || "",
    highlights: analysis.highlights || "", interviewIntro: analysis.interviewIntro || "",
    solutions: [{ label: `Solution (${data.language})`, code: data.userCode, lang: data.language }],
    reviewHistory: [], nextReview: new Date().toISOString().split("T")[0],
    reviewStage: 0, dateAdded: new Date().toISOString().split("T")[0],
    submittedAt: data.submittedAt, aiGenerated: true,
  };
  await saveRecord(record);
  await notifyWebApp(record);
  return record;
}

async function callOllama(data) {
  const defaults = { category: "Uncategorized", subCategory: "", complexity: "", approach: "", keyPoints: "", pitfalls: "", highlights: "", interviewIntro: "" };
  try {
    const res = await fetch(CONFIG.ollamaUrl, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CONFIG.ollamaModel, stream: false,
        options: { temperature: 0.3, num_predict: 2000 },
        prompt: `You are a LeetCode study notes assistant. Given the problem info and user code below, generate structured notes.

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
  "highlights": "what makes this problem interesting, 1 sentence",
  "interviewIntro": "one-sentence English intro for interviews"
}`,
      }),
    });
    if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
    const d = await res.json();
    const raw = d.response || "";
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) return { ...defaults, ...JSON.parse(m[0]) };
  } catch (e) { console.error("[LC Sync] Ollama error:", e); }
  return { ...defaults, approach: "(Ollama unavailable — fill in manually)" };
}

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

async function notifyWebApp(record) {
  try {
    const tabs = await chrome.tabs.query({ url: CONFIG.webAppUrl + "/*" });
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { type: "NEW_PROBLEM_SYNCED", data: record }).catch(() => {});
    }
  } catch {}
}
