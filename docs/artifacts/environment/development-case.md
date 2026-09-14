## Document Control

| Field | Value |
|---|---|
| Phase | Inception |
| Status | Draft — iteration 1 |
| Milestone Target | End-of-Inception review |

## Tailoring Overview

This Development Case is an **override delta** over the IARI DC baseline (24-role roster, 9 disciplines, 16 CORE + 6 OPTIONAL artifacts, fixed ownership). It records only project-specific deviations. Anything not stated here is per the baseline.

**Organization assessment (feeds tailoring):**
- **CON-022** — market intermediary, not a software firm; historically weak software discipline. The process must be operable by a small team and maintainable over a long horizon → lean ceremony, no heavyweight review boards.
- **R001** — legacy replacement failed multiple times. The process must be light enough to actually be followed; over-specification is a project risk, not rigor.
- **R002** — dev/leadership tension. The process must be transparent and evidence-based (traceability, review records) so decisions are auditable.
- **R003** — multi-jurisdiction regulatory complexity. Requirements and Test disciplines carry the highest risk weight; configuration-driven (CON-007, NFR-003) rather than code-branching.

**Tool assessment:** No `CONTRIBUTING.md`, lint config, or CI workflows exist at project start. These are owned by their discipline roles (Software Architect, Configuration Manager) and must be produced during Elaboration. The Development Case references them; it does not author them.

## Disciplines and Intensity

Intensity per discipline/phase is **per the canonical matrix** (no deviations requested).

**Discipline activation:**
- Requirements, Analysis & Design, Implementation, Test, Deployment, Configuration & Change Management, Project Management → ACTIVE (baseline).
- **Business Modeling → ACTIVE** (business-process-led = true). Rationale: the system automates a manual brokerage (220 representatives performing data entry and matching), and FR-018 explicitly requires capturing "the hand-tuned policy representatives used for decades" in configurable form. The business process is the subject of the system, not merely its context.
- Environment → ONE-TIME at project start (this iteration).

## Artifacts and Templates

All 16 CORE artifacts are produced per baseline. No CORE artifact is omitted.

**Project tool/guideline references (owned by discipline roles, referenced here):**
- `CONTRIBUTING.md` — coding/design/test/UI guidelines (Software Architect + discipline experts). **Gap: not yet created — due Elaboration.**
- `.github/workflows/` — CI/CD pipeline configuration (Configuration Manager). **Gap: not yet created — due Elaboration.**
- Lint configuration — per-language (Software Architect). **Gap: not yet created — due Elaboration.**

## Optional Artifact Triggers

| Optional Artifact | Trigger Condition | Verdict |
|---|---|---|
| Glossary | Specialist/regulated vocabulary | **FIRED** — multi-jurisdiction labor law, tax, certification terminology (CON-008..CON-016) requires stakeholder-validated definitions |
| Architectural Proof-of-Concept | Elaboration + technical risk requiring empirical validation | **NOT FIRED** — Elaboration phase not reached; re-evaluate at Elaboration against R001/R003 |
| Data Model | Data-centric OR >10 entities OR data-migration | **FIRED** — worker/contractor/project/payment/certification/membership/assignment entities well exceed 10 |
| Deployment Model | Distributed/multi-node OR multi-environment non-trivial | **FIRED** — CON-017 requires both multi-tenant and single-tenant topologies |
| User-Interface Prototype | UX-critical OR UI complexity needing stakeholder validation | **FIRED** — NFR-001/NFR-002 self-service channel for low-technical-literacy users is UX-critical |
| Test Plan | Formal delivery / regulatory audit / contractual reporting | **FIRED** — CON-014 regulatory reporting + AC-006 audit requirement |

## Roles and Ownership

All 24 baseline roles are active. Primary ownership per artifact is per the service-side allowlist (never reassigned). No roles are merged.

**Business Modeling roles** (BusinessProcessAnalyst, BusinessReviewer) are active because Business Modeling is active.

## Guidelines and Procedures

**Measurement policy (this project):** IARI measures two quantities — tokens consumed, and elapsed time split into agent time vs. human queue time. This project uses them as follows:
- **Tokens** → cost-boxing decisions: each iteration is cost-boxed; the Project Manager reads token consumption to decide whether an iteration's exit criteria can pass within budget or scope must bend.
- **Human queue time** → gate risk tracking: every `REQUIRES_USER_INPUT` is a human gate; queue time is measured and reported separately (never added to agent time), and any gate approaching the 14-day ceiling is escalated as a risk in the Risk List (R002 is the standing tension risk).
- No other metrics are tracked. A metric whose decision cannot be named is not tracked.

**Process support:** The Process Engineer serves as the process help desk across all iterations. Process questions, tool failures, and template ambiguities are resolved within one iteration cycle; blocking issues escalate immediately.

## Traceability

| Element | Traces From | Link Type | Traces To |
|---|---|---|---|
| Business Modeling ACTIVE | FR-018 (hand-tuned policy capture) | Derives | Business Use-Case Model |
| Glossary FIRED | CON-008..CON-016 (regulatory vocabulary) | Derives | Glossary |
| Data Model FIRED | FR-001..FR-011 (entity-rich scope) | Derives | Data Model |
| Deployment Model FIRED | CON-017 (multi/single-tenant) | Derives | Deployment Model |
| UI Prototype FIRED | NFR-001, NFR-002 (self-service UX) | Derives | User-Interface Prototype |
| Test Plan FIRED | CON-014, AC-006 (regulatory audit) | Derives | Test Plan |
| Architectural PoC NOT FIRED | R001, R003 (Elaboration-gated) | DependsOn | (deferred to Elaboration) |
