import { useEffect } from "react";
import { today } from "../utils/review";

/**
 * Listen for new problem data sent from the Chrome extension
 * via window.postMessage. Auto-deduplicates by title.
 */
export function useExtensionSync(addProblem, problems) {
  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type !== "LC_SYNC_NEW_PROBLEM" || !event.data?.problem) {
        return;
      }

      const incoming = event.data.problem;

      if (problems.some((p) => p.title === incoming.title)) {
        console.log("[LC Sync] Duplicate skipped:", incoming.title);
        return;
      }

      console.log("[LC Sync] New problem received:", incoming.title);

      addProblem({
        ...incoming,
        id: incoming.id || Date.now().toString(),
        reviewHistory: incoming.reviewHistory || [],
        nextReview: incoming.nextReview || today(),
        reviewStage: incoming.reviewStage || 0,
        dateAdded: incoming.dateAdded || today(),
        aiGenerated: true,
      });
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [addProblem, problems]);
}
