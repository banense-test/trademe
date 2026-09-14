## Document Control

| Field | Value |
|---|---|
| Phase | Inception |
| Status | Draft — iteration 1 |
| Milestone Target | End-of-Inception review |

## Use-Case Diagram

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam actorStyle awesome

actor "Worker\n(STK-001)" as Worker
actor "Contractor\n(STK-002)" as Contractor
actor "Internal Representative\n(STK-003)" as Rep
actor "Regulator\n(STK-004)" as Regulator
actor "External Integration Partners\n(STK-005)" as Ext
actor "Time\n(scheduled triggers)" as Time

rectangle "TradeMe Marketplace" {
  usecase "UC-001 Register as Worker" as UC1
  usecase "UC-002 Register as Contractor" as UC2
  usecase "UC-003 Create Project Listing" as UC3
  usecase "UC-004 Request Workers for Project" as UC4
  usecase "UC-005 Track Assignment Arrival/Departure" as UC5
  usecase "UC-006 Record Hours Worked" as UC6
  usecase "UC-007 Complete Certification Course" as UC7
  usecase "UC-008 Maintain Membership" as UC8
  usecase "UC-009 Process Recurring Membership Fees" as UC9
  usecase "UC-010 Resolve Exception Case" as UC10
  usecase "UC-011 Assist via Fallback Channel" as UC11
  usecase "UC-012 Process Payments" as UC12
  usecase "UC-013 Produce Regulatory Reports" as UC13
  usecase "UC-014 Terminate Worker Assignment" as UC14
  usecase "UC-015 Close Project" as UC15
  usecase "UC-016 Record Rate Adjustments" as UC16
  usecase "UC-017 Detect Fraudulent Patterns" as UC17
  usecase "UC-018 Integrate with AP Systems" as UC18
  usecase "UC-019 Project Demand Projection" as UC19
  usecase "UC-020 Priority Capacity Allocation" as UC20
  usecase "UC-021 Delayed Assignment with Commitment" as UC21
}

Worker --> UC1
Worker --> UC5
Worker --> UC6
Worker --> UC7
Worker --> UC8
Worker --> UC16
Contractor --> UC2
Contractor --> UC3
Contractor --> UC4
Contractor --> UC5
Contractor --> UC8
Contractor --> UC14
Contractor --> UC15
Contractor --> UC16
Contractor --> UC20
Rep --> UC10
Rep --> UC11
Rep --> UC14
Regulator --> UC13
Ext --> UC18
Time --> UC9
Time --> UC12
Time --> UC13
Time --> UC17

