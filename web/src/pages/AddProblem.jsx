import { useState, useRef } from "react";
import { useProblems } from "../context/ProblemsContext";
import { DIFFICULTIES } from "../utils/constants";
import { today } from "../utils/review";
import { parseTSV, parseExcel, exportJSON, mergeJSON } from "../utils/importExport";

export default function AddProblem({ onNavigate }) {
  const { problems, addProblem, bulkAdd, replaceAll } = useProblems();

  const [form, setForm] = useState({
    title: "", category: "Uncategorized", subCategory: "", difficulty: "Medium",
    complexity: "", tags: "", keyPoints: "", approach: "", pitfalls: "",
    code1: "", code1Label: "Solution 1",
    code2: "", code2Label: "Solution 2",
  });

  const fileRef = useRef(null);
  const jsonRef = useRef(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = () => {
    if (!form.title) { alert("Please enter a title"); return; }
    addProblem({
      title: form.title, category: form.category, subCategory: form.subCategory,
      difficulty: form.difficulty, complexity: form.complexity,
      tags: form.tags.split(/[,]/).map((t) => t.trim()).filter(Boolean),
      keyPoints: form.keyPoints, approach: form.approach, pitfalls: form.pitfalls,
      solutions: [
        form.code1 && { label: form.code1Label, code: form.code1, lang: "python" },
        form.code2 && { label: form.code2Label, code: form.code2, lang: "python" },
      ].filter(Boolean),
      aiGenerated: false,
    });
    alert("Problem added!");
    onNavigate("list");
  };

  // Handle both .xlsx and .tsv/.csv/.txt files
  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();

    if (ext === "xlsx" || ext === "xls") {
      // Excel binary format — read as ArrayBuffer, parse with SheetJS
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = parseExcel(ev.target.result, true);
          if (parsed.length) {
            bulkAdd(parsed);
            alert(`Imported ${parsed.length} problems from ${file.name}`);
          } else {
            alert("No valid data found in Excel file");
          }
        } catch (err) {
          console.error("Excel import error:", err);
          alert("Failed to parse Excel file: " + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // TSV / CSV / TXT — read as text
      const reader = new FileReader();
      reader.onload = (ev) => {
        const parsed = parseTSV(ev.target.result);
        if (parsed.length) {
          bulkAdd(parsed);
          alert(`Imported ${parsed.length} problems!`);
        } else {
          alert("No valid data found");
        }
      };
      reader.readAsText(file);
    }

    e.target.value = "";
  };

  const handleJSONImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const { merged, addedCount, skipped } = mergeJSON(ev.target.result, problems);
        replaceAll(merged);
        alert(`Imported ${addedCount} new problems (${skipped} duplicates skipped)`);
      } catch { alert("Invalid JSON format"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const Field = ({ label, k, area, ph }) => (
    <div className="form-field">
      <label className="field-label">{label}</label>
      {area
        ? <textarea className="input textarea" value={form[k]} onChange={set(k)} placeholder={ph} />
        : <input className="input" value={form[k]} onChange={set(k)} placeholder={ph} />}
    </div>
  );

  return (
    <div className="add-container">
      <div className="card">
        <div className="card-title">Add New Problem</div>
        <div className="grid-2">
          <Field label="Title *" k="title" ph="e.g. 3. Longest Substring Without Repeating Characters" />
          <Field label="Category" k="category" ph="e.g. Sliding Window" />
        </div>
        <div className="form-row-3">
          <Field label="Subcategory" k="subCategory" ph="e.g. 1.1 Sliding Window" />
          <div className="form-field">
            <label className="field-label">Difficulty</label>
            <select className="select full" value={form.difficulty} onChange={set("difficulty")}>
              {DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <Field label="Complexity" k="complexity" ph="O(n) / O(1)" />
        </div>
        <Field label="Tags (comma separated)" k="tags" ph="Hash Table, Sliding Window" />
        <Field label="Approach" k="approach" area ph="Describe the approach..." />
        <Field label="Key Points" k="keyPoints" area ph="Core takeaways..." />
        <Field label="Pitfalls" k="pitfalls" area ph="Common mistakes..." />
        <div className="grid-2">
          <div>
            <Field label="Solution 1 Label" k="code1Label" />
            <Field label="Solution 1 Code" k="code1" area ph="Paste code here..." />
          </div>
          <div>
            <Field label="Solution 2 Label" k="code2Label" />
            <Field label="Solution 2 Code" k="code2" area ph="Paste code here..." />
          </div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={handleSubmit}>Add Problem</button>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">Import / Export</div>
        <div className="import-actions">
          <button className="btn btn-muted" onClick={() => fileRef.current?.click()}>
            Import Excel / TSV
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.tsv,.csv,.txt" hidden onChange={handleFileImport} />

          <button className="btn btn-muted" onClick={() => jsonRef.current?.click()}>
            Import JSON Backup
          </button>
          <input ref={jsonRef} type="file" accept=".json" hidden onChange={handleJSONImport} />

          <button className="btn btn-muted" onClick={() => exportJSON(problems)}>
            Export JSON
          </button>
        </div>
        <div className="import-hint" style={{ marginTop: 10 }}>
          Excel (.xlsx): Each sheet becomes a category. Headers should include columns like Title, Difficulty, Approach, etc.
          TSV: Tab-separated text exported from Excel. JSON: Full backup including review history.
        </div>
      </div>

      <div className="card card-highlight" style={{ marginTop: 14 }}>
        <div className="card-title">Chrome Extension Sync</div>
        <div className="import-hint" style={{ lineHeight: 1.7 }}>
          After installing the Chrome extension, accepted LeetCode submissions will auto-sync here.
          Synced problems are marked <span className="ai-tag">AI Synced</span> — the approach,
          key points, and other fields are generated by Ollama. Click "Edit" to revise anything.
        </div>
      </div>
    </div>
  );
}