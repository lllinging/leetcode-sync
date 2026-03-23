// Ebbinghaus spaced-repetition intervals (days)
export const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30, 60];

// Today as "YYYY-MM-DD"
export const today = () => new Date().toISOString().split("T")[0];

// Check if a review date is due
export const isDue = (nextReview) => {
  if (!nextReview) return false;
  return nextReview <= today();
};

// Calculate the next review date based on stage
export const calcNextReview = (stage, lastDate) => {
  const d = new Date(lastDate);
  const interval = REVIEW_INTERVALS[Math.min(stage, REVIEW_INTERVALS.length - 1)];
  d.setDate(d.getDate() + interval);
  return d.toISOString().split("T")[0];
};