UC15 ..> UC14 : <<include>>
@enduml
```

## Actors

| ID | Actor | Type | Description |
|---|---|---|---|
| STK-001 | Worker | Human | Independent skilled-trade individual; registers, lists trades/skills/certifications/availability/rates, finds work, records hours, receives payment, tracks CE. High-frequency self-service user. |
| STK-002 | Contractor | Human | General contractor; registers, lists projects, requests workers (preferences not insistence), pays through the system. High-frequency self-service user. |
| STK-003 | Internal Representative | Human | Operations team (220 today → single small backup call center). Exception handling, escalations, complex cases, fallback channel. |
| STK-004 | Regulator | External system (human-driven) | Requires jurisdiction-specific reports on labor activity, payment flows, certifications, on required cadences. |
| STK-005 | External Integration Partners | External system | Consumers of system outputs: contractors' AP systems, third-party credential validators, fraud-detection capability. |
| — | Time | Time-trigger | Scheduled triggers for recurring fees (UC-009), payment runs (UC-012), regulatory reports (UC-013), fraud scans (UC-017). |

## Use-Case Survey

| ID | Use Case | Source | Primary Actor | Priority | Volatility |
|---|---|---|---|---|---|
| UC-001 | Register as Worker | FR-001 | Worker | Must | Medium |
| UC-002 | Register as Contractor | FR-002 | Contractor | Must | Low |
| UC-003 | Create Project Listing | FR-003 | Contractor | Must | Medium |
| UC-004 | Request Workers for Project | FR-004, FR-018, FR-019 | Contractor | Must | High |
| UC-005 | Track Assignment Arrival/Departure | FR-005 | Worker, Contractor | Must | Medium |
| UC-006 | Record Hours Worked | FR-006, FR-007 | Worker | Must | Medium |
| UC-007 | Complete Certification Course | FR-008, FR-009 | Worker | Must | Medium |
| UC-008 | Maintain Membership | FR-010 | Worker, Contractor | Must | Low |
| UC-009 | Process Recurring Membership Fees | FR-011 | Time | Must | Low |
| UC-010 | Resolve Exception Case | FR-012 | Internal Representative | Must | Medium |
| UC-011 | Assist via Fallback Channel | FR-013 | Internal Representative | Must | Medium |
| UC-012 | Process Payments | FR-014, FR-022 | Time | Must | High |
| UC-013 | Produce Regulatory Reports | FR-015 | Regulator, Time | Must | High |
| UC-014 | Terminate Worker Assignment | FR-020 | Contractor, Internal Representative | Must | Medium |
| UC-015 | Close Project | FR-021 | Contractor | Must | Medium |
| UC-016 | Record Rate Adjustments | FR-023 | Worker, Contractor | Should | High |
| UC-017 | Detect Fraudulent Patterns | FR-016 | Time | Could | High |
| UC-018 | Integrate with AP Systems | FR-017 | External Integration Partners | Could | High |
| UC-019 | Project Demand Projection | FR-024 | (business) | Could | High |
| UC-020 | Priority Capacity Allocation | FR-025 | Contractor | Could | High |
| UC-021 | Delayed Assignment with Commitment | FR-026 | (system) | Could | High |

**Derivation notes (REFINE, not expansion):**
- UC-004 realizes three declared requirements: FR-004 (request), FR-018 (matching), FR-019 (assignment). Matching and assignment are system behaviors triggered within the contractor's request — not standalone actor goals — so they are modeled as included sub-flows of UC-004, not separate use cases.
- UC-006 realizes FR-006 (hours) and FR-007 (wage computation) — wage computation is a system behavior within hours recording.
- UC-007 realizes FR-008 (course) and FR-009 (certification recording).
- UC-012 realizes FR-014 (payments) and FR-022 (currency conversion).

## Use-Case Specifications

Inception details only the architecturally significant use cases (10-20%). The Requirements Specifier details the remaining flows in Elaboration.

### UC-004 Request Workers for Project (architecturally significant)

| Field | Value |
|---|---|
| Primary Actor | Contractor |
| Trigger | Contractor submits a request for workers matching a project's needs |
| Precondition | Project listing exists (UC-003); contractor membership active (UC-008) |
| Postcondition | Worker assigned to project (or request remains open awaiting match) |
| Main Flow | 1. Contractor selects project and specifies needs (trades, skill levels, location, duration, rate, preferred workers). 2. System analyzes needs and searches available worker population (FR-018). 3. System selects best available fit per configurable matching policy (FR-018, NFR-005). 4. System verifies worker still available (race check, NFR-008). 5. System commits assignment (FR-019). |
| Alternatives | A1: No candidate found → request remains open; contractor may raise offered rate (FR-023). A2: Worker became unavailable between match and assignment → revert to matching (FR-019, NFR-008). A3: Contractor expresses preference for specific worker → preference weighted, not insisted (CON-006). |
| Volatility | High — matching policy must be configurable (NFR-005, AC-008); fairness objectives evolve |

### UC-012 Process Payments (architecturally significant)

| Field | Value |
|---|---|
| Primary Actor | Time (scheduled payment run) |
| Trigger | Payment run scheduled |
| Precondition | Hours recorded (UC-006); wages computed (FR-007); contractor funds collected |
| Postcondition | Workers paid; payment records retained |
| Main Flow | 1. System computes wages owed from recorded hours and agreed rates (FR-007). 2. System applies jurisdiction-specific tax withholding (CON-009), minimum wage floors (CON-008), risk premiums (CON-010). 3. System performs currency conversion where contractor and worker are in different currency boundaries (FR-022). 4. System submits payment to worker from contractor-collected funds (FR-014, CON-004). |
| Alternatives | A1: Single-currency deployment → no conversion (FR-022). A2: Cross-jurisdiction → conversion applied. |
| Volatility | High — pricing model evolvable (CON-019); tax/currency jurisdiction-specific |

### UC-013 Produce Regulatory Reports (architecturally significant)

| Field | Value |
|---|---|
| Primary Actor | Regulator (via Time trigger) |
| Trigger | Jurisdiction-specific reporting cadence reached |
| Precondition | Operational data retained (CON-015) |
| Postcondition | Report produced in required format, on required cadence (CON-014) |
| Main Flow | 1. System identifies jurisdiction's reporting requirements from configuration (NFR-003, CON-007). 2. System assembles labor activity, payment flows, certification status, tax withholding data. 3. System produces report in required format. |
| Alternatives | A1: Jurisdiction requires different cadence/format → configuration, not code (AC-001). |
| Volatility | High — regulatory variation across jurisdictions (R003) |

### UC-014 Terminate Worker Assignment (architecturally significant)

| Field | Value |
|---|---|
| Primary Actor | Contractor, Internal Representative |
| Trigger | Worker no longer needed (project end, illness, walk-off, cancellation) |
| Precondition | Active assignment exists (UC-004) |
| Postcondition | Worker removed from active assignment; available for new matches |
| Main Flow | 1. System verifies termination request. 2. System removes worker from active assignment. 3. System makes worker available for new matches. 4. System records the termination and deviation from commitment (CON-013). |
| Alternatives | A1: Termination without verifiable cause → rejected (CON-006, contracts-must-be-honored CON-013). |
| Volatility | Medium — must not encourage casual termination (CON-013) |

## Business Use Cases
Business Modeling is active (Development Case §4: business-process-led). The system automates a manual brokerage — 220 representatives across 9 call centers performing data entry and manual matching. The business use cases below model the **organizational** processes at the organization boundary (the brokerage), not the software. The SystemAnalyst's system use cases (UC-001..UC-021) derive from these via the derivation bridge.

### Business Actors and Workers

| ID | Role | Classification | Rationale |
|---|---|---|---|
| STK-001 | Worker | Business Actor (external) | Independent contractor, not employed by the brokerage (CON-003); outside the organization boundary |
| STK-002 | Contractor | Business Actor (external) | General contractor; outside the organization boundary |
| STK-004 | Regulator | Business Actor (external) | Jurisdiction-specific body; outside the organization |
| STK-005 | External Integration Partners | Business Actor (external) | AP systems, credential validators; outside the organization |
| STK-003 | Internal Representative | Business Worker (internal) | Employed by the brokerage; performs the manual matching/data-entry work being automated |

### Business Use-Case Diagram

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam actorStyle awesome

actor "Worker\n(STK-001)" as Worker
actor "Contractor\n(STK-002)" as Contractor
actor "Regulator\n(STK-004)" as Regulator
actor "External Integration\nPartners (STK-005)" as Ext

rectangle "TradeMe Brokerage (Organization)" {
  actor "Internal Representative\n(STK-003)" as Rep <<business worker>>
  usecase "BUC-001 Onboard Worker" as BUC1
  usecase "BUC-002 Onboard Contractor" as BUC2
  usecase "BUC-003 Manage Project Lifecycle" as BUC3
  usecase "BUC-004 Broker Worker to Project" as BUC4
  usecase "BUC-005 Manage Assignment" as BUC5
  usecase "BUC-006 Capture Hours & Compute Wages" as BUC6
  usecase "BUC-007 Process Payments" as BUC7
  usecase "BUC-008 Manage Membership & Fees" as BUC8
  usecase "BUC-009 Track CE & Certifications" as BUC9
  usecase "BUC-010 Produce Regulatory Reports" as BUC10
  usecase "BUC-011 Handle Exceptions & Fallback" as BUC11
  usecase "BUC-012 Detect Fraud & Enforce Membership" as BUC12
}

Worker --> BUC1
Worker --> BUC5
Worker --> BUC6
Worker --> BUC8
Worker --> BUC9
Contractor --> BUC2
Contractor --> BUC3
Contractor --> BUC4
Contractor --> BUC5
Contractor --> BUC8
Regulator --> BUC10
Ext --> BUC7
Rep --> BUC11
Rep --> BUC12
Rep --> BUC5

BUC4 ..> BUC5 : <<include>>
BUC7 ..> BUC6 : <<include>>
@enduml
```

