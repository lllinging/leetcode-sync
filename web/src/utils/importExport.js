import { today } from "./review";

/**
 * Parse a TSV string (copy-pasted from Excel) into problem objects.
 * Supports both English and Chinese headers via fuzzy matching.
 */
export const parseTSV = (text) => {
  const lines = text.split("\n").map((l) => l.split("\t"));
  if (lines.length < 2) return [];

  const headers = lines[0].map((h) => h.trim().toLowerCase());

  const find = (...keys) => {
    for (const k of keys) {
      const i = headers.findIndex((h) => h.includes(k));
      if (i >= 0) return i;
    }
    return -1;
  };

  const iTitle = find("title", "\u9898\u76ee");
  const iCat = find("category", "\u5206\u7c7b");
  const iSub = find("subcategory", "sub", "\u5b50\u5206\u7c7b");
  const iDiff = find("difficulty", "diff", "\u96be\u5ea6");
  const iComp = find("complexity", "\u590d\u6742\u5ea6");
  const iTags = find("tags", "tag", "\u6807\u7b7e");
  const iKey = find("keypoints", "key", "\u8981\u70b9");
  const iApp = find("approach", "\u601d\u8def");
  const iPit = find("pitfalls", "pitfall", "\u6613\u9519");
  const iHi = find("highlights", "highlight", "\u4eae\u70b9");
  const iIntv = find("interview");
  const iC1 = find("solution1", "code1", "\u65b9\u6cd51");
  const iC2 = find("solution2", "code2", "\u65b9\u6cd52");

  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (row.length < 2) continue;
    const g = (idx) => (idx >= 0 && row[idx] ? row[idx].trim() : "");
    const title = g(iTitle) || g(0);
    if (!title) continue;

    const solutions = [
      g(iC1) && { label: "Solution 1", code: g(iC1), lang: "python" },
      g(iC2) && { label: "Solution 2", code: g(iC2), lang: "python" },
    ].filter(Boolean);

    results.push({
      id: Date.now().toString() + i,
      title,
      category: g(iCat) || "Uncategorized",
      subCategory: g(iSub) || "",
      difficulty: g(iDiff) || "Medium",
      complexity: g(iComp) || "",
      tags: (g(iTags) || "").split(/[,，]/).map((t) => t.trim()).filter(Boolean),
      keyPoints: g(iKey) || "",
      approach: g(iApp) || "",
      pitfalls: g(iPit) || "",
      highlights: g(iHi) || "",
      interviewIntro: g(iIntv) || "",
      solutions,
      reviewHistory: [],
      nextReview: today(),
      reviewStage: 0,
      dateAdded: today(),
      aiGenerated: false,
    });
  }

  return results;
};

/** Download all problems as a JSON backup file */
export const exportJSON = (problems) => {
  const blob = new Blob([JSON.stringify(problems, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `leetcode_notes_${today()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};

/** Merge imported JSON into existing problems (dedup by title) */
export const mergeJSON = (jsonText, existingProblems) => {
  const data = JSON.parse(jsonText);
  if (!Array.isArray(data) || !data.length) {
    throw new Error("Invalid or empty JSON");
  }

  const merged = [...existingProblems];
  let addedCount = 0;

  data.forEach((p) => {
    if (!merged.some((x) => x.title === p.title)) {
      merged.push({ ...p, id: p.id || Date.now().toString() + Math.random() });
      addedCount++;
    }
  });

  return { merged, addedCount, skipped: data.length - addedCount };
};
