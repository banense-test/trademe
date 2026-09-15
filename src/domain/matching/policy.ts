import type { Candidate, Preference } from "./types.js";

/**
 * MatchingPolicy — a deterministic, explainable, configurable selection strategy
 * (NFR-005, AC-008). The policy is injected into MatchingService, never hard-coded,
 * so a fairness adjustment is a configuration change, not a code change.
 */
export interface MatchingPolicy {
  readonly name: string;
  select(candidates: Candidate[], preferences: Preference[]): Candidate;
}

/**
 * FirstAcceptableMatchPolicy — selects the first candidate in the supplied order.
 * Deterministic and trivially explainable: the ordering of the candidate list is
 * the published policy (e.g., longest-idle worker first).
 */
export class FirstAcceptableMatchPolicy implements MatchingPolicy {
  readonly name = "first-acceptable-match";

  select(candidates: Candidate[], _preferences: Preference[]): Candidate {
    if (candidates.length === 0) {
      throw new Error("No candidates to select from");
    }
    return candidates[0];
  }
}

/**
 * PreferenceWeightedPolicy — weights candidates by the contractor's soft preferences
 * (CON-006). A preferred worker gains weight but is never a hard filter; the selection
 * remains deterministic (ties broken by candidate order) and explainable.
 */
export class PreferenceWeightedPolicy implements MatchingPolicy {
  readonly name = "preference-weighted";

  select(candidates: Candidate[], preferences: Preference[]): Candidate {
    if (candidates.length === 0) {
      throw new Error("No candidates to select from");
    }
    const preferred = new Set(preferences.map((p) => p.workerId));
    let best = candidates[0];
    let bestScore = preferred.has(best.workerId) ? 1 : 0;
    for (const c of candidates.slice(1)) {
      const score = preferred.has(c.workerId) ? 1 : 0;
      if (score > bestScore) {
        best = c;
        bestScore = score;
      }
    }
    return best;
  }
}
