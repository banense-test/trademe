import type { Money } from "../money.js";

/** A trade in the configurable taxonomy (CON-018). */
export interface Trade {
  tradeId: string;
  name: string;
}

export type SkillLevel = "apprentice" | "journeyman" | "master";

export interface GeoArea {
  jurisdiction: string;
  region: string;
}

/** A single need within a worker request (FR-003, FR-004). */
export interface TradeNeed {
  trade: Trade;
  skillLevel: SkillLevel;
  location: GeoArea;
  durationDays: number;
  billRate: Money;
}

/** A contractor's soft preference for a specific worker (CON-006 — never a hard filter). */
export interface Preference {
  workerId: string;
}

export type RequestStatus = "open" | "matched" | "assigned" | "closed";

export interface WorkerRequest {
  requestId: string;
  projectId: string;
  needs: TradeNeed[];
  preferences: Preference[];
  status: RequestStatus;
}

export interface Worker {
  workerId: string;
  trades: Trade[];
  skillLevel: SkillLevel;
  geographicAvailability: GeoArea[];
  expectedRate: Money;
}

/** A candidate worker surfaced by matching, with a policy score. */
export interface Candidate {
  workerId: string;
  score: number;
  trades: Trade[];
}