### Business Use-Case Survey

| ID | Business Use Case | Business Actor(s) | Business Worker(s) | Automation Potential | Volatility | Volatility Reason |
|---|---|---|---|---|---|---|
| BUC-001 | Onboard Worker | Worker | — | Full | Medium | Trade/skill taxonomy and certification frameworks are configurable data (CON-018); rate factors evolve |
| BUC-002 | Onboard Contractor | Contractor | — | Full | Low | Stable registration process |
| BUC-003 | Manage Project Lifecycle | Contractor | — | Full | Medium | Project requirement changes treated as variation of creation (FR-003); trades vary by jurisdiction |
| BUC-004 | Broker Worker to Project | Contractor | Internal Representative | Full | High | Matching policy must be configurable (NFR-005, AC-008); fairness objectives evolve; hand-tuned policy captured (FR-018) |
| BUC-005 | Manage Assignment | Worker, Contractor | Internal Representative | Full | Medium | Contracts-must-be-honored rule (CON-013); termination must not encourage casual churn |
| BUC-006 | Capture Hours & Compute Wages | Worker | — | Full | Medium | Wage computation depends on jurisdiction-specific floors/premiums (CON-008, CON-010) |
| BUC-007 | Process Payments | External Integration Partners | — | Full | High | Pricing model evolvable (CON-019); currency conversion (FR-022); tax withholding (CON-009) |
| BUC-008 | Manage Membership & Fees | Worker, Contractor | — | Full | Low | Recurring annual fee; stable lifecycle |
| BUC-009 | Track CE & Certifications | Worker | — | Full | Medium | Certification frameworks jurisdiction-specific (CON-018) |
| BUC-010 | Produce Regulatory Reports | Regulator | — | Full | High | Regulatory variation across jurisdictions (R003, CON-007) |
| BUC-011 | Handle Exceptions & Fallback | Worker, Contractor | Internal Representative | Partial | Medium | Human judgment retained for exceptions; channel equivalence required (NFR-006) |
| BUC-012 | Detect Fraud & Enforce Membership | — | Internal Representative | Partial | High | Detection in scope (FR-016); enforcement response deferred (out-of-scope open question) |

