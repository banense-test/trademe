# TradeMe Branching Strategy

## Document Control

| Field | Value |
|---|---|
| Phase | Inception |
| Status | Published — iteration 1 |
| Milestone Target | End-of-Inception review |

## Purpose

This file is configuration-as-code: the workspace hierarchy (developer → integration → release) that every role consumes. It is committed DIRECT to `main` via `scm_commit_files` — never opened as a PR. PRs are for source code; this file is documentation that downstream consumers (Integrator, Implementer, Reviewer) must read without a review gate.

## Branch Topology

```plantuml
@startuml
title Branch Topology — TradeMe (IARI canonical model)

package "main (release baseline)" {
  [main] as MAIN
}

package "iteration/E{n} — Elaboration integration" {
  [iteration/E1] as ITE1
  [iteration/E2] as ITE2
}

package "iteration/C{n} — Construction integration" {
  [iteration/C1] as ITC1
  [iteration/C2] as ITC2
}

package "feature/E{n}-{risk-id}[-{mechanism}]" {
  [feature/E1-R003-regulatory-config] as FE1
  [feature/E2-R001-legacy-analysis] as FE2
}

package "feature/C{n}-{uc-id}-{subject}" {
  [feature/C1-UC001-worker-register] as FC1
  [feature/C1-UC004-request-workers] as FC2
}

package "hotfix/{issue-id}" {
  [hotfix/issue-42] as HF1
}

package "chore/{subject}" {
  [chore/branching-strategy] as CH1
}

MAIN <-- ITE1 : iteration-close PR (LAM)
MAIN <-- ITC1 : iteration-close PR (IOC)
ITE1 <-- FE1 : feature PR (APPROVED)
ITE2 <-- FE2 : feature PR (APPROVED)
ITC1 <-- FC1 : feature PR (APPROVED)
ITC1 <-- FC2 : feature PR (APPROVED)
MAIN <-- HF1 : hotfix PR (express review)
MAIN <-- CH1 : direct commit (docs/config-as-code)

note right of MAIN
  Only the Integrator writes main.
  Baseline tags freeze APPROVED + CI-green commits.
end note

note bottom of CH1
  docs/BRANCHING_STRATEGY.md and CI config
  commit DIRECT to main — no PR.
end note
@enduml
```

## Baseline Pedigree

```plantuml
@startuml
title Baseline Pedigree — pre-tag gate

[*] --> IterationClose
state "Iteration close PR opened (iteration/* -> main)" as IterationClose

IterationClose --> ReviewGate : scm_get_pull_request_review_state
state "Review gate" as ReviewGate {
  [*] --> CheckReview
  CheckReview --> Approved : APPROVED
  CheckReview --> BlockedReview : CHANGES_REQUESTED | NONE
}

Approved --> CIGate : scm_get_build_status(main)
state "CI gate" as CIGate {
  [*] --> CheckCI
  CheckCI --> Green : green
  CheckCI --> BlockedCI : red
}

Green --> Tag : scm_create_tag(baseline-{phase}{n}-v{x})
state "Write baseline tag" as Tag
Tag --> [*]

BlockedReview --> Escalate
BlockedCI --> Escalate
state "Escalate SCM issue (severity:blocker + nature:defect)" as Escalate
Escalate --> [*] : DO NOT tag

note right of Tag
  Tag message = audit record:
  PR number, head SHA, review ID, CI run URL.
end note
@enduml
```

## Naming Conventions

### Branches

| Pattern | Purpose | Phase |
|---|---|---|
| `feature/E{n}-{risk-id}[-{mechanism}]` | Evolutionary architectural mechanism (based on `iteration/E{n}`, integrated like a feature) | Elaboration |
| `feature/C{n}-{uc-id}-{subject}` | Feature branch realizing a use case | Construction |
| `iteration/E{n}` | Elaboration integration workspace | Elaboration |
| `iteration/C{n}` | Construction integration workspace | Construction |
| `hotfix/{issue-id}` | Transition hotfix from `main` | Transition |
| `chore/{subject}` | Non-functional repo maintenance (branching strategy, CI config) | Any |

Non-conforming branches are surfaced as SCM issues with `severity:minor` + `nature:defect` + `naming-violation` labels.

### Baseline Tags

`baseline-{phase}{n}-v{x}` where `phase` ∈ {elaboration, construction, transition}, `n` is the iteration number, and `x` is the patch version starting at 1.

- `baseline-elaboration-E1-v1` — Elaboration architecture baseline (iteration 1)
- `baseline-construction-C1-v1` — Construction iteration baseline (iteration 1)
- `baseline-transition-T1-v1` — Transition release baseline (release 1)

Re-tagging with a higher patch (`v2`, `v3`…) is justified ONLY after a rollback or a post-baseline critical fix. Normal iteration work targets the NEXT iteration's tag.

## Canonical Branching Model per Phase

### Inception

Documentation only; normally no implementation code. A feasibility mechanism, if genuinely required for risk reduction, is built evolutionarily in `src/` on `feature/I{n}-{subject}` (never throwaway).

### Elaboration — evolutionary architectural mechanism (mirrors Construction)

The architectural prototype is EVOLUTIONARY — it becomes the Construction baseline, not throwaway sample code. A technical risk is retired by ANALYSIS (the Software Architect reasons feasibility — no code) or by building the REAL mechanism in `src/` on `feature/E{n}-{risk-id}[-{mechanism}]` based on `iteration/E{n}`.

- The Architect records the decision as a process fact (`record_poc_decision`: `analysis-only` | `single-mechanism` | `candidates`).
- The Code Reviewer opens + reviews each mechanism PR (base `iteration/E{n}`) as production.
- The Integrator merges the APPROVED mechanism into `iteration/E{n}`.
- For competing `candidates` the Architect selects the winner and the Integrator closes the loser's PR (`scm_close_pull_request`) per the recorded decision.
- At LAM close the Integrator opens `iteration/E{n} → main`; the Deliver bookend merges the reviewed baseline.

There is **no** `samples/poc/` and **no** ephemeral `poc/*` branch.

### Construction — feature branches

UC realizations on `feature/C{n}-{uc-id}-{subject}` based on `iteration/C{n}`; the Code Reviewer reviews, the Integrator merges APPROVED into `iteration/C{n}` and opens `iteration/C{n} → main` at IOC.

### Transition — hotfixes

`hotfix/{issue-id}` from `main`, express review, merge to `main` with a patch baseline tag.

## Cross-Phase Invariants

- Only the Integrator writes `iteration/*` and `main` (no other role pushes there).
- `ready-for-review` is the Implementer → Code Reviewer handoff label.
- A baseline tag freezes only an APPROVED + CI-green commit.
- One baseline tag per iteration close — never mid-iteration.

## Traceability

| Element | Traces From | Link Type | Traces To |
|---|---|---|---|
| Branch topology (main/iteration/feature/hotfix) | CON-017 (multi/single-tenant), CON-020 (legacy coexistence) | Derives | Integrator, Implementer, Reviewer workflows |
| Baseline pedigree (pre-tag gate) | CON-014 (regulatory reporting), AC-006 (audit) | Derives | Baseline tags |
| Naming conventions | R001/R002 (lean, auditable process) | Derives | Branch/tag names |
