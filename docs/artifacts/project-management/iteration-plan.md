## Document Control

| Field | Value |
|---|---|
| Phase | Inception |
| Status | Draft — iteration 3 |
| Milestone Target | End-of-Inception review (LCO) |

## Iteration Objectives

1. Resolve the 5 remaining open Minor findings (Development Case#F2, Use-Case Model#F7, Use-Case Model#F8, Iteration Plan#F2, Deployment Model#F1) — all blocking per the stakeholder's standing directive to fix ALL findings including Minors.
2. Re-review by all three lenses (Reviewer, BusinessReviewer, ManagementReviewer) confirming resolution.
3. Re-consult the stakeholder for LCO sanction.
4. Assess Lifecycle Objectives (LCO) readiness: stakeholders agree on scope, the project is viable, and initial risks are identified.

## Plan and Milestones
### Coarse Roadmap (cross-iteration)

```plantuml
@startgantt
hide footbox
-- Inception --
[I1 Conceive & Plan] lasts 1 days
[I2 Remediation] lasts 1 days
[I3 Remediation 2] lasts 1 days
[LCO] happens at [I3 Remediation 2]'s end
-- Elaboration --
[I4] lasts 1 days
[I5] lasts 1 days
[I6] lasts 1 days
[LCA] happens at [I6]'s end
-- Construction --
[I7] lasts 1 days
[I8] lasts 1 days
[I9] lasts 1 days
[IOC] happens at [I9]'s end
-- Transition --
[I10] lasts 1 days
[I11] lasts 1 days
[PR] happens at [I11]'s end
@endgantt
```

**Sequence-only, not a calendar.** The Gantt above expresses the *ordering* of iterations and the *position* of the four milestones (LCO, LCA, IOC, PR) — nothing more. The `lasts 1 days` bars are PlantUML placeholders required to render the sequence; they are **not** time-boxes and carry no calendar meaning. Iterations are bounded by their **token budget box** (see Fine Plan below), never by a duration. No iteration is sized in days, weeks, or person-time — units this system does not measure.

**Iteration count rationale:** 11 iterations total. This exceeds the "6 ± 3" rule's high extreme [1, 3, 3, 2] by two Inception remediation iterations (I2 and I3), both forced by the stakeholder's directive to fix ALL findings — including Minors — before advancing past LCO. The directive was refused sanction twice (iteration 1 and iteration 2), each refusal forcing a further remediation pass. The stretch is justified by the risk profile: R003 (multi-jurisdiction regulatory complexity) and R001 (legacy replacement failures) demand a full 3-iteration Elaboration to retire architectural and compliance risk before Construction; R002 (leadership tension) argues for a lean but complete process. The two remediation iterations are process overhead imposed by the stakeholder's quality bar, not scope growth.

**Milestone sequence:** LCO (end of I3) → LCA (end of I6) → IOC (end of I9) → PR (end of I11).

### Fine Plan — Inception Iteration 3 (second remediation)

```plantuml
@startuml
start
:Resolve 5 Minor findings\n(Development Case#F2, Use-Case Model#F7/F8,\nIteration Plan#F2, Deployment Model#F1) — 1,000k tokens;
:Re-review (3 lenses)\nReviewer, BusinessReviewer, ManagementReviewer — 500k tokens;
:Stakeholder re-consultation\nLCO sanction gate — 300k tokens;
stop
@enduml
```

**Iteration budget box — measured, not assumed.** Iteration 1's box (750k tokens) was an explicit assumption with no measured actual to size against; it did not hold (measured actual 2,871,727 tokens, 3.8× overspend). That box is **iteration-1 historical** and is superseded. The iteration-2 remediation box (2,800k) was sized from the measured iteration-1 actual and held within 7.7% (actual 3,014,457). The iteration-3 box is sized from the measured iteration-2 actual, reduced for the smaller remediation scope (5 Minor findings vs iteration 2's 14):

