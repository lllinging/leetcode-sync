import { useProblems } from "../context/ProblemsContext";
import FilterBar from "../components/FilterBar";
import ProblemCard from "../components/ProblemCard";

export default function ProblemList() {
  const { filtered } = useProblems();
  return (
    <div>
      <FilterBar />
      {filtered.map((p) => <ProblemCard key={p.id} problem={p} />)}
      {filtered.length === 0 && <div className="empty-state">No matching problems</div>}
    </div>
  );
}
