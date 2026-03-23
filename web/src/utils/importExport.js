import { today } from "./review";
import * as XLSX from "xlsx";

// ========== Header matching ==========

const findCol = (headers, ...keys) => {
  for (const k of keys) {
    const i = headers.findIndex((h) => h.includes(k));
    if (i >= 0) return i;
  }
  return -1;
};

// ========== Detect LeetCode title pattern: "123. Problem Name" ==========

function isLCTitle(val) {
  if (!val) return false;
  const s = String(val).trim();
  // Must start with number + period, and contain English letters (not Chinese)
  return /^\d+[\.\。]\s*[A-Z]/.test(s) && s.length > 5;
}

// ========== Parse rows into problems ==========

function rowsToProblems(rows, headers) {
  if (rows.length < 2) return [];

  const h = headers || rows[0].map((v) => String(v || "").trim().toLowerCase());

  // Header-based column matching
  const iApp = findCol(h, "解法+思路");
  const iComp = findCol(h, "复杂度", "complexity");
  // Exact "难度" (not "难度/要点")
  const iDiff = h.findIndex((v) => {
    const t = v.trim();
    return (t === "难度" || t === "difficulty") && !t.includes("/");
  });
  const iKey = findCol(h, "难度/要点", "要点", "keypoints");
  const iCat = findCol(h, "题型", "category");
  // "思路" column — must match exact "思路", not "解法+思路"
  const iApproach2 = h.findIndex((v) => v.trim() === "思路");
  const iPit = findCol(h, "易错", "pitfalls");
  const iIntv = findCol(h, "interview");
  const iC1 = findCol(h, "方法1", "solution1", "code1");
  const iC2 = findCol(h, "方法2", "solution2", "code2");

  const results = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;

    const g = (idx) => (idx >= 0 && row[idx] != null ? String(row[idx]).trim() : "");

    // Scan the row for the cell that looks like "1456. Maximum Number of Vowels..."
    let title = "";
    let titleIdx = -1;
    for (let c = 0; c < Math.min(row.length, 12); c++) {
      const val = row[c] != null ? String(row[c]).trim() : "";
      if (isLCTitle(val)) {
        title = val;
        titleIdx = c;
        break;
      }
    }

    // Skip rows without a valid LC title (section headers, blank rows, etc.)
    if (!title) continue;

    // Parse category and subcategory from "思路" column: "滑动窗口----定长滑动窗口（注意...）"
    const approachRaw2 = g(iApproach2);
    let category = "Uncategorized";
    let subCategory = "";
    
    if (approachRaw2) {
      if (approachRaw2.includes("----")) {
        // Has subcategory: "滑动窗口----定长滑动窗口"
        const dashParts = approachRaw2.split("----").map((s) => s.trim());
        category = dashParts[0] || "Uncategorized";
        if (dashParts[1]) {
          subCategory = dashParts[1].replace(/[（(].+$/, "").trim();
        }
      } else {
        // No subcategory, entire value is the category
        category = approachRaw2.replace(/[（(].+$/, "").trim() || "Uncategorized";
      }
    }

    // Tags from "题型" column, split by ||
    const tagsRaw = g(iCat) || "";
    const tags = tagsRaw
      .split(/\|\||｜｜/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    // Build approach from "解法+思路" column only (not "思路" which is category info)
    const approach = g(iApp) || "";

    const solutions = [
      g(iC1) && { label: "Solution 1", code: g(iC1), lang: "java" },
      g(iC2) && { label: "Solution 2", code: g(iC2), lang: "java" },
    ].filter(Boolean);

    results.push({
      id: Date.now().toString() + "-" + i,
      title,
      _titleIdx: titleIdx, // temp, used for hyperlink extraction
      category,
      subCategory,
      difficulty: normalizeDifficulty(g(iDiff)),
      complexity: g(iComp) || "",
      tags,
      keyPoints: g(iKey) || "",
      approach: approach || "",
      pitfalls: g(iPit) || "",
      interviewClarify: "",
      interviewBrute: "",
      interviewOptimal: "",
      interviewWalkthrough: g(iIntv) || "",
      solutions,
      reviewHistory: [],
      nextReview: today(),
      reviewStage: 0,
      dateAdded: today(),
      aiGenerated: false,
    });
  }

  return results;
}

function normalizeDifficulty(raw) {
  if (!raw) return "Medium";
  const lower = raw.toLowerCase();
  if (lower.includes("easy") || lower.includes("简单")) return "Easy";
  if (lower.includes("hard") || lower.includes("困难")) return "Hard";
  if (lower.includes("medium") || lower.includes("中等")) return "Medium";
  return "Medium";
}

// ========== Parse Excel (.xlsx / .xls) ==========

export const parseExcel = (arrayBuffer, sheetCategory) => {
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const allProblems = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    // Extract hyperlinks from cells
    const hyperlinks = {};
    for (const cellAddr in sheet) {
      if (cellAddr[0] === "!") continue;
      const cell = sheet[cellAddr];
      if (cell && cell.l && cell.l.Target) {
        hyperlinks[cellAddr] = cell.l.Target;
      }
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (rows.length < 2) continue;

    const headers = rows[0].map((v) => String(v || "").trim().toLowerCase());
    const problems = rowsToProblems(rows, headers);

    // Attach URLs and categories
    problems.forEach((p) => {
      // Find hyperlink by matching cell value to title
      if (p._titleIdx >= 0) {
        const colLetter = XLSX.utils.encode_col(p._titleIdx);
        // Search all rows for this title's hyperlink
        for (let r = 1; r <= rows.length; r++) {
          const cellRef = colLetter + r;
          if (hyperlinks[cellRef]) {
            const cell = sheet[cellRef];
            if (cell && String(cell.v || "").trim() === p.title) {
              p.url = hyperlinks[cellRef];
              const slugMatch = p.url.match(/\/problems\/([^/]+)/);
              if (slugMatch) p.titleSlug = slugMatch[1];
              break;
            }
          }
        }
      }
      delete p._titleIdx;

      if (sheetCategory && p.category === "Uncategorized") {
        p.category = sheetName;
      }
    });

    allProblems.push(...problems);
  }

  return allProblems;
};

// ========== Parse TSV ==========

export const parseTSV = (text) => {
  const lines = text.split("\n").map((l) => l.split("\t"));
  return rowsToProblems(lines, null);
};

// ========== JSON export ==========

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

// ========== JSON import (merge) ==========

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