### Process Scope vs Project Scope

The business process is the **brokerage** — matching workers to contractors for a margin, with the company as financial intermediary. The project automates the **front door** (BG-002): the self-service channel that replaces 220 representatives. The following business processes are **out of project scope** and are documented as recommendations, not modeled:

- `[RECOMMENDATION — requires CR]` Deep continuing-education (course delivery, test administration, accreditation pipeline) — declared out of scope.
- `[RECOMMENDATION — requires CR]` Detailed billing and collections mechanics (invoicing, dunning, late-payment, dispute resolution) — declared out of scope.
- `[RECOMMENDATION — requires CR]` Demand planning / project-optimization consulting / cross-training scheduling — declared adjacent businesses, not entered.

### Derivation Bridge (Business → System)

| Business UC | Automation | Derives System UC(s) | Notes |
|---|---|---|---|
| BUC-001 Onboard Worker | Full | UC-001 | Worker self-service registration |
| BUC-002 Onboard Contractor | Full | UC-002 | Contractor self-service registration |
| BUC-003 Manage Project Lifecycle | Full | UC-003, UC-015 | Project creation and closure |
| BUC-004 Broker Worker to Project | Full | UC-004 (incl. matching FR-018, assignment FR-019) | The core brokerage process; matching/assignment are sub-flows |
| BUC-005 Manage Assignment | Full | UC-005, UC-014 | Arrival/departure tracking and termination |
| BUC-006 Capture Hours & Compute Wages | Full | UC-006 (incl. wage computation FR-007) | Hours and wage computation |
| BUC-007 Process Payments | Full | UC-012 (incl. currency FR-022), UC-018 | Financial intermediary flow; AP integration |
| BUC-008 Manage Membership & Fees | Full | UC-008, UC-009 | Membership lifecycle and recurring fees |
| BUC-009 Track CE & Certifications | Full | UC-007 (incl. certification recording FR-009) | CE tracking and certification recording |
| BUC-010 Produce Regulatory Reports | Full | UC-013 | Jurisdiction-specific reporting |
| BUC-011 Handle Exceptions & Fallback | Partial | UC-010, UC-011 | Human judgment retained; channel equivalence (NFR-006) |
| BUC-012 Detect Fraud & Enforce Membership | Partial | UC-017 | Detection in scope; enforcement deferred |

