import { useProblems } from "../context/ProblemsContext";
import { DIFFICULTIES } from "../utils/constants";

export default function FilterBar() {
  const {
    filters, setFilters,
    categories, subCategories, allTags,
    filtered, problems,
  } = useProblems();

  const set = (key) => (e) =>
    setFilters((f) => ({
      ...f,
      [key]: e.target.value,
      ...(key === "category" ? { subCategory: "" } : {}),
    }));

  const clear = () =>
    setFilters({ category: "", subCategory: "", difficulty: "", tag: "", search: "", reviewDue: false });

  return (
    <div className="card filter-bar">
      <input className="input search-input" placeholder="Search..." value={filters.search} onChange={set("search")} />
      <select className="select" value={filters.category} onChange={set("category")}>
        <option value="">All Categories</option>
        {categories.map((c) => <option key={c}>{c}</option>)}
      </select>
      <select className="select" value={filters.subCategory} onChange={set("subCategory")}>
        <option value="">All Subcategories</option>
        {subCategories.map((c) => <option key={c}>{c}</option>)}
      </select>
      <select className="select" value={filters.difficulty} onChange={set("difficulty")}>
        <option value="">All Difficulties</option>
        {DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
      </select>
      <select className="select" value={filters.tag} onChange={set("tag")}>
        <option value="">All Tags</option>
        {allTags.map((t) => <option key={t}>{t}</option>)}
      </select>
      <label className="checkbox-label">
        <input type="checkbox" checked={filters.reviewDue} onChange={(e) => setFilters((f) => ({ ...f, reviewDue: e.target.checked }))} />
        Due for review
      </label>
      <button className="btn btn-sm btn-muted" onClick={clear}>Clear</button>
      <span className="filter-count">{filtered.length}/{problems.length}</span>
    </div>
  );
}
