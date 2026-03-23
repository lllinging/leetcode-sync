import { useState } from "react";
import { useProblems } from "../context/ProblemsContext";
import { isDue, REVIEW_INTERVALS } from "../utils/review";
import { DIFFICULTIES, DIFF_COLORS, CATEGORIES } from "../utils/constants";
import EditField from "./EditField";

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

  return (
    <div className={`card problem-card ${due ? "due" : ""}`}>
      {/* Header */}
      <div className="problem-header">
        <div className="problem-info">
          <div className="problem-title-row">
            <span className="problem-title">{p.title}</span>
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
              <input className="input" value={(p.tags || []).join(", ")} onChange={(e) => upd({ tags: e.target.value.split(/[,，]/).map((t) => t.trim()).filter(Boolean) })} />
            </div>
          </div>
          <button className="btn btn-sm btn-danger" onClick={() => { if (confirm("Delete this problem?")) deleteProblem(p.id); }}>Delete</button>
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="problem-detail">
          {isEditing ? (
            <div>
              <EditField label="Approach" value={p.approach} onChange={(v) => upd({ approach: v })} area aiFlag={p.aiGenerated} />
              <div className="grid-2">
                <EditField label="Key Points" value={p.keyPoints} onChange={(v) => upd({ keyPoints: v })} area aiFlag={p.aiGenerated} />
                <EditField label="Pitfalls" value={p.pitfalls} onChange={(v) => upd({ pitfalls: v })} area aiFlag={p.aiGenerated} />
              </div>
              <EditField label="Highlights" value={p.highlights} onChange={(v) => upd({ highlights: v })} aiFlag={p.aiGenerated} />
              <EditField label="Interview Intro" value={p.interviewIntro} onChange={(v) => upd({ interviewIntro: v })} area aiFlag={p.aiGenerated} />
            </div>
          ) : (
            <div>
              <div className="grid-2">
                <div><div className="section-label">Approach</div><div className="field-text">{p.approach || "(empty)"}</div></div>
                <div><div className="section-label">Pitfalls</div><div className="field-text text-danger">{p.pitfalls || "(empty)"}</div></div>
              </div>
              {p.keyPoints && <div className="field-block"><div className="section-label">Key Points</div><div className="field-text">{p.keyPoints}</div></div>}
              {p.highlights && <div className="field-block"><div className="section-label">Highlights</div><div className="field-text text-warning">{p.highlights}</div></div>}
              {p.interviewIntro && <div className="field-block"><div className="section-label">Interview Intro</div><div className="field-text text-purple italic">{p.interviewIntro}</div></div>}
            </div>
          )}

          {/* Code section */}
          <div className="code-section">
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
                  {isEditing ? <textarea className="input textarea code-textarea" value={s.code} onChange={(e) => updSolution(i, { code: e.target.value })} /> : <pre className="code-block">{s.code || "No code yet"}</pre>}
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
                {isEditing ? <textarea className="input textarea code-textarea" value={p.solutions[solIdx]?.code || ""} onChange={(e) => updSolution(solIdx, { code: e.target.value })} /> : <pre className="code-block">{p.solutions[solIdx]?.code || "No code yet"}</pre>}
              </div>
            )}
          </div>

          {/* Review status */}
          <div className="review-status">
            <div className="review-info">
              Stage <span className="text-primary">{p.reviewStage}/{REVIEW_INTERVALS.length}</span>
              {" | "}Next: <span className={due ? "text-danger" : "text-success"}>{p.nextReview}</span>
              {" | "}Reviewed {p.reviewHistory.length}x
            </div>
            {due && (
              <div className="review-buttons">
                <span className="review-label">Rating:</span>
                {[
                  { q: 1, l: "Forgot", c: "#e17055" },
                  { q: 2, l: "Vague", c: "#e17055" },
                  { q: 3, l: "Okay", c: "#fdcb6e" },
                  { q: 4, l: "Good", c: "#00b894" },
                  { q: 5, l: "Easy", c: "#00b894" },
                ].map(({ q, l, c }) => (
                  <button key={q} className="review-btn" style={{ borderColor: c + "44", background: c + "11", color: c }} onClick={() => handleReview(p.id, q)}>{l}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
