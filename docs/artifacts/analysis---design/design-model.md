## Document Control
| Field | Value |
|---|---|
| Phase | Elaboration |
| Status | Draft — iteration 2 (Design stage) |
| Milestone Target | End-of-Elaboration review (Lifecycle Architecture Milestone) |

**Iteration 2 finding resolution (Design Model#F1 / #F3, #F2 / #F7):**
- O/R Mapping "Design Class" column relabeled to entity analysis-class IDs (ACL-013..ACL-023), aligned with the Data Model Traceability — no service-class (CLS) IDs remain in the persistent-class column.
- `HoursEntry.hoursWorked` typed `string` (exact decimal), never `float64` — consistent with ADR-004 and the Data Model's `NUMERIC(6,2)`.
## Design Overview

This Design Model realizes the architecturally significant use cases identified in the Software Architecture Document (SAD) Use-Case View: **UC-004 Request Workers**, **UC-012 Process Payments**, **UC-013 Produce Regulatory Reports**, **UC-014 Terminate Worker Assignment**. These four use cases exercise every architectural view and are the validation anchor for the design.

The design operates strictly within the subsystem boundaries the SAD baselined (COMP-001..COMP-009, I1..I4). Analysis classes (Domain Model) map to those subsystems; design classes with full signatures are elaborated in Design Packages and Classes; the collaborations that realize each use case are specified in Use-Case Realizations; the subsystem-boundary contracts are specified in Interface Contracts.

**Binding design guidelines inherited from the SAD** (must hold in every downstream artifact):
1. Interface-bounded modules — no module depends on another's internals.
2. Money is a value object, never a bare number (ADR-004) — a bare float on any monetary path is a critical defect.
3. Decompose by change, not by feature.
4. Configuration over code for jurisdiction rules (CON-007).
5. Channel equivalence (NFR-006) — self-service and representative console reach the same orchestration.
6. No distributed transaction coordination (ADR-001, CON-021).
7. Exact numeric columns never degrade to float (ADR-004).
8. Append-only for financial and assignment transactions (REQ-003, AC-006).

**Technology stack (stakeholder-declared, REQ-029):** Node.js on the current LTS line with TypeScript; PostgreSQL (latest); Keycloak over OIDC. Design class signatures use TypeScript idioms consistent with this stack; no library type is pinned beyond what the stakeholder declared.

## Domain Model

The analysis classes below are the behavioral decomposition of the four architecturally significant use cases into boundary, control, and entity classes. They are the bridge from the Use-Case Model's flows to the SAD's subsystem interfaces. Each control class maps to a subsystem's encapsulated decision; each entity maps to a persistent business object (already seeded in the Business Object Model).

```plantuml
@startuml
skinparam classAttributeIconSize 0
title TradeMe — Analysis Classes (UC-004, UC-012, UC-013, UC-014)

package "Boundary" {
  class "RequestWorkersForm" <<boundary>> {
    submitRequest(project, needs, preferences)
  }
  class "TerminationRequestForm" <<boundary>> {
    submitTermination(assignment, cause)
  }
  class "PaymentRunScheduler" <<boundary>> {
    triggerPaymentRun()
  }
  class "ReportingScheduler" <<boundary>> {
    triggerReporting(jurisdiction)
  }
}

package "Control" {
  class "MatchingController" <<control>> {
    match(request)
    select(candidates)
  }
  class "MatchingPolicy" <<control>> {
    select(candidates, preferences)
  }
  class "AssignmentController" <<control>> {
    commitAssignment(match)
    verifyAvailability(worker)
  }
  class "TerminationController" <<control>> {
    verifyTermination(request)
    terminate(assignment)
  }
  class "WageComputation" <<control>> {
    computeWages(hours, rate)
  }
  class "PricingModel" <<control>> {
    applyMargin(amount)
    applyTax(amount, jurisdiction)
    convert(amount, from, to)
  }
  class "PaymentController" <<control>> {
    runPayment(window)
  }
  class "ReportingController" <<control>> {
    produceReport(jurisdiction, window)
  }
}

package "Entity" {
  class "Worker" <<entity>> {
    workerId
    trades
    certifications
    availability
    expectedRate
  }
  class "Contractor" <<entity>> {
    contractorId
    membershipStatus
  }
  class "Project" <<entity>> {
    projectId
    requiredTrades
    billRate
    status
  }
  class "WorkerRequest" <<entity>> {
    requestId
    needs
    preferences
    status
  }
  class "Assignment" <<entity>> {
    assignmentId
    startDate
    endDate
    status
  }
  class "Availability" <<entity>> {
    workerId
    status
  }
  class "HoursEntry" <<entity>> {
    hoursEntryId
    date
    hoursWorked
  }
  class "Payment" <<entity>> {
    paymentId
    amount
    direction
  }
  class "RegulatoryReport" <<entity>> {
    reportId
    jurisdiction
    cadence
  }
  class "JurisdictionConfig" <<entity>> {
    jurisdictionId
    rules
  }
  class "Certification" <<entity>> {
    certificationId
    authority
    renewalCadence
  }
}

RequestWorkersForm --> MatchingController
MatchingController --> MatchingPolicy
MatchingController --> WorkerRequest
MatchingPolicy --> Worker
MatchingController --> AssignmentController
AssignmentController --> Availability
AssignmentController --> Assignment
Assignment --> Worker
Assignment --> Project
WorkerRequest --> Project

TerminationRequestForm --> TerminationController
TerminationController --> Assignment
TerminationController --> Availability

PaymentRunScheduler --> PaymentController
PaymentController --> HoursEntry
HoursEntry --> WageComputation
WageComputation --> PricingModel
PricingModel --> JurisdictionConfig
PaymentController --> Payment

ReportingScheduler --> ReportingController
ReportingController --> JurisdictionConfig
ReportingController --> RegulatoryReport
RegulatoryReport --> Payment
RegulatoryReport --> HoursEntry
RegulatoryReport --> Certification

Worker --> Certification
Contractor --> Project
@enduml
```

### Analysis Class Responsibilities

| ID | Class | Stereotype | Responsibility | Maps To (SAD) |
|---|---|---|---|---|
| ACL-001 | RequestWorkersForm | boundary | Captures contractor's worker request (project, needs, preferences) on the self-service or representative channel | Presentation → Application |
| ACL-002 | TerminationRequestForm | boundary | Captures termination request with verifiable cause | Presentation → Application |
| ACL-003 | PaymentRunScheduler | boundary | Time trigger for the scheduled payment run | Scheduler (I2) |
| ACL-004 | ReportingScheduler | boundary | Time trigger for jurisdiction-specific reporting cadence | Scheduler (I2) |
| ACL-005 | MatchingController | control | Orchestrates match→select→commit; the UC-004 flow | COMP-001 (IMatching) |
| ACL-006 | MatchingPolicy | control | Deterministic, explainable, configurable selection (NFR-005, AC-008) | COMP-001 (IMatching) |
| ACL-007 | AssignmentController | control | Atomic availability check + commitment (NFR-008, AC-005, CON-013) | COMP-007 (IAssignment) |
| ACL-008 | TerminationController | control | Verifies termination cause; releases worker; records deviation (CON-013) | COMP-007 (IAssignment) |
| ACL-009 | WageComputation | control | Computes wages from hours and rates (FR-007) | COMP-002 (IPricing) |
| ACL-010 | PricingModel | control | Margin, tax withholding, currency conversion (CON-004, CON-009, FR-022) | COMP-002 (IPricing) |
| ACL-011 | PaymentController | control | Orchestrates the payment run (UC-012) | COMP-002 (IPricing) |
| ACL-012 | ReportingController | control | Assembles jurisdiction-configured reports (CON-007, CON-014) | COMP-003 (IReporting) |
| ACL-013 | Worker | entity | Worker identity, trades, certifications, availability, expected rate | COMP-008 (IParty) |
| ACL-014 | Contractor | entity | Contractor identity, membership status | COMP-008 (IParty) |
| ACL-015 | Project | entity | Project listing: trades, bill rate, status | COMP-009 (IProject) |
| ACL-016 | WorkerRequest | entity | A contractor's request for workers (needs, preferences, status) | COMP-001 (IMatching) |
| ACL-017 | Assignment | entity | The commitment between worker and project (CON-013) | COMP-007 (IAssignment) |
| ACL-018 | Availability | entity | Worker availability ledger — the serialized race point (NFR-008) | COMP-007 (IAssignment) |
| ACL-019 | HoursEntry | entity | Recorded hours against an assignment | COMP-002 (IPricing) |
| ACL-020 | Payment | entity | Financial transaction (append-only, tamper-evident) | COMP-002 (IPricing) |
| ACL-021 | RegulatoryReport | entity | Produced report per jurisdiction/cadence | COMP-003 (IReporting) |
| ACL-022 | JurisdictionConfig | entity | Jurisdiction rules (tax, wage floors, reporting) — configuration, not code | Configuration (I3) |
| ACL-023 | Certification | entity | Worker credential with authority and renewal cadence | COMP-005 (ITaxonomy) |

### Design Mechanism Resolution

Each analysis mechanism from the SAD is resolved to a design mechanism (pattern + properties). No product is named where the stakeholder did not declare one.

| Analysis Mechanism | Design Mechanism (pattern) | Properties It Must Hold |
|---|---|---|
| Availability race (NFR-008) | Atomic availability check — row lock on the Availability ledger inside COMP-007; single availability ledger as fallback | Exactly one assignment committed; the other request reverts to matching; no inconsistent state (AC-005) |
| Money (ADR-004) | Money value object — exact amount + currency; same-currency arithmetic only; explicit conversion records rate + moment | No bare float on any monetary path; two edges closed (DB driver + JSON) |
| Matching policy (NFR-005) | Strategy pattern — MatchingPolicy is a configurable, published, deterministic selection strategy | Policy adjustable via configuration, not code (AC-008); selection transparent |
| Jurisdiction rules (NFR-003) | Configuration-as-data — JurisdictionConfig is the single source of jurisdiction rules | New jurisdiction added via configuration alone (AC-001) |
| Audit (REQ-003) | Append-only event log for financial and assignment transactions | Tamper-evident, correctly-ordered (AC-006) |

## Use-Case Realizations

Each architecturally significant use case is realized as a collaboration of design classes (full signatures) across the subsystem interfaces the SAD baselined. The sequence diagrams below are the formal contract the Implementer translates into code. They refine the SAD's Logical-view realizations to design-class granularity: concrete service classes, strategy interfaces, value objects, and the availability ledger.

### SEQ-001 — UC-004 Request Workers (match→assign, race resolution)

```plantuml
@startuml
title SEQ-001 UC-004 Request Workers — Design-Level Realization

actor "Contractor" as C
participant "RequestWorkersController\n(application)" as CTL
participant "MatchingService\n(COMP-001)" as MATCH
participant "MatchingPolicy\n(strategy)" as POL
participant "PartyService\n(COMP-008)" as PARTY
participant "AssignmentService\n(COMP-007)" as ASSIGN
database "AvailabilityLedger\n(PostgreSQL)" as DB

C -> CTL : requestWorkers(projectId, needs, preferences)
CTL -> MATCH : match(request: WorkerRequest): Candidate[]
MATCH -> PARTY : availableWorkers(trades: Trade[], location: GeoArea): Worker[]
PARTY --> MATCH : candidates
MATCH -> POL : select(candidates: Candidate[], preferences: Preference[]): Worker
POL --> MATCH : bestWorker
MATCH --> CTL : bestCandidate

CTL -> ASSIGN : commitAssignment(match: Match): Assignment
ASSIGN -> DB : BEGIN
ASSIGN -> DB : lockAvailability(workerId)  // SELECT ... FOR UPDATE
alt worker available
  ASSIGN -> DB : insertAssignment(assignment)
  ASSIGN -> DB : updateAvailability(workerId, ASSIGNED)
  ASSIGN -> DB : COMMIT
  ASSIGN --> CTL : assignment
  CTL --> C : assignment confirmed
else worker taken (race NFR-008)
  ASSIGN -> DB : ROLLBACK
  ASSIGN --> CTL : WorkerUnavailable
  CTL -> MATCH : match(request)  // re-match (FR-019)
  MATCH --> CTL : nextCandidate
end
@enduml
```

**Design decisions:**
- `MatchingPolicy` is a Strategy interface (CLS-002) with two concrete strategies — `FirstAcceptableMatchPolicy` and `PreferenceWeightedPolicy` — selected by configuration (AC-008, NFR-005). The policy is injected into `MatchingService`, not hard-coded.
- The availability race (NFR-008, AC-005) is resolved inside `AssignmentService.commitAssignment` via a row lock on the `AvailabilityLedger` (`SELECT ... FOR UPDATE`). Exactly one assignment commits; the losing request reverts to matching (FR-019).
- `WorkerRequest` carries the contractor's needs and preferences; preferences are soft signals (CON-006), never hard exclusions.

### SEQ-002 — UC-012 Process Payments (financial intermediary)

```plantuml
@startuml
title SEQ-002 UC-012 Process Payments — Design-Level Realization

actor "Scheduler\n(I2)" as T
participant "PaymentController\n(application)" as CTL
participant "AssignmentService\n(COMP-007)" as ASSIGN
participant "PricingService\n(COMP-002)" as PRICE
participant "TaxCalculator\n(jurisdiction)" as TAX
participant "CurrencyConverter" as FX
participant "IntegrationGateway\n(COMP-006)" as INT
database "PostgreSQL" as DB

T -> CTL : paymentRun(window: Period)
CTL -> ASSIGN : hoursForPeriod(window: Period): HoursEntry[]
ASSIGN --> CTL : hoursEntries
CTL -> PRICE : computeWages(hours: HoursEntry[], rates: Rate[]): Money[]
PRICE -> PRICE : applyWageFloor(wage, jurisdiction)  // CON-008
PRICE -> PRICE : applyRiskPremium(wage, jurisdiction)  // CON-010
PRICE -> TAX : applyWithholding(wage: Money, jurisdiction: Jurisdiction): Money
PRICE -> FX : convert(amount: Money, to: Currency): Money  // FR-022 if cross-boundary
PRICE --> CTL : wages (Money[])
CTL -> INT : submitPayment(workerId, amount: Money): PaymentReceipt
INT --> CTL : receipt
CTL -> DB : appendPayment(payment)  // append-only audit REQ-003
@enduml
```

**Design decisions:**
- Every monetary amount is a `Money` value object (CLS-008) — exact amount + currency, no bare float (ADR-004). Wage floor (CON-008), risk premium (CON-010), tax withholding (CON-009), and currency conversion (FR-022) are applied in sequence inside `PricingService`.
- `TaxCalculator` is a jurisdiction-strategy interface (CLS-010); `JurisdictionTaxCalculator` reads rules from the Configuration subsystem (I3), not from code (CON-007).
- `CurrencyConverter` records the `ExchangeRate` (rate + moment applied) — conversion is explicit and auditable (ADR-004).
- Payment records are appended, never updated in place (REQ-003, AC-006).

### SEQ-003 — UC-013 Produce Regulatory Reports (jurisdiction-configured)

```plantuml
@startuml
title SEQ-003 UC-013 Produce Regulatory Reports — Design-Level Realization

actor "Scheduler\n(I2)" as T
participant "ReportingController\n(application)" as CTL
participant "ReportingService\n(COMP-003)" as REP
participant "ConfigurationService\n(I3)" as CFG
database "PostgreSQL" as DB

T -> CTL : reportingCadence(jurisdiction: Jurisdiction)
CTL -> REP : produceReport(jurisdiction: Jurisdiction, window: Period): RegulatoryReport
REP -> CFG : reportingRules(jurisdiction): ReportingRules
CFG --> REP : format, cadence, fields (CON-007)
REP -> DB : laborActivity(window)
REP -> DB : paymentFlows(window)
REP -> DB : certificationStatus(window)
REP -> DB : taxWithholding(window)
REP -> REP : assembleReport(rules, data)
REP --> CTL : report
CTL -> CTL : deliverOnCadence(report)
@enduml
```

**Design decisions:**
- Reporting rules (format, cadence, fields) come from the Configuration subsystem (I3) — a new jurisdiction's reporting is configuration, not code (AC-001, NFR-003, CON-007).
- The report assembles four data families (labor activity, payment flows, certification status, tax withholding) from the retained-data store (CON-015).

### SEQ-004 — UC-014 Terminate Worker Assignment (contracts-must-be-honored)

```plantuml
@startuml
title SEQ-004 UC-014 Terminate Worker Assignment — Design-Level Realization

actor "Contractor / Rep" as C
participant "TerminationController\n(application)" as CTL
participant "AssignmentService\n(COMP-007)" as ASSIGN
database "PostgreSQL" as DB

C -> CTL : terminateAssignment(assignmentId, cause: TerminationCause)
CTL -> ASSIGN : terminate(assignmentId, cause): TerminationResult
ASSIGN -> ASSIGN : validateCause(cause)  // CON-006, CON-013
alt verifiable cause
  ASSIGN -> DB : removeFromActive(assignmentId)
  ASSIGN -> DB : updateAvailability(workerId, AVAILABLE)
  ASSIGN -> DB : appendTermination(termination)  // record deviation CON-013
  ASSIGN --> CTL : terminated
  CTL --> C : termination confirmed
else no verifiable cause
  ASSIGN --> CTL : Rejected (CON-006, CON-013)
  CTL --> C : termination rejected
end
@enduml
```

**Design decisions:**
- `TerminationCause` carries a `verifiable` flag; a termination without a verifiable cause is rejected (CON-006, CON-013). Casual termination for better pay is not a path the design enables.
- The termination is appended (deviation from commitment recorded, CON-013) and the worker's availability is released to `AVAILABLE` in the same transaction.

## Design Packages and Classes
Design classes with full signatures, organized by subsystem package. Each subsystem exposes an interface; concrete classes implement it. Dependencies cross subsystem boundaries only through interfaces (SAD guideline 1).

### Matching (COMP-001) + Assignment (COMP-007)

```plantuml
@startuml
skinparam classAttributeIconSize 0
title Design Classes — Matching (COMP-001) + Assignment (COMP-007)

package "matching (COMP-001)" {
  interface IMatching {
    + match(request: WorkerRequest): Candidate[]
    + select(candidates: Candidate[], preferences: Preference[]): Worker
  }
  class MatchingService implements IMatching {
    - policy: MatchingPolicy
    - partyService: IParty
    + match(request: WorkerRequest): Candidate[]
    + select(candidates: Candidate[], preferences: Preference[]): Worker
  }
  interface MatchingPolicy {
    + select(candidates: Candidate[], preferences: Preference[]): Worker
  }
  class FirstAcceptableMatchPolicy implements MatchingPolicy {
    + select(candidates: Candidate[], preferences: Preference[]): Worker
  }
  class PreferenceWeightedPolicy implements MatchingPolicy {
    + select(candidates: Candidate[], preferences: Preference[]): Worker
  }
  class Candidate {
    + workerId: string
    + score: number
    + trades: Trade[]
  }
  class WorkerRequest {
    + requestId: string
    + projectId: string
    + needs: TradeNeed[]
    + preferences: Preference[]
    + status: RequestStatus
  }
}

package "assignment (COMP-007)" {
  interface IAssignment {
    + commitAssignment(match: Match): Assignment
    + terminate(assignmentId: string, cause: TerminationCause): TerminationResult
    + hoursForPeriod(window: Period): HoursEntry[]
  }
  class AssignmentService implements IAssignment {
    - availabilityLedger: AvailabilityLedger
    + commitAssignment(match: Match): Assignment
    + terminate(assignmentId: string, cause: TerminationCause): TerminationResult
    + hoursForPeriod(window: Period): HoursEntry[]
  }
  class AvailabilityLedger {
    + lockAvailability(workerId: string): void
    + updateAvailability(workerId: string, status: AvailabilityStatus): void
  }
  class Assignment {
    + assignmentId: string
    + workerId: string
    + projectId: string
    + startDate: Date
    + endDate: Date
    + status: AssignmentStatus
  }
  class TerminationCause {
    + reason: string
    + verifiable: boolean
  }
}

MatchingService ..> IParty : uses
MatchingService --> MatchingPolicy
MatchingService --> WorkerRequest
AssignmentService --> AvailabilityLedger
AssignmentService --> Assignment
@enduml
```

### Pricing & Settlement (COMP-002)

```plantuml
@startuml
skinparam classAttributeIconSize 0
title Design Classes — Pricing & Settlement (COMP-002)

package "pricing (COMP-002)" {
  interface IPricing {
    + computeWages(hours: HoursEntry[], rates: Rate[]): Money[]
    + convert(amount: Money, to: Currency): Money
    + recordRateAdjustment(partyId: string, rate: Rate): void
  }
  class PricingService implements IPricing {
    - taxCalculator: TaxCalculator
    - currencyConverter: CurrencyConverter
    - jurisdictionConfig: IConfiguration
    + computeWages(hours: HoursEntry[], rates: Rate[]): Money[]
    + convert(amount: Money, to: Currency): Money
    + recordRateAdjustment(partyId: string, rate: Rate): void
  }
  class Money {
    + amount: string
    + currency: Currency
    + add(other: Money): Money
    + subtract(other: Money): Money
    + convert(rate: ExchangeRate): Money
  }
  class ExchangeRate {
    + from: Currency
    + to: Currency
    + rate: string
    + appliedAt: Date
  }
  interface TaxCalculator {
    + applyWithholding(wage: Money, jurisdiction: Jurisdiction): Money
  }
  class JurisdictionTaxCalculator implements TaxCalculator {
    + applyWithholding(wage: Money, jurisdiction: Jurisdiction): Money
  }
  class HoursEntry {
    + hoursEntryId: string
    + assignmentId: string
    + date: Date
    + hoursWorked: string
  }
  class Rate {
    + trade: Trade
    + skillLevel: SkillLevel
    + amount: Money
  }
  class Payment {
    + paymentId: string
    + workerId: string
    + amount: Money
    + direction: PaymentDirection
    + recordedAt: Date
  }
}

PricingService --> TaxCalculator
PricingService --> Money
PricingService --> HoursEntry
PricingService --> Payment
Money --> ExchangeRate
@enduml
```

**Design note (ADR-004):** `HoursEntry.hoursWorked` is typed `string` (an exact decimal, e.g. `"7.50"`), not `number`. Hours feed directly into wage computation (`computeWages`), which is a monetary path — a bare float64 there would violate ADR-004. The Data Model stores it as `NUMERIC(6,2)`; the ORM reads it back as a decimal string, never a JavaScript `number`.

### Party (COMP-008) + Project (COMP-009) + Taxonomy (COMP-005)

```plantuml
@startuml
skinparam classAttributeIconSize 0
title Design Classes — Party (COMP-008) + Project (COMP-009) + Taxonomy (COMP-005)

package "party (COMP-008)" {
  interface IParty {
    + registerWorker(worker: WorkerRegistration): Worker
    + registerContractor(contractor: ContractorRegistration): Contractor
    + availableWorkers(trades: Trade[], location: GeoArea): Worker[]
    + membershipStatus(partyId: string): MembershipStatus
  }
  class PartyService implements IParty {
    + registerWorker(worker: WorkerRegistration): Worker
    + registerContractor(contractor: ContractorRegistration): Contractor
    + availableWorkers(trades: Trade[], location: GeoArea): Worker[]
    + membershipStatus(partyId: string): MembershipStatus
  }
  class Worker {
    + workerId: string
    + trades: Trade[]
    + skills: Skill[]
    + certifications: Certification[]
    + geographicAvailability: GeoArea[]
    + expectedRate: Money
    + membershipStatus: MembershipStatus
  }
  class Contractor {
    + contractorId: string
    + membershipStatus: MembershipStatus
  }
  class Membership {
    + membershipId: string
    + partyId: string
    + status: MembershipStatus
    + renewalDate: Date
  }
}

package "project (COMP-009)" {
  interface IProject {
    + createProject(listing: ProjectListing): Project
    + closeProject(projectId: string): void
  }
  class ProjectService implements IProject {
    + createProject(listing: ProjectListing): Project
    + closeProject(projectId: string): void
  }
  class Project {
    + projectId: string
    + contractorId: string
    + requiredTrades: TradeNeed[]
    + billRate: Money
    + location: GeoArea
    + status: ProjectStatus
  }
}

package "taxonomy (COMP-005)" {
  interface ITaxonomy {
    + resolveTrade(tradeId: string): Trade
    + verifyCertification(workerId: string, cert: Certification): VerificationResult
  }
  class TaxonomyService implements ITaxonomy {
    + resolveTrade(tradeId: string): Trade
    + verifyCertification(workerId: string, cert: Certification): VerificationResult
  }
  class Trade {
    + tradeId: string
    + name: string
    + jurisdiction: Jurisdiction
  }
  class Certification {
    + certificationId: string
    + authority: string
    + renewalCadence: Period
  }
}

PartyService --> Worker
PartyService --> Contractor
PartyService --> Membership
ProjectService --> Project
TaxonomyService --> Trade
TaxonomyService --> Certification
Worker --> Certification
Worker --> Trade
@enduml
```

### Assignment Lifecycle — State Machine (CON-013 contracts-must-be-honored)

```plantuml
@startuml
title Assignment Lifecycle — State Machine (CON-013 contracts-must-be-honored)

[*] --> Matched
Matched --> Assigned : commitAssignment (availability verified)
Assigned --> Active : worker arrives (UC-005)
Active --> Departed : worker departs (UC-005)
Departed --> Active : worker returns (UC-005)
Active --> Terminated : terminate (verifiable cause, UC-014)
Departed --> Terminated : terminate (verifiable cause, UC-014)
Assigned --> Terminated : terminate (verifiable cause, UC-014)
Terminated --> [*]

note right of Matched
  Matched: candidate selected, not yet committed.
  The match→assign transition is the serialized race point (NFR-008).
end note

note right of Terminated
  Termination requires a verifiable cause (CON-006, CON-013).
  Casual termination for better pay is rejected.
  Deviation from commitment is recorded (CON-013).
end note
@enduml
```

### Package Organization (modular monolith, Node.js + TypeScript)

```plantuml
@startuml
skinparam packageStyle rectangle
title Design Model — Package Organization (modular monolith, Node.js + TypeScript)

package "src/presentation" {
  package "self-service" as P1
  package "representative-console" as P2
}

package "src/application" {
  package "orchestration" as A1
}

package "src/domain" {
  package "matching (COMP-001)" as D1
  package "pricing (COMP-002)" as D2
  package "reporting (COMP-003)" as D3
  package "fraud (COMP-004)" as D4
  package "taxonomy (COMP-005)" as D5
  package "integration (COMP-006)" as D6
  package "assignment (COMP-007)" as D7
  package "party (COMP-008)" as D8
  package "project (COMP-009)" as D9
}

package "src/infrastructure" {
  package "persistence (I1)" as I1
  package "scheduler (I2)" as I2
  package "configuration (I3)" as I3
  package "security (I4)" as I4
}

P1 --> A1
P2 --> A1
A1 --> D1
A1 --> D2
A1 --> D3
A1 --> D4
A1 --> D5
A1 --> D6
A1 --> D7
A1 --> D8
A1 --> D9
D1 --> D7 : match→assign
D1 --> D8 : availability
D1 --> D5 : trade defs
D2 --> D8 : rates
D2 --> D7 : hours
D7 --> D8 : availability update
D9 --> D5 : trade defs
D1 --> I3 : policy
D2 --> I3 : pricing/tax
D3 --> I3 : reporting rules
D5 --> I3 : taxonomy
D1 --> I1
D2 --> I1
D3 --> I1
D4 --> I1
D6 --> I1
D7 --> I1
D8 --> I1
D9 --> I1
I2 --> A1 : scheduled runs
I4 --> A1 : auth/authz
@enduml
```
## Interface Contracts

The subsystem-boundary interfaces, with operation signatures and pre/postconditions. These are the formal contracts the Implementer codes against; no module depends on another's internals (SAD guideline 1).

### INT-001 — IMatching (COMP-001)

| Operation | Signature | Precondition | Postcondition |
|---|---|---|---|
| match | `match(request: WorkerRequest): Candidate[]` | `request` has valid projectId and non-empty needs | Returns candidates from the available worker population matching the needs |
| select | `select(candidates: Candidate[], preferences: Preference[]): Worker` | `candidates` non-empty | Returns exactly one worker per the configured policy; selection is deterministic and explainable (NFR-005) |

### INT-002 — IAssignment (COMP-007)

| Operation | Signature | Precondition | Postcondition |
|---|---|---|---|
| commitAssignment | `commitAssignment(match: Match): Assignment` | `match` references an available worker | Exactly one assignment committed OR `WorkerUnavailable` returned (race resolved, NFR-008); availability ledger updated atomically |
| terminate | `terminate(assignmentId: string, cause: TerminationCause): TerminationResult` | `assignmentId` references an active assignment | If cause verifiable: assignment terminated, worker released to AVAILABLE, deviation recorded (CON-013); else rejected (CON-006) |
| hoursForPeriod | `hoursForPeriod(window: Period): HoursEntry[]` | `window` is a valid period | Returns all hours entries within the window |

### INT-003 — IPricing (COMP-002)

| Operation | Signature | Precondition | Postcondition |
|---|---|---|---|
| computeWages | `computeWages(hours: HoursEntry[], rates: Rate[]): Money[]` | hours and rates present | Returns wages as Money[] with wage floor (CON-008), risk premium (CON-010), tax withholding (CON-009) applied |
| convert | `convert(amount: Money, to: Currency): Money` | `amount.currency != to` | Returns converted Money; the ExchangeRate (rate + moment) is recorded (ADR-004) |
| recordRateAdjustment | `recordRateAdjustment(partyId: string, rate: Rate): void` | party registered | Rate adjustment recorded; no active price-setting (FR-023) |

### INT-004 — IParty (COMP-008)

| Operation | Signature | Precondition | Postcondition |
|---|---|---|---|
| registerWorker | `registerWorker(worker: WorkerRegistration): Worker` | none | Worker record created; membership initiated |
| registerContractor | `registerContractor(contractor: ContractorRegistration): Contractor` | none | Contractor record created; membership initiated |
| availableWorkers | `availableWorkers(trades: Trade[], location: GeoArea): Worker[]` | trades non-empty | Returns workers available in the location with matching trades |
| membershipStatus | `membershipStatus(partyId: string): MembershipStatus` | party exists | Returns current membership status |

### INT-005 — IProject (COMP-009)

| Operation | Signature | Precondition | Postcondition |
|---|---|---|---|
| createProject | `createProject(listing: ProjectListing): Project` | contractor registered, membership active | Project listing created |
| closeProject | `closeProject(projectId: string): void` | project exists | Project moved to closed state; workers released via termination flow (UC-014); records retained (CON-015) |

### INT-006 — ITaxonomy (COMP-005)

| Operation | Signature | Precondition | Postcondition |
|---|---|---|---|
| resolveTrade | `resolveTrade(tradeId: string): Trade` | tradeId present | Returns the trade definition from configurable taxonomy (CON-018) |
| verifyCertification | `verifyCertification(workerId: string, cert: Certification): VerificationResult` | worker and cert present | Returns verification result; verification strategy deferred (out-of-cycle) |

## Persistent Data Classes
This section (owned by the Database Designer) specifies the O/R mapping from the persistent design classes to the physical tables in the Data Model. It is the bridge the Implementer codes the ORM layer against. Every persistent class maps to exactly one table; identity strategy, loading policy, and type conversions are explicit.

### O/R Mapping Table

The **Design Class** column references the *entity* analysis class (ACL-013..ACL-023) that owns the persistent state — never a service/control class. Service classes (CLS-001..CLS-011) are stateless orchestrators and are not persisted; they are the consumers of these entities, not the entities themselves. This alignment matches the Data Model's Traceability exactly.

| Design Class | Table | Identity Strategy | Loading Policy | Type Conversions |
|---|---|---|---|---|
| Worker (ACL-013) | worker (TBL-001) | UUID, application-generated | Eager: trades, certifications (via junction); Lazy: membership | `expectedRate` → `expected_rate_amount` NUMERIC(19,4) + `expected_rate_currency` CHAR(3) (Money value object, ADR-004) |
| Contractor (ACL-014) | contractor (TBL-002) | UUID, application-generated | Lazy: projects | — |
| Membership (ACL-014) | membership (TBL-003) | UUID, application-generated | Lazy | `fee` → `fee_amount` + `fee_currency` (Money) |
| Project (ACL-015) | project (TBL-004) | UUID, application-generated | Lazy: assignments | `billRate` → `bill_rate_amount` + `bill_rate_currency` (Money); `location` → JSONB (GeoArea value object) |
| Trade (ACL-023) | trade (TBL-005) | UUID, application-generated | Lazy | — |
| Certification (ACL-023) | certification (TBL-006) | UUID, application-generated | Lazy | `renewalCadence` → `renewal_cadence` INTERVAL |
| WorkerTrade (ACL-013) | worker_trade (TBL-007) | Composite (worker_id, trade_id) | Eager from Worker | — |
| WorkerCertification (ACL-013) | worker_certification (TBL-008) | Composite (worker_id, certification_id) | Eager from Worker | — |
| WorkerRequest (ACL-016) | worker_request (TBL-009) | UUID, application-generated | Lazy: assignments | `needs`/`preferences` → JSONB |
| Assignment (ACL-017) | assignment (TBL-010) | UUID, application-generated | Lazy: hours, terminations | `status` → ENUM (state machine, CON-013) |
| Availability (ACL-018) | availability (TBL-011) | UUID, application-generated | Eager (single row per worker) | `status` → ENUM |
| Termination (ACL-017) | termination (TBL-012) | UUID, application-generated | Lazy | `verifiable` → BOOLEAN |
| HoursEntry (ACL-019) | hours_entry (TBL-013) | UUID, application-generated | Lazy | `hoursWorked` → NUMERIC(6,2) (exact decimal, never float — ADR-004) |
| Payment (ACL-020) | payment (TBL-014) | UUID, application-generated | Lazy | `amount` → NUMERIC(19,4) + `currency` CHAR(3) (Money, ADR-004) |
| RateAdjustment (FR-023) | rate_adjustment (TBL-015) | UUID, application-generated | Lazy | `oldRate`/`newRate` → NUMERIC(19,4) + `currency` (Money) |
| ExchangeRate (FR-022) | exchange_rate (TBL-016) | UUID, application-generated | Lazy | `rate` → NUMERIC(19,8) |
| RegulatoryReport (ACL-021) | regulatory_report (TBL-017) | UUID, application-generated | Lazy | `content` → JSONB |
| JurisdictionConfig (ACL-022) | jurisdiction_config (TBL-018) | UUID, application-generated | Eager (cached) | `rules` → JSONB |

### Binding O/R Rules (ADR-004 — Money)

1. **No bare float on any monetary path.** The ORM maps every Money value object to a `NUMERIC(19,4)` amount column + a `CHAR(3)` currency column. The PostgreSQL driver's type handling is configured so `NUMERIC` is returned as a string/decimal, never a JavaScript `number` (which is a float64). A monetary column read back as a floating-point number is a critical defect.
2. **JSON boundary.** Amounts crossing the API boundary are serialized/parsed as strings, never through a floating-point representation.
3. **Append-only tables** (`payment`, `termination`, `rate_adjustment`, `exchange_rate`, `regulatory_report`) are mapped with no update/delete operations exposed in the repository — the ORM layer only ever inserts and reads them.

### Availability Race Mapping (NFR-008, AC-005)

The `availability` table is the serialized race point. The ORM exposes a single operation — `lockAvailability(workerId)` — that issues `SELECT ... FOR UPDATE` on the worker's availability row inside the assignment transaction. No other code path reads or writes `availability.status` outside this lock. This is the one place the ORM exposes a raw lock; everywhere else it uses the repository abstraction.
## Boundary Classes and Navigation Map

This section (owned by the User Interface Designer) defines the user-interface realization of the use cases: the UI view/controller classes and the formal Navigation Topology. It is the bridge from the Use-Case Model's flows and the UI Prototype's storyboards to the Implementer's screens. The Designer's class-level realization (Design Packages and Classes) and the Database Designer's O/R mapping (Persistent Data Classes) are upstream; this section consumes them and adds the user-facing layer.

### UI View & Controller Classes

The UI layer is decomposed into `<<view>>` classes (what the user sees) and `<<controller>>` classes (what the user's actions trigger). A single `NavigationController` is the authority for screen transitions — it realizes the Navigation Topology state machine below, so every transition guard (role, authentication, race resolution) is enforced in exactly one place, never duplicated across views.

```plantuml
@startuml
skinparam classAttributeIconSize 0
title TradeMe — UI View & Controller Classes (Navigation Map)

package "UI Views (<<view>>)" {
  class LandingView <<view>>
  class LoginView <<view>>
  class WorkerRegistrationView <<view>>
  class WorkerDashboardView <<view>>
  class AvailableMatchesView <<view>>
  class AssignmentDetailView <<view>>
  class RecordHoursView <<view>>
  class ContractorDashboardView <<view>>
  class CreateProjectView <<view>>
  class RequestWorkersView <<view>>
  class RepresentativeConsoleView <<view>>
  class ExceptionQueueView <<view>>
}

package "UI Controllers (<<controller>>)" {
  class NavigationController <<controller>> {
    + route(screen: Screen, event: UserAction): Screen
  }
  class WorkerRegistrationController <<controller>> {
    + submitRegistration(form: WorkerRegistrationForm): void
  }
  class RequestWorkersController <<controller>> {
    + submitRequest(projectId, needs, preferences): void
  }
  class RecordHoursController <<controller>> {
    + submitHours(assignmentId, date, hours): void
  }
  class RepresentativeConsoleController <<controller>> {
    + openCase(caseId): void
    + mirrorOperation(operation): void
  }
}

LandingView --> NavigationController
LoginView --> NavigationController
WorkerDashboardView --> NavigationController
ContractorDashboardView --> NavigationController
RepresentativeConsoleView --> NavigationController

WorkerRegistrationController --> WorkerRegistrationView
RequestWorkersController --> RequestWorkersView
RecordHoursController --> RecordHoursView
RepresentativeConsoleController --> ExceptionQueueView

note right of NavigationController
  NavigationController is the single authority
  for screen transitions — it realizes the
  Navigation Topology state machine. Every
  transition guard (role, auth, race) is
  enforced here, not in the views.
end note

note bottom of RepresentativeConsoleController
  Channel equivalence (NFR-006): mirrorOperation
  reuses the SAME controllers as self-service
  (RequestWorkersController, RecordHoursController),
  so the representative console is a superset,
  not a divergent UI.
end note
@enduml
```

### UI View/Controller Responsibilities

| ID | Class | Stereotype | Responsibility | Realizes |
|---|---|---|---|---|
| UIV-001 | LandingView | view | Entry screen; routes to login or registration | UC-001, UC-002 |
| UIV-002 | LoginView | view | Keycloak OIDC sign-in (REQ-001) | REQ-001 |
| UIV-003 | WorkerRegistrationView | view | 5-step worker registration (identity, trades, availability/rate, certifications, review) | UC-001 |
| UIV-004 | WorkerDashboardView | view | Worker home: assignments, matches, hours, certifications, membership | UC-005, UC-006, UC-007, UC-008 |
| UIV-005 | AvailableMatchesView | view | Candidate matches the worker may accept | UC-004 |
| UIV-006 | AssignmentDetailView | view | Active assignment; arrival/departure signals | UC-005 |
| UIV-007 | RecordHoursView | view | Hours entry against an assignment | UC-006 |
| UIV-008 | ContractorDashboardView | view | Contractor home: projects, requests, membership | UC-003, UC-004, UC-008 |
| UIV-009 | CreateProjectView | view | Project listing with per-period trade needs | UC-003 |
| UIV-010 | RequestWorkersView | view | Worker request with needs + soft preferences | UC-004 |
| UIV-011 | RepresentativeConsoleView | view | Representative home: exception queue + fallback | UC-010, UC-011 |
| UIV-012 | ExceptionQueueView | view | Exception cases awaiting human judgment | UC-010 |
| UIC-001 | NavigationController | controller | Single authority for screen transitions; enforces role/auth/race guards | (all user-facing UCs) |
| UIC-002 | WorkerRegistrationController | controller | Submits registration; validates against taxonomy (CON-018) | UC-001 |
| UIC-003 | RequestWorkersController | controller | Submits request; surfaces match/assign/race outcomes | UC-004 |
| UIC-004 | RecordHoursController | controller | Submits hours; surfaces wage computation | UC-006 |
| UIC-005 | RepresentativeConsoleController | controller | Opens cases; mirrors self-service operations (NFR-006) | UC-010, UC-011 |

### Navigation Topology (Formal State Machine)

The Navigation Topology is the formal definition of every screen in the system, the transitions between them, and the guard conditions on each transition. Every screen is a state; every user action causing a screen change is a directed edge with a guard. This model is complete — every screen is reachable, every terminal state (logout, session timeout, error) is explicit, and the race-resolution path (NFR-008) is a reversion, never a dead-end.

```plantuml
@startuml
title TradeMe — Navigation Topology (Self-Service + Representative Console)

state "Landing" as Landing
state "Login (Keycloak OIDC)" as Login
state "Logout" as Logout
state "Session Timeout" as Timeout
state "Error Terminal" as Error

state "Worker Registration" as WReg {
  state "W1 Identity" as WReg1
  state "W2 Trades & Skills" as WReg2
  state "W3 Availability & Rate" as WReg3
  state "W4 Certifications" as WReg4
  state "W5 Review & Confirm" as WReg5
  WReg1 --> WReg2
  WReg2 --> WReg3
  WReg3 --> WReg4
  WReg4 --> WReg5
}

state "Worker Dashboard" as WDash
state "Available Matches" as WMatches
state "Assignment Detail" as WAssign
state "Arrival / Departure" as WArrDep
state "Record Hours" as WHours
state "Certifications & CE" as WCE
state "Worker Membership" as WMember
state "Worker Rate Adjustment" as WRate

state "Contractor Registration" as CReg
state "Contractor Dashboard" as CDash
state "Create Project" as CProject
state "Request Workers" as CRequest
state "Request Result" as CResult
state "Project Detail" as CProjectDetail
state "Close Project" as CClose
state "Contractor Membership" as CMember
state "Contractor Rate Adjustment" as CRate

state "Representative Console" as RepConsole
state "Exception Queue" as RepQueue
state "Case Detail" as RepCase
state "Fallback Operation" as RepFallback

[*] --> Landing
Landing --> Login : "Sign in"
Landing --> WReg : "Register as Worker" [not authenticated]
Landing --> CReg : "Register as Contractor" [not authenticated]

Login --> WDash : [role = worker]
Login --> CDash : [role = contractor]
Login --> RepConsole : [role = representative]
Login --> Error : [auth failure]

WReg --> WDash : [registration complete]
CReg --> CDash : [registration complete]

WDash --> WMatches : "View matches"
WDash --> WAssign : "My assignments"
WDash --> WHours : "Record hours"
WDash --> WCE : "Certifications"
WDash --> WMember : "Membership"
WDash --> WRate : "Adjust rate"

WMatches --> WAssign : [accept assignment — UC-004]
WAssign --> WArrDep : "Signal arrival/departure" [UC-005]
WAssign --> WHours : "Record hours" [UC-006]

CDash --> CProject : "Create project" [UC-003]
CDash --> CRequest : "Request workers" [UC-004]
CDash --> CProjectDetail : "Project detail"
CDash --> CMember : "Membership"
CDash --> CRate : "Adjust rate"

CProject --> CDash : [project created]
CRequest --> CResult : [submit request]
CResult --> CDash : [assigned | awaiting match]
CProjectDetail --> CClose : "Close project" [UC-015]
CProjectDetail --> CRequest : "Request more workers"

RepConsole --> RepQueue : "Exception queue"
RepConsole --> RepFallback : "Assist user" [UC-011]
RepQueue --> RepCase : "Open case"
RepCase --> RepQueue : [resolved | escalated]

WDash --> Logout : "Sign out"
CDash --> Logout : "Sign out"
RepConsole --> Logout : "Sign out"
Logout --> [*]

WDash --> Timeout : [idle > session limit]
CDash --> Timeout : [idle > session limit]
RepConsole --> Timeout : [idle > session limit]
Timeout --> Login : "Re-authenticate"
Timeout --> [*]

Error --> Landing : "Return"
Error --> [*]

note right of WAssign
  Race resolution (NFR-008): if the worker is
  taken between match and assignment, the
  transition reverts to WMatches with a
  "worker no longer available" notice — never
  a dead-end.
end note
@enduml
```

### Navigation Topology — Completeness & Consistency Checks

| Check | Result |
|---|---|
| Every screen reachable from Landing | Yes — all states trace to Landing via Login or registration |
| No dead-end screens | Yes — every screen has an onward transition (back to dashboard, logout, or timeout) |
| Terminal states explicit | Yes — Logout, Session Timeout, Error Terminal are all explicit `[*]` sinks |
| Race-resolution path (NFR-008) | Reversion to WMatches, not a dead-end (see note) |
| Channel equivalence (NFR-006) | Representative Console reuses the same controllers as self-service; no divergent screen set |
| Role guards | Login branches on role (worker/contractor/representative); no cross-role screen access |

### UI Patterns (absorbed from legacy UI Guidelines)

Published here so the Designer (view-class detailing), Implementer (screen building), and Technical Writer (documentation) align on interaction conventions. These are the coordination contract that prevents visual entropy across the team.

| Pattern | Convention | Rationale |
|---|---|---|
| Primary action placement | Primary action (Submit, Next, Confirm) is always bottom-right; Back is bottom-left | Consistency (Nielsen #4); Fitts's Law — primary target is the last thing the eye reaches |
| Destructive actions | Termination, closure, and membership-lapse actions require an explicit confirm step with the consequence stated | Error prevention (Nielsen #5); CON-013 contracts-must-be-honored |
| Race/error feedback | Match→assign race (NFR-008) surfaces as an inline notice "worker no longer available — searching again", never a modal dead-end | Visibility of system status (Nielsen #1); AC-005 |
| Money rendering | Every monetary amount renders as amount + currency symbol, never a bare number; conversion shows the rate + moment applied | ADR-004; REQ-028 |
| Jurisdiction data | Taxonomy, certification, and rate fields render from configuration (CON-018), never hard-coded labels | AC-001; NFR-003 |
| Mobile-first | All screens target mobile rendering first; desktop is a superset | NFR-001, REQ-008 |
| Latency ceiling | Every interactive transition (search/match/register/hours) completes within p95 ≤ 2s | NFR-009, REQ-013 |
| Accessibility | If a stakeholder declares an accessibility standard, every screen honors it; none is declared this cycle, so no standard is imposed | Scope Guard — do not invent a standard |

## Traceability

| Element | Traces From | Link Type | Traces To |
|---|---|---|---|
| ACL-005 MatchingController | UC-004 | Derives | COMP-001 |
| ACL-006 MatchingPolicy | UC-004, NFR-005, AC-008 | Derives | COMP-001 |
| ACL-007 AssignmentController | UC-004, NFR-008, AC-005, CON-013 | Derives | COMP-007 |
| ACL-008 TerminationController | UC-014, CON-013 | Derives | COMP-007 |
| ACL-009 WageComputation | UC-006, FR-007 | Derives | COMP-002 |
| ACL-010 PricingModel | UC-012, CON-004, CON-009, FR-022 | Derives | COMP-002 |
| ACL-011 PaymentController | UC-012 | Derives | COMP-002 |
| ACL-012 ReportingController | UC-013, CON-007, CON-014 | Derives | COMP-003 |
| ACL-013 Worker | UC-001 | Derives | COMP-008 |
| ACL-014 Contractor | UC-002 | Derives | COMP-008 |
| ACL-015 Project | UC-003 | Derives | COMP-009 |
| ACL-016 WorkerRequest | UC-004 | Derives | COMP-001 |
| ACL-017 Assignment | UC-004, CON-013 | Derives | COMP-007 |
| ACL-018 Availability | NFR-008, AC-005 | Derives | COMP-007 |
| ACL-019 HoursEntry | UC-006 | Derives | COMP-002 |
| ACL-020 Payment | UC-012, REQ-003 | Derives | COMP-002 |
| ACL-021 RegulatoryReport | UC-013, CON-014 | Derives | COMP-003 |
| ACL-022 JurisdictionConfig | NFR-003, CON-007, AC-001 | Derives | I3 |
| ACL-023 Certification | UC-007, CON-018 | Derives | COMP-005 |
| CLS-001 MatchingService | UC-004 | Realizes | UC-004 |
| CLS-002 MatchingPolicy | NFR-005, AC-008 | Realizes | UC-004 |
| CLS-003 AssignmentService | NFR-008, AC-005, CON-013 | Realizes | UC-004, UC-014 |
| CLS-004 AvailabilityLedger | NFR-008, AC-005 | Realizes | UC-004 |
| CLS-005 PricingService | CON-004, CON-009, FR-022 | Realizes | UC-012 |
| CLS-006 TaxCalculator | CON-009, CON-007 | Realizes | UC-012 |
| CLS-007 CurrencyConverter | FR-022 | Realizes | UC-012 |
| CLS-008 Money | ADR-004, CON-004 | Realizes | UC-012, UC-006 |
| CLS-009 PartyService | UC-001, UC-002 | Realizes | UC-001, UC-002 |
| CLS-010 ProjectService | UC-003 | Realizes | UC-003 |
| CLS-011 TaxonomyService | CON-018 | Realizes | UC-001, UC-003 |
| INT-001 IMatching | UC-004 | Specifies | COMP-001 |
| INT-002 IAssignment | UC-004, UC-014 | Specifies | COMP-007 |
| INT-003 IPricing | UC-012 | Specifies | COMP-002 |
| INT-004 IParty | UC-001, UC-002 | Specifies | COMP-008 |
| INT-005 IProject | UC-003 | Specifies | COMP-009 |
| INT-006 ITaxonomy | CON-018 | Specifies | COMP-005 |
| SEQ-001 | UC-004 | Realizes | UC-004 |
| SEQ-002 | UC-012 | Realizes | UC-012 |
| SEQ-003 | UC-013 | Realizes | UC-013 |
| SEQ-004 | UC-014 | Realizes | UC-014 |
| TBL-001 worker | ACL-013 | Specifies | CLS-009 |
| TBL-002 contractor | ACL-014 | Specifies | CLS-009 |
| TBL-003 membership | ACL-014, FR-010, FR-011 | Specifies | COMP-008 |
| TBL-004 project | ACL-015 | Specifies | CLS-010 |
| TBL-005 trade | ACL-023, CON-018 | Specifies | CLS-011 |
| TBL-006 certification | ACL-023, CON-018 | Specifies | CLS-011 |
| TBL-007 worker_trade | ACL-013, CON-018 | Specifies | COMP-008 |
| TBL-008 worker_certification | ACL-013, CON-018 | Specifies | COMP-008 |
| TBL-009 worker_request | ACL-016 | Specifies | CLS-001 |
| TBL-010 assignment | ACL-017, CON-013 | Specifies | CLS-003 |
| TBL-011 availability | ACL-018, NFR-008, AC-005 | Specifies | CLS-004 |
| TBL-012 termination | ACL-017, CON-013, REQ-003 | Specifies | CLS-003 |
| TBL-013 hours_entry | ACL-019 | Specifies | CLS-005 |
| TBL-014 payment | ACL-020, REQ-003, ADR-004 | Specifies | CLS-005 |
| TBL-015 rate_adjustment | FR-023, CON-019 | Specifies | CLS-005 |
| TBL-016 exchange_rate | FR-022, ADR-004 | Specifies | CLS-007 |
| TBL-017 regulatory_report | ACL-021, CON-014 | Specifies | COMP-003 |
| TBL-018 jurisdiction_config | ACL-022, NFR-003, AC-001 | Specifies | I3 |
| UIV-001 LandingView | UC-001, UC-002 | Derives | UIC-001 |
| UIV-002 LoginView | REQ-001 | Derives | Keycloak OIDC |
| UIV-003 WorkerRegistrationView | UC-001, FR-001 | Derives | UIC-002 |
| UIV-004 WorkerDashboardView | UC-005, UC-006, UC-007, UC-008 | Derives | UIC-001 |
| UIV-005 AvailableMatchesView | UC-004 | Derives | UIC-001 |
| UIV-006 AssignmentDetailView | UC-005 | Derives | UIC-001 |
| UIV-007 RecordHoursView | UC-006 | Derives | UIC-004 |
| UIV-008 ContractorDashboardView | UC-003, UC-004, UC-008 | Derives | UIC-001 |
| UIV-009 CreateProjectView | UC-003 | Derives | UIC-001 |
| UIV-010 RequestWorkersView | UC-004 | Derives | UIC-003 |
| UIV-011 RepresentativeConsoleView | UC-010, UC-011 | Derives | UIC-005 |
| UIV-012 ExceptionQueueView | UC-010 | Derives | UIC-005 |
| UIC-001 NavigationController | (all user-facing UCs) | Realizes | Navigation Topology |
| UIC-002 WorkerRegistrationController | UC-001, CON-018 | Realizes | UC-001 |
| UIC-003 RequestWorkersController | UC-004, NFR-008 | Realizes | UC-004 |
| UIC-004 RecordHoursController | UC-006, FR-007 | Realizes | UC-006 |
| UIC-005 RepresentativeConsoleController | UC-010, UC-011, NFR-006 | Realizes | UC-010, UC-011 |
| Navigation Topology | NFR-002, NFR-001, REQ-008 | Derives | UC-001..UC-016 |
| UI Patterns | NFR-006, NFR-009, ADR-004, CON-018 | Derives | (all UI views) |
