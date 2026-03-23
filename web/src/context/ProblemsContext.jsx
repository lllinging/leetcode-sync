import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { loadProblems, saveProblems } from "../utils/storage";
import { today, isDue, calcNextReview } from "../utils/review";
import { DEMO_PROBLEMS } from "../data/demo";

const ProblemsContext = createContext(null);

export function ProblemsProvider({ children }) {
  const [problems, setProblems] = useState(() => {
    const saved = loadProblems();
    return saved.length > 0 ? saved : DEMO_PROBLEMS;
  });

  const [filters, setFilters] = useState({
    category: "",
    subCategory: "",
    difficulty: "",
    tag: "",
    search: "",
    reviewDue: false,
  });

  const [compareIds, setCompareIds] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // Persist to localStorage on every change
  useEffect(() => {
    saveProblems(problems);
  }, [problems]);

  // ====== CRUD ======

  const addProblem = useCallback((problem) => {
    setProblems((prev) => [
      {
        ...problem,
        id: problem.id || Date.now().toString(),
        reviewHistory: problem.reviewHistory || [],
        nextReview: problem.nextReview || today(),
        reviewStage: problem.reviewStage || 0,
        dateAdded: problem.dateAdded || today(),
      },
      ...prev,
    ]);
  }, []);

  const updateProblem = useCallback((id, changes) => {
    setProblems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...changes } : p))
    );
  }, []);

  const deleteProblem = useCallback((id) => {
    setProblems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const bulkAdd = useCallback((newProblems) => {
    setProblems((prev) => {
      const existing = new Set(prev.map((p) => p.title));
      const unique = newProblems.filter((p) => !existing.has(p.title));
      return [...prev, ...unique];
    });
    return newProblems.length;
  }, []);

  const replaceAll = useCallback((newProblems) => {
    setProblems(newProblems);
  }, []);

  // ====== Review ======

  const handleReview = useCallback((id, quality) => {
    setProblems((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const newStage =
          quality >= 3
            ? p.reviewStage + 1
            : Math.max(0, p.reviewStage - 1);
        return {
          ...p,
          reviewStage: newStage,
          reviewHistory: [...p.reviewHistory, { date: today(), quality }],
          nextReview: calcNextReview(newStage, today()),
        };
      })
    );
  }, []);

  // ====== Compare ======

  const toggleCompare = useCallback((id) => {
    setCompareIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 4
        ? [...prev, id]
        : prev
    );
  }, []);

  // ====== Derived state ======

  const categories = useMemo(
    () => [...new Set(problems.map((p) => p.category))],
    [problems]
  );

  const subCategories = useMemo(() => {
    const src = filters.category
      ? problems.filter((p) => p.category === filters.category)
      : problems;
    return [...new Set(src.map((p) => p.subCategory).filter(Boolean))];
  }, [problems, filters.category]);

  const allTags = useMemo(
    () => [...new Set(problems.flatMap((p) => p.tags || []))].sort(),
    [problems]
  );

  const filtered = useMemo(() => {
    return problems.filter((p) => {
      if (filters.category && p.category !== filters.category) return false;
      if (filters.subCategory && p.subCategory !== filters.subCategory) return false;
      if (filters.difficulty && p.difficulty !== filters.difficulty) return false;
      if (filters.tag && !(p.tags || []).includes(filters.tag)) return false;
      if (filters.reviewDue && !isDue(p.nextReview)) return false;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const haystack = [p.title, p.keyPoints, p.approach, ...(p.tags || [])]
          .join(" ")
          .toLowerCase();
        return haystack.includes(s);
      }
      return true;
    });
  }, [problems, filters]);

  const dueCount = useMemo(
    () => problems.filter((p) => isDue(p.nextReview)).length,
    [problems]
  );

  const dueProblems = useMemo(
    () => problems.filter((p) => isDue(p.nextReview)),
    [problems]
  );

  const value = {
    problems,
    filters,
    setFilters,
    compareIds,
    editingId,
    setEditingId,
    addProblem,
    updateProblem,
    deleteProblem,
    bulkAdd,
    replaceAll,
    handleReview,
    dueCount,
    dueProblems,
    toggleCompare,
    categories,
    subCategories,
    allTags,
    filtered,
  };

  return (
    <ProblemsContext.Provider value={value}>
      {children}
    </ProblemsContext.Provider>
  );
}

export const useProblems = () => {
  const ctx = useContext(ProblemsContext);
  if (!ctx) throw new Error("useProblems must be used inside ProblemsProvider");
  return ctx;
};
