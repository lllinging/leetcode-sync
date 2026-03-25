import { useState, useMemo } from "react";
import { useProblems } from "../context/ProblemsContext";
import { buildRoadmapTree, getCategoryStats, sortSubKeys } from "../utils/roadmapBuilder";
import { isDue } from "../utils/review";
import ProblemCard from "../components/ProblemCard";

const COLORS = [
  { bg: "#6c5ce722", bd: "#6c5ce7", tx: "#6c5ce7" },
  { bg: "#00b89422", bd: "#00b894", tx: "#00b894" },
  { bg: "#e1705522", bd: "#e17055", tx: "#e17055" },
  { bg: "#0984e322", bd: "#0984e3", tx: "#0984e3" },
  { bg: "#fdcb6e33", bd: "#d4a017", tx: "#d4a017" },
  { bg: "#a29bfe22", bd: "#a29bfe", tx: "#a29bfe" },
  { bg: "#fd79a822", bd: "#fd79a8", tx: "#fd79a8" },
  { bg: "#55efc422", bd: "#2ecc71", tx: "#2ecc71" },
];

const REVIEW_INTERVALS_LEN = 7;

// Redo tag definitions with colors
const REDO_TAGS = [
  { key: "重做", label: "重做", color: "#e17055" },
  { key: "没思路", label: "没思路", color: "#d63031" },
  { key: "易出错", label: "易出错", color: "#fdcb6e" },
  { key: "经典", label: "经典", color: "#6c5ce7" },
  { key: "仅查看", label: "仅查看", color: "#636e72" },  // also matches "可以仅查看"
  { key: "过", label: "过", color: "#00b894" },
  { key: "难", label: "难", color: "#d63031" },
];

// Check if a problem matches a redo filter
function matchesRedo(problem, redoFilter) {
  if (!redoFilter) return true;
  const redo = (problem.redo || "").trim();
  if (!redo) return false;
  return redo.includes(redoFilter);
}

// Get redo counts for a set of problems
function getRedoCounts(problems) {
  const counts = {};
  for (const tag of REDO_TAGS) counts[tag.key] = 0;
  for (const p of problems) {
    const redo = (p.redo || "").trim();
    if (!redo) continue;
    for (const tag of REDO_TAGS) {
      if (redo.includes(tag.key)) counts[tag.key]++;
    }
  }
  return counts;
}

// Circle progress SVG
function CircleProgress({ done, total, color, size = 44 }) {
  const r = (size - 5) / 2;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? done / total : 0;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a1a2e" strokeWidth={4} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
        style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 0.5s" }} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={size * 0.26} fontWeight={700}>{done}</text>
    </svg>
  );
}

// Difficulty mini bar
function DifficultyBar({ problems }) {
  const counts = { Easy: 0, Medium: 0, Hard: 0 };
  problems.forEach(p => { if (counts[p.difficulty] !== undefined) counts[p.difficulty]++; });
  const total = problems.length || 1;
  return (
    <div className="rm-diff-bar">
      {counts.Easy > 0 && <div className="rm-diff-seg rm-diff-easy" style={{ width: (counts.Easy / total * 100) + "%" }} title={`Easy: ${counts.Easy}`} />}
      {counts.Medium > 0 && <div className="rm-diff-seg rm-diff-med" style={{ width: (counts.Medium / total * 100) + "%" }} title={`Medium: ${counts.Medium}`} />}
      {counts.Hard > 0 && <div className="rm-diff-seg rm-diff-hard" style={{ width: (counts.Hard / total * 100) + "%" }} title={`Hard: ${counts.Hard}`} />}
    </div>
  );
}

