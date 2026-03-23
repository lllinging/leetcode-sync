import { useState, useEffect, useRef } from "react";

/**
 * Click-to-edit field component.
 * View mode: shows text content, click to enter edit mode.
 * Edit mode: shows input/textarea with save & cancel buttons.
 * aiFlag: marks the field as AI-generated so the user knows to review it.
 */
export default function EditField({
  label,
  value,
  onChange,
  area = false,
  aiFlag = false,
  placeholder = "",
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing && ref.current) ref.current.focus();
  }, [editing]);

  const save = () => {
    onChange(draft);
    setEditing(false);
  };

  if (editing) {
    const Tag = area ? "textarea" : "input";
    return (
      <div className="edit-field">
        <div className="edit-field-header">
          <span className="section-label">{label}</span>
          <div className="edit-field-actions">
            <button className="btn btn-sm btn-success" onClick={save}>Save</button>
            <button className="btn btn-sm btn-muted" onClick={() => { setDraft(value); setEditing(false); }}>Cancel</button>
          </div>
        </div>
        <Tag
          ref={ref}
          className={`input ${area ? "textarea" : ""}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (!area && e.key === "Enter") save(); }}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <div className="edit-field edit-field-view" onClick={() => setEditing(true)}>
      <div className="edit-field-header">
        <span className="section-label">{label}</span>
        {aiFlag && <span className="ai-tag">AI Generated</span>}
        <span className="click-hint">Click to edit</span>
      </div>
      <div className={`edit-field-content ${!value ? "empty" : ""}`}>
        {value || placeholder || "(empty)"}
      </div>
    </div>
  );
}