### Volatility → Architectural Input

The following business processes are annotated **Volatility: High** and are architectural input for the SoftwareArchitect — each should be encapsulated in a dedicated component so the volatile policy can evolve without restructuring:

- **BUC-004 Broker Worker to Project** — matching policy (NFR-005, AC-008), fairness objectives.
- **BUC-007 Process Payments** — pricing model (CON-019), currency (FR-022), tax (CON-009).
- **BUC-010 Produce Regulatory Reports** — jurisdiction variation (R003, CON-007).
- **BUC-012 Detect Fraud & Enforce Membership** — detection approach and enforcement response both deferred.

### Traceability

| Element | Traces From | Link Type | Traces To |
|---|---|---|---|
| BUC-001 | FR-001 | Derives | UC-001 |
| BUC-002 | FR-002 | Derives | UC-002 |
| BUC-003 | FR-003, FR-021 | Derives | UC-003, UC-015 |
| BUC-004 | FR-004, FR-018, FR-019 | Derives | UC-004 |
| BUC-005 | FR-005, FR-020 | Derives | UC-005, UC-014 |
| BUC-006 | FR-006, FR-007 | Derives | UC-006 |
| BUC-007 | FR-014, FR-022, FR-017 | Derives | UC-012, UC-018 |
| BUC-008 | FR-010, FR-011 | Derives | UC-008, UC-009 |
| BUC-009 | FR-008, FR-009 | Derives | UC-007 |
| BUC-010 | FR-015 | Derives | UC-013 |
| BUC-011 | FR-012, FR-013 | Derives | UC-010, UC-011 |
| BUC-012 | FR-016, CON-005 | Derives | UC-017 |

## Traceability

| Element | Traces From | Link Type | Traces To |
|---|---|---|---|
| UC-001 | FR-001 | Derives | — |
| UC-002 | FR-002 | Derives | — |
| UC-003 | FR-003 | Derives | — |
| UC-004 | FR-004, FR-018, FR-019 | Derives | — |
| UC-005 | FR-005 | Derives | — |
| UC-006 | FR-006, FR-007 | Derives | — |
| UC-007 | FR-008, FR-009 | Derives | — |
| UC-008 | FR-010 | Derives | — |
| UC-009 | FR-011 | Derives | — |
| UC-010 | FR-012 | Derives | — |
| UC-011 | FR-013 | Derives | — |
| UC-012 | FR-014, FR-022 | Derives | — |
| UC-013 | FR-015 | Derives | — |
| UC-014 | FR-020 | Derives | — |
| UC-015 | FR-021 | Derives | — |
| UC-016 | FR-023 | Derives | — |
| UC-017 | FR-016 | Derives | — |
| UC-018 | FR-017 | Derives | — |
| UC-019 | FR-024 | Derives | — |
| UC-020 | FR-025 | Derives | — |
| UC-021 | FR-026 | Derives | — |