export default function Roadmap() {
  const {
    problems, handleReview, toggleCompare, compareIds,
    editingId, setEditingId, updateProblem, deleteProblem,
  } = useProblems();

  const [activeCat, setActiveCat] = useState("");
  const [expanded, setExpanded] = useState({});
  const [redoFilter, setRedoFilter] = useState({}); // { [subKey]: "重做" | "经典" | ... | null }

  const tree = useMemo(() => buildRoadmapTree(problems, isDue), [problems]);
  const catKeys = useMemo(() => Object.keys(tree).sort(), [tree]);
  const currentCat = activeCat && tree[activeCat] ? activeCat : catKeys[0] || "";
  const catData = tree[currentCat] || {};
  const subKeys = useMemo(() => sortSubKeys(Object.keys(catData)), [catData]);
  const stats = useMemo(() => getCategoryStats(catData), [catData]);

  // Global stats
  const globalStats = useMemo(() => {
    const mastered = problems.filter(p => p.reviewStage >= REVIEW_INTERVALS_LEN - 1).length;
    const due = problems.filter(p => isDue(p.nextReview)).length;
    return { total: problems.length, mastered, due, cats: catKeys.length };
  }, [problems, catKeys]);

  const toggle = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }));
  const expandAll = () => {
    const a = {};
    subKeys.forEach(k => { a[k] = true; });
    setExpanded(a);
  };

  const catProblems = useMemo(() => subKeys.flatMap(k => catData[k]?.problems || []), [catData, subKeys]);
  const catMastered = catProblems.filter(p => p.reviewStage >= REVIEW_INTERVALS_LEN - 1).length;

  const toggleRedoFilter = (subKey, tag) => {
    setRedoFilter(prev => ({
      ...prev,
      [subKey]: prev[subKey] === tag ? null : tag,
    }));
  };

  const cardProps = (p) => ({
    key: p.id,
    problem: p,
    onReview: handleReview,
    onToggleCompare: toggleCompare,
    isComparing: compareIds.includes(p.id),
    isEditing: editingId === p.id,
    onEdit: () => setEditingId(p.id),
    onCancelEdit: () => setEditingId(null),
    onSaveEdit: (changes) => { updateProblem(p.id, changes); setEditingId(null); },
    onDelete: () => deleteProblem(p.id),
  });

  const catColorIdx = catKeys.indexOf(currentCat);
  const catColor = COLORS[(catColorIdx >= 0 ? catColorIdx : 0) % COLORS.length];

  return (
    <div>
      {/* ===== Global Stats ===== */}
      <div className="rm-stats-row">
        <div className="rm-stat-card">
          <div className="rm-stat-value" style={{ color: "#6c5ce7" }}>{globalStats.total}</div>
          <div className="rm-stat-label">Total</div>
        </div>
        <div className="rm-stat-card">
          <div className="rm-stat-value" style={{ color: "#00b894" }}>{globalStats.mastered}</div>
          <div className="rm-stat-label">Mastered</div>
        </div>
        <div className="rm-stat-card">
          <div className="rm-stat-value" style={{ color: "#e17055" }}>{globalStats.due}</div>
          <div className="rm-stat-label">Due Today</div>
        </div>
        <div className="rm-stat-card">
          <div className="rm-stat-value" style={{ color: "#0984e3" }}>{globalStats.cats}</div>
          <div className="rm-stat-label">Categories</div>
        </div>
      </div>

      {/* ===== Category Tabs ===== */}
      <div className="rm-cat-tabs">
        {catKeys.map((name, i) => {
          const c = COLORS[i % COLORS.length];
          const catSt = getCategoryStats(tree[name]);
          const isActive = name === currentCat;
          return (
            <button key={name}
              className={`rm-cat-tab ${isActive ? "active" : ""}`}
              style={isActive ? { borderColor: c.bd, background: c.bg, color: c.tx } : {}}
              onClick={() => { setActiveCat(name); setExpanded({}); setRedoFilter({}); }}
            >
              <span className="rm-cat-name">{name}</span>
              <span className="rm-cat-count">{catSt.total}</span>
              {catSt.due > 0 && <span className="rm-cat-due">{catSt.due}</span>}
            </button>
          );
        })}
      </div>

      {/* ===== Category Overview ===== */}
      <div className="rm-cat-overview" style={{ borderColor: catColor.bd + "44" }}>
        <div className="rm-cat-overview-left">
          <CircleProgress done={catMastered} total={stats.total} color={catColor.bd} size={52} />
          <div>
            <div className="rm-cat-overview-title" style={{ color: catColor.tx }}>{currentCat}</div>
            <div className="rm-cat-overview-meta">
              {stats.total} problems · {stats.subCount} subcategories · {catMastered} mastered
              {stats.due > 0 && <span className="rm-due-text"> · {stats.due} due</span>}
            </div>
            <DifficultyBar problems={catProblems} />
          </div>
        </div>
        <div className="rm-cat-overview-actions">
          <button className="btn btn-muted btn-sm" onClick={expandAll}>Expand All</button>
          <button className="btn btn-muted btn-sm" onClick={() => setExpanded({})}>Collapse All</button>
        </div>
      </div>

      {/* ===== Subcategory Sections ===== */}
      {subKeys.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "#555" }}>
          No problems in this category yet.
        </div>
      ) : (
        subKeys.map((subKey, idx) => {
          const sub = catData[subKey];
          const c = COLORS[idx % COLORS.length];
          const isOpen = expanded[subKey];
          const pCount = sub.problems.length;
          const subMastered = sub.problems.filter(p => p.reviewStage >= REVIEW_INTERVALS_LEN - 1).length;
          const subDue = sub.dueCount;
          const activeRedo = redoFilter[subKey] || null;
          const redoCounts = getRedoCounts(sub.problems);
          const filteredProblems = activeRedo
            ? sub.problems.filter(p => matchesRedo(p, activeRedo))
            : sub.problems;

          return (
            <div key={subKey} className={`rm-section ${isOpen ? "open" : ""}`} style={{ borderColor: c.bd + "33" }}>
              {/* Section header */}
              <div className="rm-section-header" onClick={() => toggle(subKey)}>
                <div className="rm-section-left">
                  <CircleProgress done={subMastered} total={pCount} color={c.bd} size={38} />
                  <div>
                    <div className="rm-section-title">{subKey}</div>
                    <div className="rm-section-meta">
                      {pCount} {pCount === 1 ? "problem" : "problems"}
                      {subMastered > 0 && <span className="rm-mastered-text"> · {subMastered} mastered</span>}
                      {subDue > 0 && <span className="rm-due-text"> · {subDue} due</span>}
                    </div>
                  </div>
                </div>
                <div className="rm-section-right">
                  <DifficultyBar problems={sub.problems} />
                  <span className={`rm-arrow ${isOpen ? "open" : ""}`}>▶</span>
                </div>
              </div>

              {/* Redo filter tags — shown when expanded */}
              {isOpen && (
                <>
                  <div className="rm-redo-bar">
                    <button
                      className={`rm-redo-tag ${!activeRedo ? "active" : ""}`}
                      style={!activeRedo ? { borderColor: "#888", color: "#ddd" } : {}}
                      onClick={(e) => { e.stopPropagation(); setRedoFilter(prev => ({ ...prev, [subKey]: null })); }}
                    >
                      All {pCount}
                    </button>
                    {REDO_TAGS.map(tag => {
                      const count = redoCounts[tag.key];
                      if (count === 0) return null;
                      const isActive = activeRedo === tag.key;
                      return (
                        <button key={tag.key}
                          className={`rm-redo-tag ${isActive ? "active" : ""}`}
                          style={isActive ? { borderColor: tag.color, color: tag.color, background: tag.color + "18" } : {}}
                          onClick={(e) => { e.stopPropagation(); toggleRedoFilter(subKey, tag.key); }}
                        >
                          {tag.label} {count}
                        </button>
                      );
                    })}
                  </div>

                  {/* Problem cards */}
                  <div className="rm-problems">
                    {filteredProblems.length === 0 ? (
                      <div style={{ padding: 12, color: "#555", fontSize: 12, textAlign: "center" }}>
                        No problems match this filter.
                      </div>
                    ) : (
                      filteredProblems.map(p => <ProblemCard {...cardProps(p)} />)
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}