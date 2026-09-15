import { test } from "node:test";
import assert from "node:assert/strict";
import { MatchingService } from "../src/domain/matching/service.js";
import {
  FirstAcceptableMatchPolicy,
  PreferenceWeightedPolicy,
} from "../src/domain/matching/policy.js";
import type { Candidate, Preference, Worker, WorkerRequest } from "../src/domain/matching/types.js";

function candidate(workerId: string): Candidate {
  return { workerId, score: 0, trades: [] };
}

// --- Black-box: FirstAcceptableMatchPolicy ---

test("FirstAcceptableMatchPolicy selects the first candidate", () => {
  const policy = new FirstAcceptableMatchPolicy();
  const cs = [candidate("w1"), candidate("w2"), candidate("w3")];
  assert.equal(policy.select(cs, []).workerId, "w1");
});

test("FirstAcceptableMatchPolicy rejects an empty candidate set", () => {
  const policy = new FirstAcceptableMatchPolicy();
  assert.throws(() => policy.select([], []), /No candidates/);
});

// --- Black-box: PreferenceWeightedPolicy ---

test("PreferenceWeightedPolicy prefers the named worker", () => {
  const policy = new PreferenceWeightedPolicy();
  const cs = [candidate("w1"), candidate("w2"), candidate("w3")];
  const prefs: Preference[] = [{ workerId: "w3" }];
  assert.equal(policy.select(cs, prefs).workerId, "w3");
});

test("PreferenceWeightedPolicy falls back to first when no preference matches", () => {
  const policy = new PreferenceWeightedPolicy();
  const cs = [candidate("w1"), candidate("w2")];
  const prefs: Preference[] = [{ workerId: "w9" }];
  assert.equal(policy.select(cs, prefs).workerId, "w1");
});

test("PreferenceWeightedPolicy is deterministic on ties", () => {
  const policy = new PreferenceWeightedPolicy();
  const cs = [candidate("w1"), candidate("w2")];
  // both preferred equally -> first in order wins
  const prefs: Preference[] = [{ workerId: "w1" }, { workerId: "w2" }];
  assert.equal(policy.select(cs, prefs).workerId, "w1");
});

// --- Black-box: MatchingService (strategy injection, AC-008) ---

test("MatchingService delegates selection to the injected policy", () => {
  const workers: Worker[] = [
    { workerId: "w1", trades: [], skillLevel: "journeyman", geographicAvailability: [], expectedRate: null as never },
    { workerId: "w2", trades: [], skillLevel: "journeyman", geographicAvailability: [], expectedRate: null as never },
  ];
  const svc = new MatchingService(new PreferenceWeightedPolicy(), () => workers);
  const request = {} as WorkerRequest;
  const candidates = svc.match(request);
  assert.equal(candidates.length, 2);
  const chosen = svc.select(candidates, [{ workerId: "w2" }]);
  assert.equal(chosen.workerId, "w2");
});

test("MatchingService policy is swappable without code change (AC-008)", () => {
  const workers: Worker[] = [
    { workerId: "w1", trades: [], skillLevel: "journeyman", geographicAvailability: [], expectedRate: null as never },
    { workerId: "w2", trades: [], skillLevel: "journeyman", geographicAvailability: [], expectedRate: null as never },
  ];
  const candidates = workers.map((w) => ({ workerId: w.workerId, score: 0, trades: [] }));
  const prefs: Preference[] = [{ workerId: "w2" }];

  const first = new MatchingService(new FirstAcceptableMatchPolicy(), () => workers);
  assert.equal(first.select(candidates, prefs).workerId, "w1");

  const weighted = new MatchingService(new PreferenceWeightedPolicy(), () => workers);
  assert.equal(weighted.select(candidates, prefs).workerId, "w2");
});
