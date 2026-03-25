import { useState } from "react";
import { ProblemsProvider, useProblems } from "./context/ProblemsContext";
import { useExtensionSync } from "./hooks/useExtensionSync";
import Dashboard from "./pages/Dashboard";
import ProblemList from "./pages/ProblemList";
import ReviewMode from "./pages/ReviewMode";
import CompareView from "./pages/CompareView";
import AddProblem from "./pages/AddProblem";
import Roadmap from "./pages/Roadmap";
import "./App.css";

function AppShell() {
  const [view, setView] = useState("dashboard");
  const { dueCount, compareIds, addProblem, problems } = useProblems();

  useExtensionSync(addProblem, problems);

  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "roadmap", label: "🗺️ Roadmap" },
    { id: "list", label: "Problems" },
    { id: "review", label: "Review", badge: dueCount },
    { id: "compare", label: "Compare", badge: compareIds.length },
    { id: "add", label: "Add / Import" },
  ];

  return (
    <div className="app">
      <header className="header">
        <div className="header-title">LeetCode Notebook</div>
        <nav className="nav">
          {tabs.map((t) => (
            <button key={t.id} className={`nav-btn ${view === t.id ? "active" : ""}`} onClick={() => setView(t.id)}>
              {t.label}
              {t.badge > 0 && <span className="nav-badge">{t.badge}</span>}
            </button>
          ))}
        </nav>
      </header>
      <main className="container">
        {view === "dashboard" && <Dashboard onNavigate={setView} />}
        {view === "roadmap" && <Roadmap />}
        {view === "list" && <ProblemList />}
        {view === "review" && <ReviewMode />}
        {view === "compare" && <CompareView onNavigate={setView} />}
        {view === "add" && <AddProblem onNavigate={setView} />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ProblemsProvider>
      <AppShell />
    </ProblemsProvider>
  );
}
