import type { Candidate, Preference, Worker, WorkerRequest } from "./types.js";
import type { MatchingPolicy } from "./policy.js";

/**
 * IMatching — the COMP-001 subsystem boundary (INT-001).
 * No module depends on MatchingService internals; consumers depend on this interface.
 */
export interface IMatching {
  match(request: WorkerRequest): Candidate[];
  select(candidates: Candidate[], preferences: Preference[]): Candidate;
}

/**
 * MatchingService — orchestrates match→select for UC-004.
 * The policy is injected (strategy pattern, AC-008); the candidate search is
 * delegated to the party subsystem (IParty.availableWorkers) via a function the
 * application layer supplies, keeping this module interface-bounded.
 */
export class MatchingService implements IMatching {
  constructor(
    private readonly policy: MatchingPolicy,
    private readonly availableWorkers: (
      request: WorkerRequest,
    ) => Worker[],
  ) {}

  match(request: WorkerRequest): Candidate[] {
    const workers = this.availableWorkers(request);
    return workers.map((w) => ({
      workerId: w.workerId,
      score: 0,
      trades: w.trades,
    }));
  }

  select(candidates: Candidate[], preferences: Preference[]): Candidate {
    return this.policy.select(candidates, preferences);
  }
}
