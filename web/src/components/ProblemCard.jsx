import { useState } from "react";
import { useProblems } from "../context/ProblemsContext";
import { isDue, REVIEW_INTERVALS } from "../utils/review";
import { DIFFICULTIES, DIFF_COLORS, CATEGORIES } from "../utils/constants";
import EditField from "./EditField";
import InterviewGuide from "./InterviewGuide";

export default function ProblemCard({ problem: p }) {
  const {
    updateProblem, deleteProblem, handleReview,
    toggleCompare, compareIds, editingId, setEditingId,
  } = useProblems();

  const [expanded, setExpanded] = useState(false);
  const [solIdx, setSolIdx] = useState(0);
  const [sideBySide, setSideBySide] = useState(false);

  const due = isDue(p.nextReview);
  const isEditing = editingId === p.id;
  const upd = (changes) => updateProblem(p.id, changes);

  const updSolution = (idx, changes) => {
    const newSols = [...p.solutions];
    newSols[idx] = { ...newSols[idx], ...changes };
    upd({ solutions: newSols });
  };

  const addSolution = () => {
    upd({ solutions: [...p.solutions, { label: `Solution ${p.solutions.length + 1}`, code: "", lang: "python" }] });
  };

  const removeSolution = (idx) => {
    if (p.solutions.length <= 1) return;
    const newSols = p.solutions.filter((_, i) => i !== idx);
    upd({ solutions: newSols });
    if (solIdx >= newSols.length) setSolIdx(newSols.length - 1);
  };

  const leetcodeUrl = p.url || (p.titleSlug ? `https://leetcode.com/problems/${p.titleSlug}/` : null);

  // Shared inline styles for expanded sections
  const sectionGap = { marginTop: 16 };
  const divider = { borderTop: "1px solid #1e1e2e", marginTop: 18, paddingTop: 18 };

  return (
    <div className={`card problem-card ${due ? "due" : ""}`}>
      {/* Header */}
      <div className="problem-header">
        <div className="problem-info">
          <div className="problem-title-row">
            {leetcodeUrl ? (
              <a
                href={leetcodeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="problem-title"
                style={{ color: "#e0e0e0", textDecoration: "none", borderBottom: "1px dashed #6c5ce7" }}
                onMouseEnter={(e) => (e.target.style.color = "#a29bfe")}
                onMouseLeave={(e) => (e.target.style.color = "#e0e0e0")}
              >
                {p.title}
              </a>
            ) : (
              <span className="problem-title">{p.title}</span>
            )}
            <span className="tag" style={{ background: DIFF_COLORS[p.difficulty] + "22", color: DIFF_COLORS[p.difficulty] }}>{p.difficulty}</span>
            {due && <span className="tag tag-due">Due</span>}
            {p.aiGenerated && <span className="ai-tag">AI Synced</span>}
          </div>
          <div className="problem-meta">
            {p.category} {p.subCategory && `> ${p.subCategory}`} {p.complexity && `| ${p.complexity}`}
          </div>
          <div className="tags-row">{(p.tags || []).map((t) => <span key={t} className="tag tag-default">{t}</span>)}</div>
        </div>
        <div className="problem-actions">
          <button className={`btn btn-sm ${compareIds.includes(p.id) ? "btn-warning" : "btn-muted"}`} onClick={() => toggleCompare(p.id)}>
            {compareIds.includes(p.id) ? "Comparing" : "+ Compare"}
          </button>
          <button className={`btn btn-sm ${isEditing ? "btn-success" : "btn-muted"}`} onClick={() => setEditingId(isEditing ? null : p.id)}>
            {isEditing ? "Done" : "Edit"}
          </button>
          <button className="btn btn-sm btn-muted" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      {/* Edit basic info */}
      {isEditing && (
        <div className="edit-basic-info">
          <div className="edit-basic-title">Edit basic info</div>
          <div className="edit-grid-3">
            <div>
              <label className="field-label">Category</label>
              <select className="select full" value={p.category} onChange={(e) => upd({ category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                {!CATEGORIES.includes(p.category) && <option>{p.category}</option>}
              </select>
            </div>
            <div>
              <label className="field-label">Subcategory</label>
              <input className="input" value={p.subCategory} onChange={(e) => upd({ subCategory: e.target.value })} placeholder="e.g. 1.1 Sliding Window" />
            </div>
            <div>
              <label className="field-label">Difficulty</label>
              <select className="select full" value={p.difficulty} onChange={(e) => upd({ difficulty: e.target.value })}>
                {DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="edit-grid-2">
            <div>
              <label className="field-label">Complexity</label>
              <input className="input" value={p.complexity} onChange={(e) => upd({ complexity: e.target.value })} placeholder="O(n) / O(1)" />
            </div>
            <div>
              <label className="field-label">Tags (comma separated)</label>
              <input className="input" value={(p.tags || []).join(", ")} onChange={(e) => upd({ tags: e.target.value.split(/[,]/).map((t) => t.trim()).filter(Boolean) })} />
            </div>
          </div>
          <button className="btn btn-sm btn-danger" onClick={() => { if (confirm("Delete this problem?")) deleteProblem(p.id); }}>Delete</button>
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="problem-detail" style={{ paddingTop: 6 }}>

          {/* --- Notes section --- */}
          {isEditing ? (
            <div>
              <EditField label="Approach" value={p.approach} onChange={(v) => upd({ approach: v })} area aiFlag={p.aiGenerated} />
              <EditField label="Key Points" value={p.keyPoints} onChange={(v) => upd({ keyPoints: v })} area aiFlag={p.aiGenerated} />
              <EditField label="Pitfalls" value={p.pitfalls} onChange={(v) => upd({ pitfalls: v })} area aiFlag={p.aiGenerated} />
            </div>
          ) : (
            <div>
              <div style={sectionGap}>
                <div className="section-label">Approach</div>
                <div className="field-text">{p.approach || "(empty)"}</div>
              </div>
              {p.keyPoints && (
                <div style={sectionGap}>
                  <div className="section-label">Key Points</div>
                  <div className="field-text">{p.keyPoints}</div>
                </div>
              )}
              {p.pitfalls && (
                <div style={sectionGap}>
                  <div className="section-label">Pitfalls</div>
                  <div className="field-text text-danger">{p.pitfalls}</div>
                </div>
              )}
            </div>
          )}

          {/* --- Code section --- */}
          <div style={divider}>
            <div className="code-tabs">
              <div className="code-tab-list">
                {p.solutions.map((s, i) => (
                  <button key={i} className={`btn btn-sm ${solIdx === i && !sideBySide ? "btn-primary" : "btn-muted"}`} onClick={() => { setSolIdx(i); setSideBySide(false); }}>{s.label}</button>
                ))}
                {isEditing && <button className="btn btn-sm btn-muted" onClick={addSolution}>+ Add</button>}
              </div>
              {p.solutions.length > 1 && (
                <button className={`btn btn-sm ${sideBySide ? "btn-success" : "btn-muted"}`} onClick={() => setSideBySide(!sideBySide)}>Side by Side</button>
              )}
            </div>
            {sideBySide ? (
              <div className="grid-2">{p.solutions.map((s, i) => (
                <div key={i}>
                  <div className="code-label">{s.label}</div>
                  {isEditing ? (
                    <textarea className="input textarea code-textarea" value={s.code} onChange={(e) => updSolution(i, { code: e.target.value })} />
                  ) : (
                    <pre className="code-block" style={{ maxHeight: "none", overflow: "visible" }}>{s.code || "No code yet"}</pre>
                  )}
                </div>
              ))}</div>
            ) : (
              <div>
                {isEditing && (
                  <div className="code-edit-meta">
                    <input className="input" style={{ maxWidth: 150 }} value={p.solutions[solIdx]?.label || ""} onChange={(e) => updSolution(solIdx, { label: e.target.value })} placeholder="Label" />
                    <input className="input" style={{ maxWidth: 100 }} value={p.solutions[solIdx]?.lang || ""} onChange={(e) => updSolution(solIdx, { lang: e.target.value })} placeholder="Language" />
                    {p.solutions.length > 1 && <button className="btn btn-sm btn-danger" onClick={() => removeSolution(solIdx)}>Remove</button>}
                  </div>
                )}
                {isEditing ? (
                  <textarea className="input textarea code-textarea" value={p.solutions[solIdx]?.code || ""} onChange={(e) => updSolution(solIdx, { code: e.target.value })} />
                ) : (
                  <pre className="code-block" style={{ maxHeight: "none", overflow: "visible" }}>{p.solutions[solIdx]?.code || "No code yet"}</pre>
                )}
              </div>
            )}
          </div>

          {/* --- Interview guide --- */}
          <div style={divider}>
            <InterviewGuide problem={p} isEditing={isEditing} onUpdate={upd} />
          </div>

          {/* --- Review status --- */}
          <div style={divider}>
            <div className="review-status">
              <div className="review-info">
                Stage <span className="text-primary">{p.reviewStage}/{REVIEW_INTERVALS.length}</span>
                {" | "}Next: <span className={due ? "text-danger" : "text-success"}>{p.nextReview}</span>
                {" | "}Reviews: {p.reviewHistory?.length || 0}
              </div>
              {due && (
                <div className="review-buttons">
                  <span className="review-prompt">How well did you recall?</span>
                  {[1, 2, 3, 4, 5].map((q) => (
                    <button key={q} className={`btn btn-sm ${q >= 3 ? "btn-success" : "btn-danger"}`} onClick={() => handleReview(p.id, q)}>{q}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}