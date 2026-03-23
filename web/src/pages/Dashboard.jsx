import { useProblems } from "../context/ProblemsContext";
import { DIFFICULTIES, DIFF_COLORS } from "../utils/constants";

export default function Dashboard({ onNavigate }) {
  const { problems, categories, dueCount, setFilters } = useProblems();

  const total = problems.length;
  const byDiff = { Easy: 0, Medium: 0, Hard: 0 };
  const byCat = {};
  problems.forEach((p) => {
    byDiff[p.difficulty] = (byDiff[p.difficulty] || 0) + 1;
    byCat[p.category] = (byCat[p.category] || 0) + 1;
  });
  const mastered = problems.filter((p) => p.reviewStage >= 4).length;
  const maxCat = Math.max(...Object.values(byCat), 1);

  return (
    <div>
      <div className="stats-row">
        {[
          { label: "Total", val: total, color: "#6c5ce7" },
          { label: "Due Today", val: dueCount, color: "#e17055" },
          { label: "Mastered", val: mastered, color: "#00b894", sub: `${total ? Math.round((mastered / total) * 100) : 0}%` },
          { label: "Categories", val: categories.length, color: "#fdcb6e" },
        ].map((s) => (
          <div key={s.label} className="card stat-card">
            <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
            <div className="stat-label">{s.label}</div>
            {s.sub && <div className="stat-sub">{s.sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="section-label">Difficulty distribution</div>
          <div className="diff-circles">
            {DIFFICULTIES.map((d) => (
              <div key={d} className="diff-item">
                <div className="diff-circle" style={{ borderColor: DIFF_COLORS[d], background: DIFF_COLORS[d] + "33" }}>
                  <span style={{ color: DIFF_COLORS[d] }}>{byDiff[d]}</span>
                </div>
                <span className="diff-label">{d}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="section-label">Category distribution</div>
          {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, cnt]) => (
            <div key={cat} className="cat-bar-row">
              <span className="cat-bar-label">{cat}</span>
              <div className="cat-bar-track">
                <div className="cat-bar-fill" style={{ width: `${(cnt / maxCat) * 100}%` }}><span>{cnt}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {dueCount > 0 && (
        <div className="card due-banner">
          <span className="due-banner-text">{dueCount} problems due for review</span>
          <button className="btn btn-danger" onClick={() => { setFilters((f) => ({ ...f, reviewDue: true })); onNavigate("list"); }}>Start Review</button>
        </div>
      )}
    </div>
  );
}
