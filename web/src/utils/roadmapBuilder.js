/**
 * roadmapBuilder.js
 *
 * Builds a roadmap tree by normalizing the category field.
 *
 * Problem: category field contains mixed formats:
 *   "滑动窗口"
 *   "滑动窗口--定长滑动窗口"
 *   "滑动窗口---定长滑动窗口"  (extra dashes)
 *   "3.1单序列双指针--双向双指针"
 *   "Sliding Window / Two Pointers"
 *
 * Solution: split on 2+ dashes, first part = main category, second = subcategory.
 * Strip leading number prefixes from main category for grouping.
 */

/**
 * Normalize a category string into { main, sub }.
 *
 * "滑动窗口--定长滑动窗口"      → { main: "滑动窗口", sub: "定长滑动窗口" }
 * "滑动窗口---定长滑动窗口"     → { main: "滑动窗口", sub: "定长滑动窗口" }
 * "3.1单序列双指针--双向双指针"  → { main: "单序列双指针", sub: "3.1 双向双指针" }
 * "滑动窗口"                    → { main: "滑动窗口", sub: "" }
 * "Sliding Window / Two Pointers" → { main: "Sliding Window / Two Pointers", sub: "" }
 */
function normalizeCategory(cat, subCat) {
  if (!cat) return { main: "Uncategorized", sub: subCat || "" };

  const raw = cat.trim();

  // Split on 2+ dashes
  const parts = raw.split(/-{2,}/).map(s => s.trim()).filter(Boolean);

  if (parts.length >= 2) {
    // Has main--sub structure
    let mainPart = parts[0];
    let subPart = parts.slice(1).join(" · ");  // join remaining parts

    // Extract number prefix from main: "3.1单序列双指针" → num="3.1", name="单序列双指针"
    const numMatch = mainPart.match(/^(\d+(?:\.\d+)*)\s*\.?\s*/);
    let numPrefix = "";
    if (numMatch) {
      numPrefix = numMatch[1];
      mainPart = mainPart.slice(numMatch[0].length).trim();
    }

    // Add number prefix to sub for ordering: "3.1 双向双指针"
    if (numPrefix) {
      subPart = numPrefix + " " + subPart;
    }

    return { main: mainPart || raw, sub: subPart };
  }

  // No dashes — single category
  // Strip leading number for cleaner grouping
  let mainPart = raw;
  const numMatch = mainPart.match(/^(\d+(?:\.\d+)*)\s*\.?\s*/);
  if (numMatch) {
    mainPart = mainPart.slice(numMatch[0].length).trim() || raw;
  }

  return { main: mainPart, sub: subCat || "" };
}

/**
 * Build a two-level roadmap tree.
 *
 * Returns: {
 *   [mainCategory]: {
 *     [subCategory]: { problems: Problem[], dueCount: number }
 *   }
 * }
 */
export function buildRoadmapTree(problems, isDueFn) {
  const tree = {};

  for (const p of problems) {
    const { main, sub } = normalizeCategory(p.category, p.subCategory);
    const subKey = sub || "General";

    if (!tree[main]) tree[main] = {};
    if (!tree[main][subKey]) tree[main][subKey] = { problems: [], dueCount: 0 };

    tree[main][subKey].problems.push(p);
    if (isDueFn && isDueFn(p.nextReview)) {
      tree[main][subKey].dueCount++;
    }
  }

  return tree;
}

/**
 * Get stats for a category.
 */
export function getCategoryStats(catData) {
  let total = 0, due = 0, subCount = 0;
  for (const sub of Object.values(catData)) {
    subCount++;
    total += sub.problems.length;
    due += sub.dueCount;
  }
  return { total, due, subCount };
}

/**
 * Sort keys by leading number, then alphabetically.
 */
export function sortSubKeys(keys) {
  return [...keys].sort((a, b) => {
    const na = parseFloat(a) || 999;
    const nb = parseFloat(b) || 999;
    if (na !== nb) return na - nb;
    return a.localeCompare(b);
  });
}