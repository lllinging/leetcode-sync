import { useState } from "react";
import { useProblems } from "../context/ProblemsContext";
import { DIFF_COLORS } from "../utils/constants";

export default function ReviewMode() {
  const { dueProblems, handleReview } = useProblems();
  const [idx, setIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  if (!dueProblems.length) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: 50, marginBottom: 10 }}>🎉</div>
        <div className="text-success" style={{ fontSize: 17, fontWeight: 600 }}>All caught up! Nothing to review today.</div>
      </div>
    );
  }

  const p = dueProblems[Math.min(idx, dueProblems.length - 1)];
  if (!p) return null;

  const ratings = [
    { q: 1, l: "Forgot", c: "#e17055" },
    { q: 2, l: "Vague", c: "#e17055" },
    { q: 3, l: "Okay", c: "#fdcb6e" },
    { q: 4, l: "Good", c: "#00b894" },
    { q: 5, l: "Perfect", c: "#00b894" },
  ];

  return (
    <div className="review-container">
      <div className="review-progress">
        <span className="review-progress-text">{Math.min(idx + 1, dueProblems.length)} / {dueProblems.length}</span>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${(Math.min(idx + 1, dueProblems.length) / dueProblems.length) * 100}%` }} />
        </div>
      </div>

      <div className="card">
        <div className="review-title">{p.title}</div>
        <div className="tags-row">
          <span className="tag" style={{ background: DIFF_COLORS[p.difficulty] + "22", color: DIFF_COLORS[p.difficulty] }}>{p.difficulty}</span>
          {(p.tags || []).map((t) => <span key={t} className="tag tag-default">{t}</span>)}
        </div>

        {!showAnswer ? (
          <div className="review-prompt">
            <div className="review-prompt-text">Try to recall the approach and code...</div>
            <button className="btn btn-primary" onClick={() => setShowAnswer(true)}>Show Answer</button>
          </div>
        ) : (
          <div className="review-answer">
            <div className="field-block"><div className="section-label">Approach</div><div className="field-text">{p.approach}</div></div>
            <div className="field-block"><div className="section-label">Key Points</div><div className="field-text">{p.keyPoints}</div></div>
            {p.pitfalls && <div className="field-block"><div className="section-label">Pitfalls</div><div className="field-text text-danger">{p.pitfalls}</div></div>}
            {p.solutions.map((s, i) => (
              <div key={i} className="field-block"><div className="code-label">{s.label}</div><pre className="code-block">{s.code}</pre></div>
            ))}
            <div className="review-rating">
              <div className="review-rating-title">How well did you remember?</div>
              <div className="review-rating-buttons">
                {ratings.map(({ q, l, c }) => (
                  <button key={q} className="review-rating-btn" style={{ borderColor: c + "44", background: c + "11", color: c }}
                    onClick={() => { handleReview(p.id, q); setShowAnswer(false); setIdx((i) => i + 1); }}>{l}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="review-nav">
        <button className="btn btn-muted" onClick={() => { setIdx(Math.max(0, idx - 1)); setShowAnswer(false); }} disabled={idx === 0}>Previous</button>
        <button className="btn btn-muted" onClick={() => { setIdx(Math.min(dueProblems.length - 1, idx + 1)); setShowAnswer(false); }} disabled={idx >= dueProblems.length - 1}>Next</button>
      </div>
    </div>
  );
}
