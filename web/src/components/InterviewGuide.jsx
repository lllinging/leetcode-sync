import { useState } from "react";
import EditField from "./EditField";

/**
 * Interview walkthrough guide component — replaces the old single-line Interview Intro field.
 * Sections: clarifying questions -> brute force -> optimal approach -> code walkthrough
 */
export default function InterviewGuide({ problem: p, isEditing, onUpdate }) {
  const [open, setOpen] = useState(false);

  const hasContent =
    p.interviewClarify || p.interviewBrute || p.interviewOptimal || p.interviewWalkthrough;

  // Backward compat: old data may only have interviewIntro
  const hasLegacy = p.interviewIntro && !hasContent;

  if (!hasContent && !hasLegacy && !isEditing) return null;

  const sectionStyle = {
    background: "#13131f",
    borderRadius: 8,
    padding: "12px 14px",
    marginBottom: 8,
    borderLeft: "3px solid",
  };

  const labelStyle = {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: 6,
  };

  const textStyle = {
    fontSize: 13,
    color: "#ccc",
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
  };

  if (isEditing) {
    return (
      <div style={{ marginTop: 14 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#a29bfe",
            marginBottom: 10,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          🎤 Interview Walkthrough Guide
        </div>
        <EditField
          label="Step 1 — Clarifying Questions"
          value={p.interviewClarify || ""}
          onChange={(v) => onUpdate({ interviewClarify: v })}
          area
          aiFlag={p.aiGenerated}
          placeholder="Questions to ask before coding, e.g. 'Can array have duplicates?'"
        />
        <EditField
          label="Step 2 — Brute Force"
          value={p.interviewBrute || ""}
          onChange={(v) => onUpdate({ interviewBrute: v })}
          area
          aiFlag={p.aiGenerated}
          placeholder="Describe brute force approach and its complexity"
        />
        <EditField
          label="Step 3 — Optimal Approach"
          value={p.interviewOptimal || ""}
          onChange={(v) => onUpdate({ interviewOptimal: v })}
          area
          aiFlag={p.aiGenerated}
          placeholder="Explain optimal approach as if talking to interviewer"
        />
        <EditField
          label="Step 4 — Code Walkthrough"
          value={p.interviewWalkthrough || ""}
          onChange={(v) => onUpdate({ interviewWalkthrough: v })}
          area
          aiFlag={p.aiGenerated}
          placeholder="How to explain your code line by line while writing it"
        />
        {hasLegacy && (
          <EditField
            label="Legacy Interview Intro"
            value={p.interviewIntro || ""}
            onChange={(v) => onUpdate({ interviewIntro: v })}
            aiFlag={p.aiGenerated}
          />
        )}
      </div>
    );
  }

  // 旧数据兼容
  if (hasLegacy) {
    return (
      <div style={{ marginTop: 10 }}>
        <div className="section-label">🎤 Interview Intro</div>
        <div className="field-text text-purple italic">{p.interviewIntro}</div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#a29bfe",
          marginBottom: 8,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          userSelect: "none",
        }}
        onClick={() => setOpen(!open)}
      >
        🎤 Interview Walkthrough Guide
        <span style={{ fontSize: 11, color: "#666" }}>{open ? "▼" : "▶"}</span>
      </div>

      {open && (
        <div>
          {p.interviewClarify && (
            <div style={{ ...sectionStyle, borderColor: "#74b9ff" }}>
              <div style={{ ...labelStyle, color: "#74b9ff" }}>
                Step 1 — Ask Interviewer
              </div>
              <div style={textStyle}>{p.interviewClarify}</div>
            </div>
          )}

          {p.interviewBrute && (
            <div style={{ ...sectionStyle, borderColor: "#fdcb6e" }}>
              <div style={{ ...labelStyle, color: "#fdcb6e" }}>
                Step 2 — Brute Force
              </div>
              <div style={textStyle}>{p.interviewBrute}</div>
            </div>
          )}

          {p.interviewOptimal && (
            <div style={{ ...sectionStyle, borderColor: "#00b894" }}>
              <div style={{ ...labelStyle, color: "#00b894" }}>
                Step 3 — Optimal Approach
              </div>
              <div style={textStyle}>{p.interviewOptimal}</div>
            </div>
          )}

          {p.interviewWalkthrough && (
            <div style={{ ...sectionStyle, borderColor: "#a29bfe" }}>
              <div style={{ ...labelStyle, color: "#a29bfe" }}>
                Step 4 — Code Walkthrough
              </div>
              <div style={textStyle}>{p.interviewWalkthrough}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}