| Work Item | Owner | Token Budget |
|---|---|---|
| Resolve 5 Minor findings (Development Case#F2, Use-Case Model#F7/F8, Iteration Plan#F2, Deployment Model#F1) | Process Engineer, Business Process Analyst, Project Manager, Deployment Manager | 1,000k |
| Re-review by three lenses | Reviewer, BusinessReviewer, ManagementReviewer | 500k |
| Stakeholder re-consultation (LCO sanction) | Review Coordinator | 300k |
| **Iteration-3 box total** | — | **1,800k** |

**Measured actuals (the basis for every subsequent forecast):**

| Iteration | Token spend (agent work) | Agent elapsed time | Human queue time (waiting) |
|---|---|---|---|
| I1 (conceive & plan) | 2,871,727 | 1:23:17 | 0:04:38 |
| I2 (remediation) | 3,014,457 | 0:43:29 | 0:00:00 |

Spend is dominated by reasoning over the accumulated artifact surface (12 artifacts) and re-reading it across roles — not by the volume the phase emits. The measured shape replaces every assumed share in every forecast made afterwards. The iteration-3 box (1,800k) is below the iteration-2 actual (3,014,457) because the remediation scope is smaller (5 Minor findings, four of which are diagram-association or metadata fixes) — but the re-review pass still re-reads the full 12-artifact surface, so the box is not reduced proportionally to the finding count.

## Resources

**Agent role profile (Inception I3 — second remediation):** Process Engineer, Business Process Analyst, Project Manager, Deployment Manager (finding owners); Reviewer, BusinessReviewer, ManagementReviewer (re-review); Review Coordinator (stakeholder re-consultation). Business Modeling remains ACTIVE per the Development Case.

**Budget split across roles:** Process Engineer 150k · Business Process Analyst 300k · Project Manager 150k · Deployment Manager 100k · Reviewer 150k · BusinessReviewer 150k · ManagementReviewer 200k · Review Coordinator 300k — total 1,500k tokens (remediation + re-review), plus 300k for the stakeholder re-consultation gate = 1,800k box.

**Human gates:** the stakeholder re-consultation (`REQUIRES_USER_INPUT`) is the only human gate this iteration. Queue time is tracked per gate and escalated as a risk (R006) if any gate approaches the 14-day ceiling.

## Use Cases and Scenarios Addressed

Inception details only the architecturally significant use cases (10–20%). The four detailed in iteration 1, selected for architectural risk coverage, remain the Inception detail set:

| UC | Rationale for Inception detail |
|---|---|
| UC-004 Request Workers for Project | Carries matching (FR-018), assignment (FR-019), and the availability race (NFR-008, AC-005) — the highest architectural risk |
| UC-012 Process Payments | Carries the financial-intermediary flow (CON-004), tax/currency jurisdiction logic (CON-008..CON-010, FR-022) |
| UC-013 Produce Regulatory Reports | Carries configuration-driven compliance (NFR-003, CON-007, AC-001) — R003's anchor |
| UC-014 Terminate Worker Assignment | Carries contracts-must-be-honored (CON-013) and denial rules (CON-006) |

The remaining 17 UCs are surveyed (Use-Case Model) and detailed in Elaboration. This iteration is a remediation pass — no new use cases are detailed; the Use-Case Model's business-modeling content (BUC-004/BUC-011 associations) is corrected by the Business Process Analyst.

## Evaluation Criteria

**(a) Declared acceptance criteria — disposition this iteration:**

| AC | Disposition | Evidence |
|---|---|---|
| AC-001 | Addressed (design-level) | UC-013 + CON-007/NFR-003 configuration-driven compliance; verified end-to-end in later iterations |
| AC-002 | Addressed (design-level) | CON-017 multi/single-tenant; Deployment Model (FIRED) |
| AC-003 | Addressed (design-level) | UC-004 → UC-012 end-to-end flow; self-service NFR-002 |
| AC-004 | Addressed (design-level) | UC-012/UC-013 jurisdiction-specific tax/certification/reporting |
| AC-005 | Addressed (design-level) | UC-004 race check (NFR-008) |
| AC-006 | Addressed (design-level) | CON-014/CON-015 retention + Test Plan (FIRED) |
| AC-007 | Addressed (design-level) | CON-005 + fraud data retention (NFR-004) |
| AC-008 | Addressed (design-level) | NFR-005 configurable matching policy |

All eight ACs are addressed at design level this iteration; none are deferred. Full verification is the work of Elaboration/Construction/Transition.

**(b) This iteration's own exit criteria (LCO readiness):**
- All 5 open Minor findings resolved (Development Case#F2, Use-Case Model#F7, Use-Case Model#F8, Iteration Plan#F2, Deployment Model#F1).
- Re-review by all three lenses confirms resolution (0 Critical, 0 Major, 0 Minor open).
- Stakeholder sanctions advancement past LCO.
- Vision, Use-Case Model, Supplementary Specification, Glossary, Development Case all present and consistent.
- Risk List classifies R001–R006 with strategies and mitigations.

## Traceability

| Element | Traces From | Link Type | Traces To |
|---|---|---|---|
| Iteration Plan (I3) | BG-001, BG-002 | Derives | Risk List, Use-Case Model |
| Iteration Plan#F2 (budget box) | Iteration Assessment (I2) measured actual | DependsOn | Iteration Plan (I3) re-sized box |
| UC-004 detail | FR-004, FR-018, FR-019, NFR-008 | Derives | Software Architecture Document |
| UC-012 detail | FR-014, FR-022, CON-004, CON-008..CON-010 | Derives | Software Architecture Document |
| UC-013 detail | FR-015, NFR-003, CON-007 | Derives | Software Architecture Document |
| UC-014 detail | FR-020, CON-006, CON-013 | Derives | Software Architecture Document |
| R001..R006 | declared risks + derived | DependsOn | Risk List |