import { useProblems } from "../context/ProblemsContext";
import { DIFF_COLORS } from "../utils/constants";

export default function CompareView({ onNavigate }) {
  const { problems, compareIds, toggleCompare } = useProblems();
  const compared = problems.filter((p) => compareIds.includes(p.id));

  if (!compared.length) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: 40, marginBottom: 10 }}>🔀</div>
        <div>Select problems to compare from the list (up to 4)</div>
        <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => onNavigate("list")}>Go to List</button>
      </div>
    );
  }

  return (
    <div>
      <div className="compare-tags">
        {compared.map((p) => (
          <span key={p.id} className="tag tag-default" style={{ fontSize: 13, padding: "4px 10px" }}>
            {p.title} <span className="tag-remove" onClick={() => toggleCompare(p.id)}>✕</span>
          </span>
        ))}
      </div>
      <div className="compare-grid" style={{ gridTemplateColumns: `repeat(${Math.min(compared.length, 2)}, 1fr)` }}>
        {compared.map((p) => (
          <div key={p.id} className="card">
            <div className="problem-title" style={{ marginBottom: 4 }}>{p.title}</div>
            <span className="tag" style={{ background: DIFF_COLORS[p.difficulty] + "22", color: DIFF_COLORS[p.difficulty] }}>{p.difficulty}</span>
            <div style={{ marginTop: 12 }}>
              <div className="section-label">Approach</div>
              <div className="field-text" style={{ marginBottom: 10 }}>{p.approach}</div>
              <div className="section-label">Key Points</div>
              <div className="field-text" style={{ marginBottom: 10 }}>{p.keyPoints}</div>
              {p.solutions.map((s, i) => (
                <div key={i}><div className="code-label">{s.label}</div><pre className="code-block" style={{ fontSize: 12 }}>{s.code}</pre></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
