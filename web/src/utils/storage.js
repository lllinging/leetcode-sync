const STORAGE_KEY = "lc_notebook_data";

export const loadProblems = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
};

export const saveProblems = (problems) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(problems));
};
