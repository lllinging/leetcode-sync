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

export default function Roadmap() {
  const {
    problems, handleReview, toggleCompare, compareIds,
    editingId, setEditingId, updateProblem, deleteProblem,
  } = useProblems();

  const [activeCat, setActiveCat] = useState("");
  const [expanded, setExpanded] = useState({});

  // Build tree
  const tree = useMemo(() => buildRoadmapTree(problems, isDue), [problems]);
  const catKeys = useMemo(() => Object.keys(tree).sort(), [tree]);

  // Auto-select first category
  const currentCat = activeCat && tree[activeCat] ? activeCat : catKeys[0] || "";
  const catData = tree[currentCat] || {};
  const subKeys = useMemo(() => sortSubKeys(Object.keys(catData)), [catData]);
  const stats = useMemo(() => getCategoryStats(catData), [catData]);

  const toggle = (key) => setExpanded((p) => ({ ...p, [key]: !p[key] }));
  const expandAll = () => {
    const a = {};
    subKeys.forEach((k) => { a[k] = true; });
    setExpanded(a);
  };

  // Shared ProblemCard props builder
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

  return (
    <div>
      {/* Category tabs */}
      <div className="roadmap-groups">
        {catKeys.map((name, i) => {
          const c = COLORS[i % COLORS.length];
          const catStats = getCategoryStats(tree[name]);
          const isActive = name === currentCat;
          return (
            <button
              key={name}
              className={`roadmap-group-tab ${isActive ? "active" : ""}`}
              style={{
                borderColor: isActive ? c.bd : undefined,
                background: isActive ? c.bg : undefined,
                color: isActive ? c.tx : undefined,
              }}
              onClick={() => { setActiveCat(name); setExpanded({}); }}
            >
              {name}
              <span className="roadmap-count">{catStats.total}</span>
              {catStats.due > 0 && <span className="roadmap-due-badge">{catStats.due}</span>}
            </button>
          );
        })}
      </div>

      {/* Stats + controls */}
      <div className="roadmap-controls">
        <div className="roadmap-stats">
          <span>{stats.total} problems</span>
          <span className="roadmap-stats-dim">{stats.subCount} subcategories</span>
          {stats.due > 0 && <span className="roadmap-due">{stats.due} due</span>}
        </div>
        <div className="roadmap-actions">
          <button className="btn btn-muted btn-sm" onClick={expandAll}>Expand All</button>
          <button className="btn btn-muted btn-sm" onClick={() => setExpanded({})}>Collapse All</button>
        </div>
      </div>

      {/* Subcategory sections */}
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

          return (
            <div key={subKey} className="roadmap-section" style={{ borderColor: c.bd + "33" }}>
              {/* Section header */}
              <div className="roadmap-section-header" onClick={() => toggle(subKey)}>
                <div className="roadmap-section-left">
                  <div className="roadmap-section-icon" style={{ background: c.bg, color: c.tx }}>
                    {idx + 1}
                  </div>
                  <div>
                    <div className="roadmap-section-title">{subKey}</div>
                    <div className="roadmap-section-meta">
                      {pCount} {pCount === 1 ? "problem" : "problems"}
                      {sub.dueCount > 0 && (
                        <span className="roadmap-due-sm"> · {sub.dueCount} due</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="roadmap-section-right">
                  <div className="roadmap-progress">
                    <div
                      className="roadmap-progress-bar"
                      style={{
                        width: `${(pCount / Math.max(stats.total, 1)) * 100}%`,
                        background: c.bd,
                      }}
                    />
                  </div>
                  <span className="roadmap-section-count">{pCount}</span>
                  <span className={`roadmap-arrow ${isOpen ? "open" : ""}`}>▶</span>
                </div>
              </div>

              {/* Problem cards */}
              {isOpen && (
                <div className="roadmap-problems">
                  {sub.problems.map((p) => (
                    <ProblemCard {...cardProps(p)} />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}