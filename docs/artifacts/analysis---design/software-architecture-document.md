## Document Control
| Field | Value |
|---|---|
| Phase | Elaboration |
| Status | Draft — iteration 1 (baselined architecture) |
| Milestone Target | End-of-Elaboration review (Lifecycle Architecture Milestone) |

## Architectural Representation

This document presents the **baselined architecture** for the TradeMe marketplace front door. Per RUP Elaboration, this is the complete 4+1 model — every view elaborated, every subsystem interface specified, every design mechanism derived from its analysis mechanism. The Inception candidate sketch is superseded by this baseline.

The architecture is represented using the 4+1 view model. The Use-Case view (UC-004, UC-012, UC-013, UC-014) is the validation anchor; every other view is traceable to a scenario from one of these architecturally significant use cases. The Logical view is the primary decomposition; the Process view resolves concurrency; the Deployment view maps executables to nodes; the Implementation view organizes source; the Data view constrains persistence.

## Architectural Goals and Constraints

**Goals** (trace to Business Goals):
- **BG-001** — expand to UK, Ireland, Canada via an automated front door → configuration-driven jurisdiction (CON-007, NFR-003), not per-country code.
- **BG-002** — replace 220 representatives with self-service → channel equivalence (NFR-006) between self-service and the fallback representative console.

**Binding constraints** (trace to declared constraints):
- **CON-021** — throughput is NOT a binding constraint. This is the single most important architectural input: it forbids over-engineering for scale and directly shapes the architectural-style decision (ADR-001).
- **CON-022** — operable by a small team, maintainable over a long horizon. Forbids heavyweight distributed infrastructure.
- **CON-017** — multi-tenant default, single-tenant where residency requires (CON-016). Both topologies from the same software, chosen at deployment time.
- **CON-018 / CON-019** — taxonomy and pricing model are evolvable configurable data, not hard-coded.
- **CON-020** — legacy operates alongside; no historical data migration.

**Declared technology stack** (stakeholder decision, iteration 1):
- Application runtime: **Node.js on the current LTS line, with TypeScript**.
- Data store: **PostgreSQL (latest)**.
- Identity provider: **Keycloak over OIDC**, with the provider chosen at deployment time through configuration.

**Risk-driven priorities** (trace to Risk List):
- **R003** (multi-jurisdiction) → configuration-driven compliance is the central architectural mechanism.
- **R005** (availability race) → the match→assign transition is an atomic availability check (COMP-007).
- **R004** (matching policy capture) → matching policy is a configurable, explainable component (COMP-001).

### Design Mechanisms

Each analysis mechanism (the *capability* the system needs) is derived to a concrete design mechanism (the *solution shape* that provides it, with the properties it must hold). A product name appears only where the stakeholder declared one; otherwise the mechanism stays at the capability/property level and the product choice is a downstream decision, not an architectural one.

| Analysis Mechanism | Design Mechanism | Properties It Must Hold | Product (if declared) |
|---|---|---|---|
| Persistence | Relational store with exact-numeric columns, append-only audit, retention, residency scoping | Tamper-evident audit (REQ-003); retention window honored (CON-015); residency enforced (CON-016); exact numeric never degrades to float (ADR-004) | PostgreSQL (latest) |
| Money | Money value object — exact amount + currency; arithmetic only same-currency; explicit conversion records rate + moment; single rounding policy | No bare float on any monetary path (critical defect); two edges closed: DB driver + JSON (ADR-004) | — |
| Identity & access | OIDC identity provider, deployment-time selection; authorization scoped to own records | Workers/contractors see only their own records (REQ-002); provider chosen at deployment time (CON-017) | Keycloak (OIDC) |
| Concurrency / availability race | Atomic availability check in COMP-007 (row lock on worker availability); single availability ledger as fallback | Exactly one assignment committed; the other request reverts to matching; no inconsistent state (NFR-008, AC-005) | — |
| Jurisdiction configuration | Configuration subsystem (I3) as the single source of jurisdiction rules | A new jurisdiction added via configuration alone, no code change (AC-001, NFR-003) | — |
| Matching policy | Configurable, explainable, deterministic selection in COMP-001 | Policy adjustable via configuration, not code (AC-008); selection transparent (NFR-005) | — |
| Scheduling | Time-triggered scheduler (I2) for fees, payment runs, reports, fraud scans | Recurring and cadence-driven work runs without user initiation | — |
| Integration | Interface-bounded Integration Gateway (COMP-006) | New integrations added without restructuring (NFR-007) | — |
| Audit | Append-only, tamper-evident audit trail for financial and assignment transactions | Complete, correctly-ordered, tamper-evident records (AC-006, REQ-003) | — |

### Design Guidelines

Binding rules for the Designer and Implementer, derived from the mechanisms above. These are the architectural invariants that must hold in every downstream artifact.

1. **Interface-bounded modules.** Every subsystem exposes an interface; no module depends on another's internals. This preserves the option to extract a subsystem into a service later without restructuring (NFR-007).
2. **Money is a value object, never a bare number.** A bare floating-point number anywhere on a monetary path — domain, HTTP boundary, or database read — is a **critical defect**, not a style preference (ADR-004).
3. **Decompose by change, not by feature.** A subsystem encapsulates ONE "Volatility: High" decision. A change to the matching policy touches only COMP-001; a new jurisdiction's reporting rules touch only COMP-003 configuration.
4. **Configuration over code for jurisdiction rules.** No per-jurisdiction code branching (CON-007). Jurisdiction-specific labor law, tax, certification, reporting, and currency are deployment configuration.
5. **Channel equivalence.** Self-service and the representative console reach the same Application orchestration; no separate code path per channel (NFR-006).
6. **No distributed transaction coordination.** The modular monolith keeps concurrency within one process boundary (ADR-001, CON-021). The only serialized point is the match→assign availability check.
7. **Exact numeric columns never degrade to float.** The database driver's type handling is configured so an exact numeric column is never returned as a floating-point number (ADR-004).
8. **Append-only for financial and assignment transactions.** These records are never updated in place; they are appended and verifiable (REQ-003, AC-006).

## Use-Case View

The architecturally significant use cases, prioritized by risk + coverage + criticality, drive the architecture. This prioritized list is the input the Project Manager uses to plan Elaboration iterations.

| Priority | Use Case | Architectural Significance | Risk Addressed |
|---|---|---|---|
| 1 | UC-004 Request Workers (matching + assignment) | Core brokerage; matching policy configurable (NFR-005); availability race (NFR-008) | R004, R005 |
| 2 | UC-012 Process Payments | Financial intermediary; pricing evolvable (CON-019); currency (FR-022); tax (CON-009) | R003 |
| 3 | UC-013 Produce Regulatory Reports | Jurisdiction variation (CON-007); retention (CON-015); audit (AC-006) | R003 |
| 4 | UC-014 Terminate Worker Assignment | Contracts-must-be-honored (CON-013); tamper-evident audit (REQ-003) | R003 |

These four use cases exercise every architectural view: they span the self-service and fallback channels (Process), the matching/pricing/reporting subsystems (Logical), the multi/single-tenant topology (Deployment), and the retained-data store (Data). The sequence diagrams in the Logical and Process views realize UC-004, UC-012, and UC-013 end-to-end.

## Logical View

The system is decomposed into **subsystems that encapsulate areas of change**, not areas of function. Each subsystem corresponds to a "Volatility: High" area identified in the Use-Case Model, or to a stable domain aggregate. Subsystems communicate only through interfaces; no subsystem depends on another's internals.

```plantuml
@startuml
skinparam componentStyle rectangle
title TradeMe — Logical View (Elaboration baseline)

package "Presentation" {
  component "Self-Service Channel\n(Web + Mobile)" as PRES_SS
  component "Representative Console\n(fallback)" as PRES_REP
}

package "Application" {
  component "Use-Case Orchestration\n(UC-001..UC-021)" as APP
}

package "Domain" {
  component "Matching\nCOMP-001" as C1
  component "Pricing & Settlement\nCOMP-002" as C2
  component "Regulatory Reporting\nCOMP-003" as C3
  component "Fraud Detection\nCOMP-004" as C4
  component "Taxonomy & Certification\nCOMP-005" as C5
  component "Integration Gateway\nCOMP-006" as C6
  component "Assignment & Availability\nCOMP-007" as C7
  component "Party & Membership\nCOMP-008" as C8
  component "Project\nCOMP-009" as C9
}

package "Infrastructure" {
  component "Persistence\n(PostgreSQL)" as I1
  component "Scheduler\n(time triggers)" as I2
  component "Configuration\n(jurisdiction rules)" as I3
  component "Security\n(Keycloak OIDC)" as I4
}

interface "IMatching\nmatch() select()" as IF1
interface "IPricing\ncomputeWages() convert()" as IF2
interface "IReporting\nproduceReport()" as IF3
interface "IFraudDetection\nscan()" as IF4
interface "ITaxonomy\nresolveTrade() verifyCert()" as IF5
interface "IIntegration\nsubmitPayment() queryValidator()" as IF6
interface "IAssignment\ncommit() terminate()" as IF7
interface "IParty\nregister() membership()" as IF8
interface "IProject\ncreate() close()" as IF9

C1 ..> IF1 : provides
C2 ..> IF2 : provides
C3 ..> IF3 : provides
C4 ..> IF4 : provides
C5 ..> IF5 : provides
C6 ..> IF6 : provides
C7 ..> IF7 : provides
C8 ..> IF8 : provides
C9 ..> IF9 : provides

PRES_SS --> APP
PRES_REP --> APP

APP --> IF1
APP --> IF2
APP --> IF3
APP --> IF4
APP --> IF5
APP --> IF6
APP --> IF7
APP --> IF8
APP --> IF9

IF1 --> IF7 : match→assign
IF1 --> IF8 : availability
IF1 --> IF5 : trade defs
IF2 --> IF8 : rates
IF2 --> IF7 : hours
IF7 --> IF8 : availability update
IF9 --> IF5 : trade defs

IF1 --> I3 : policy
IF2 --> I3 : pricing/tax
IF3 --> I3 : reporting rules
IF5 --> I3 : taxonomy

IF3 --> I1 : retained data
IF4 --> I1 : retained data
IF6 --> I1
IF7 --> I1
IF8 --> I1
IF9 --> I1

I2 --> APP : scheduled runs
I4 --> APP : auth/authz
@enduml
```

### Subsystem Catalog

| ID | Subsystem | Encapsulated Change (Volatility) | Interface | Key Operations |
|---|---|---|---|---|
| COMP-001 | Matching | Matching policy (NFR-005, AC-008); fairness objectives | IMatching | `match(request) → candidates`, `select(candidates) → best` |
| COMP-002 | Pricing & Settlement | Pricing model (CON-019); currency (FR-022); tax (CON-009); wage floors/premiums (CON-008, CON-010); rate adjustments (FR-023, UC-016) | IPricing | `computeWages(hours, rates)`, `convert(amount, from, to)`, `recordRateAdjustment(party, rate)` |
| COMP-003 | Regulatory Reporting | Jurisdiction variation (R003, CON-007); format/cadence (CON-014) | IReporting | `produceReport(jurisdiction, window)` |
| COMP-004 | Fraud Detection | Detection approach (FR-016, deferred) | IFraudDetection | `scan(patterns) → alerts` |
| COMP-005 | Taxonomy & Certification | Trade/skill taxonomy (CON-018); certification frameworks (CON-018) | ITaxonomy | `resolveTrade(id)`, `verifyCertification(worker, cert)` |
| COMP-006 | Integration Gateway | Integration extensibility (NFR-007); AP systems (FR-017); validators (STK-005) | IIntegration | `submitPayment(contractor)`, `queryValidator(credential)` |
| COMP-007 | Assignment & Availability | Availability race (NFR-008, AC-005); commitment lifecycle (CON-013) | IAssignment | `commitAssignment(match)`, `terminate(assignment)` |
| COMP-008 | Party & Membership | Stable (Low volatility) | IParty | `registerWorker`, `registerContractor`, `membershipStatus` |
| COMP-009 | Project | Stable (Low volatility) | IProject | `createProject`, `closeProject` |

**Decomposition rationale:** COMP-001, COMP-002, COMP-003, COMP-004 each encapsulate a single "Volatility: High" decision from the Use-Case Model. COMP-005 encapsulates the configurable-data constraint (CON-018). COMP-006 encapsulates integration extensibility (NFR-007). COMP-007 encapsulates the race-condition integrity concern (NFR-008). COMP-008 and COMP-009 are stable domain aggregates. No subsystem is named after a feature or a layer — each is named after the *decision it hides*.

**UC-016 mapping note:** UC-016 "Record Rate Adjustments" (FR-023) is realized by COMP-002 Pricing & Settlement. Rate adjustments — contractors raising offered rates on idle projects, workers lowering expected rates when idle — are recorded by the pricing subsystem, which already owns the rate model and the `recordRateAdjustment` interface. The system records these adjustments but does not actively price-set (FR-023); the pricing model's evolvability (CON-019) is the reason this behavior lives in COMP-002 rather than a separate subsystem.

### Use-Case Realizations (sequence diagrams)

The three highest-priority architecturally significant scenarios, realized end-to-end across the subsystem interfaces.

**UC-004 — Request Workers (match→assign, race resolution):**

```plantuml
@startuml
title UC-004 Request Workers — Match→Assign (race resolution)

actor "Contractor" as C
participant "Orchestration\n(APP)" as APP
participant "Matching\nCOMP-001" as MATCH
participant "Assignment\nCOMP-007" as ASSIGN
participant "Party\nCOMP-008" as PARTY
database "PostgreSQL" as DB

C -> APP : requestWorkers(project, needs, preferences)
APP -> MATCH : match(request)
MATCH -> PARTY : availableWorkers(trades, location)
PARTY --> MATCH : candidates
MATCH -> MATCH : select(candidates) per policy (NFR-005)
MATCH --> APP : bestCandidate

APP -> ASSIGN : commitAssignment(match)
ASSIGN -> DB : BEGIN
ASSIGN -> DB : SELECT ... FOR UPDATE (worker availability)
alt worker still available
  ASSIGN -> DB : INSERT assignment (commitment, CON-013)
  ASSIGN -> DB : UPDATE worker → assigned
  ASSIGN -> DB : COMMIT
  ASSIGN --> APP : assignment committed
  APP --> C : assignment confirmed
else worker taken (race, NFR-008)
  ASSIGN -> DB : ROLLBACK
  ASSIGN --> APP : unavailable
  APP -> MATCH : re-match (revert, FR-019)
  MATCH --> APP : next candidate
end
@enduml
```

**UC-012 — Process Payments (financial intermediary):**

```plantuml
@startuml
title UC-012 Process Payments — Financial Intermediary

actor "Time\n(scheduler)" as T
participant "Orchestration\n(APP)" as APP
participant "Pricing\nCOMP-002" as PRICE
participant "Assignment\nCOMP-007" as ASSIGN
participant "Integration\nCOMP-006" as INT
database "PostgreSQL" as DB

T -> APP : paymentRun()
APP -> ASSIGN : hoursForPeriod(window)
ASSIGN --> APP : hoursEntries
APP -> PRICE : computeWages(hours, rates)
PRICE -> PRICE : apply wage floor (CON-008)
PRICE -> PRICE : apply risk premium (CON-010)
PRICE -> PRICE : apply tax withholding (CON-009)
PRICE -> PRICE : convert currency if cross-boundary (FR-022)
PRICE --> APP : wages (Money value objects, ADR-004)
APP -> INT : submitPayment(worker, amount)
INT --> APP : payment submitted
APP -> DB : record payment (append-only audit, REQ-003)
APP -> DB : retain records (CON-015)
@enduml
```

**UC-013 — Produce Regulatory Reports (jurisdiction-configured):**

```plantuml
@startuml
title UC-013 Produce Regulatory Reports — Jurisdiction-Configured

actor "Time\n(scheduler)" as T
participant "Orchestration\n(APP)" as APP
participant "Reporting\nCOMP-003" as REP
participant "Configuration\n(I3)" as CFG
database "PostgreSQL" as DB

T -> APP : reportingCadence(jurisdiction)
APP -> REP : produceReport(jurisdiction, window)
REP -> CFG : reportingRules(jurisdiction)
CFG --> REP : format, cadence, fields (CON-007, NFR-003)
REP -> DB : labor activity
REP -> DB : payment flows
REP -> DB : certification status
REP -> DB : tax withholding
REP -> REP : assemble report (required format, CON-014)
REP --> APP : report
APP -> APP : deliver on cadence
@enduml
```

## Process View

The system has three concurrency concerns, all modest (CON-021):

1. **Interactive channels** — self-service (web/mobile) and representative console. Both reach the same Application orchestration (channel equivalence, NFR-006). Responsiveness is a constraint (NFR-009, REQ-013: p95 ≤ 2s); throughput is not.
2. **Scheduled triggers** — recurring membership fees (UC-009), payment runs (UC-012), regulatory reports (UC-013), fraud scans (UC-017). These are time-driven, not user-driven.
3. **The availability race** — the match→assign transition (UC-004) is the one place where concurrent access to worker availability must be serialized (NFR-008, AC-005). This is resolved inside COMP-007 as an atomic availability check (row lock on worker availability); the Risk List (R005) records the fallback of a single availability ledger if atomicity cannot be achieved.

No distributed transaction coordination is required at this scale; the modular monolith (ADR-001) keeps these concerns within a single process boundary.

```plantuml
@startuml
title TradeMe — Process View: concurrency & synchronization

|Interactive Channel|
start
:User request\n(self-service or representative console);
:In-process orchestration\n(channel equivalence, NFR-006);

|Scheduled Triggers|
:Time trigger\n(fees, payment runs, reports, fraud scans);

|Assignment (COMP-007)|
:match→assign transition (UC-004);
:Acquire availability lock\n(SELECT ... FOR UPDATE);
if (worker available?) then (yes)
  :commit assignment\n(record commitment, CON-013);
else (no)
  :revert to matching\n(FR-019, NFR-008);
endif
stop

note right
  Three concurrency concerns, all modest (CON-021).
  No distributed transaction coordination — the modular
  monolith keeps them in one process boundary (ADR-001).
  The availability race is the only serialized point.
end note
@enduml
```

## Deployment View

The same software artifact deploys in two topologies (CON-017): multi-tenant by default, single-tenant where personal-data residency (CON-016) forces it. The choice is a deployment-time configuration decision, not a code branch. The number of deployments is small (countries, not customers) and long-lived — no rapid provisioning is required (CON-017). The identity provider (Keycloak over OIDC) is likewise chosen at deployment time through configuration. The Deployment Model (optional artifact, FIRED) elaborates nodes, connectors, and environment mapping.

```plantuml
@startuml
skinparam componentStyle rectangle
title TradeMe — Deployment View (Elaboration baseline)

node "Cloud — Multi-Tenant Deployment (default)" {
  node "Application Node" {
    component "TradeMe App\n(Node.js LTS + TypeScript)" as APP_MT
  }
  node "Data Node" {
    database "PostgreSQL\n(Jurisdictions A, B, C)" as DB_MT
  }
  node "Identity Node" {
    component "Keycloak\n(OIDC)" as KC_MT
  }
  APP_MT --> DB_MT
  APP_MT --> KC_MT
}

node "Cloud — Single-Tenant Deployment\n(residency-constrained jurisdiction)" {
  node "Application Node" {
    component "TradeMe App" as APP_ST
  }
  node "Data Node" {
    database "PostgreSQL\n(Jurisdiction D only)" as DB_ST
  }
  node "Identity Node" {
    component "Keycloak\n(OIDC)" as KC_ST
  }
  APP_ST --> DB_ST
  APP_ST --> KC_ST
}

node "External Systems" {
  component "Contractor AP Systems" as AP
  component "Credential Validators" as VAL
}

node "User Channels" {
  component "Self-Service\n(Web + Mobile)" as SS
  component "Representative Console" as REP
}

SS --> APP_MT
REP --> APP_MT
SS --> APP_ST
REP --> APP_ST
APP_MT --> AP
APP_MT --> VAL
APP_ST --> AP
APP_ST --> VAL
@enduml
```

## Implementation View

The modular monolith (ADR-001) is organized as a single deployable on **Node.js (current LTS line) with TypeScript**, with internal module boundaries mirroring the Logical-view subsystems (COMP-001..COMP-009). Each subsystem is a module with a published interface; modules depend only on interfaces, not on each other's internals. This preserves the option to extract a subsystem into a separate service later (e.g., if fraud detection or reporting grows) without restructuring — the interface boundary is already in place.

```plantuml
@startuml
title TradeMe — Implementation View (modular monolith, Node.js + TypeScript)

package "trademe (single deployable)" {
  package "src/presentation" {
    package "self-service" as P1
    package "representative-console" as P2
  }
  package "src/application" {
    package "orchestration" as A1
  }
  package "src/domain" {
    package "matching" as D1
    package "pricing" as D2
    package "reporting" as D3
    package "fraud" as D4
    package "taxonomy" as D5
    package "integration" as D6
    package "assignment" as D7
    package "party" as D8
    package "project" as D9
  }
  package "src/infrastructure" {
    package "persistence" as I1
    package "scheduler" as I2
    package "configuration" as I3
    package "security" as I4
  }
}

package "test" {
  package "unit" as T1
  package "integration" as T2
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
D1 --> I3
D2 --> I3
D3 --> I3
D5 --> I3
D1 --> I1
D2 --> I1
D3 --> I1
D4 --> I1
D6 --> I1
D7 --> I1
D8 --> I1
D9 --> I1
T1 --> D1
T2 --> A1
@enduml
```

The `src/domain` packages map one-to-one to COMP-001..COMP-009; the `src/infrastructure` packages map to I1..I4. The `src/application/orchestration` package realizes the use-case flows and depends only on the domain interfaces (IMatching, IPricing, etc.), never on domain internals. `CONTRIBUTING.md` (coding/design/test/UI guidelines) and lint configuration are owned by this role and due during Elaboration per the Development Case.

## Data View

The Data Model (optional artifact, FIRED) owns the entity detail. The persistence store is **PostgreSQL (latest)**. At the architectural level, the retained-data store must satisfy:

- **Tamper-evident audit** (REQ-003, AC-006) — financial and assignment transactions are append-only and verifiable.
- **Retention window** (CON-015, REQ-004) — records held for the longest applicable jurisdiction window; no deletion before it elapses.
- **Residency** (CON-016, REQ-005) — personal data stays within jurisdiction borders; this is the single-tenant driver.
- **Future analytics** (NFR-004, REQ-022) — operational data retained to support later fraud detection and demand projection.
- **Monetary exactness** (ADR-004) — monetary amounts are stored in exact numeric columns; the database driver's type handling is configured so an exact numeric column is never degraded to a floating-point number on the way back.

## Size and Performance

Throughput is not a binding constraint (CON-021). The marketplace volume is bounded by worker supply and contractor demand, both growing gradually. The design deliberately avoids horizontal-scaling infrastructure. The one performance constraint is **interactive channel responsiveness** (NFR-009, REQ-013) — the self-service and phone channels must respond at p95 ≤ 2 seconds. This is met by the modular monolith's in-process orchestration; no distributed call graph is introduced.

## Quality

| Quality Attribute | Source | Architectural Tactic |
|---|---|---|
| Configurability (jurisdiction) | NFR-003, AC-001 | Configuration subsystem (I3) as the single source of jurisdiction rules; no per-jurisdiction code branching |
| Data integrity under concurrency | NFR-008, AC-005 | Atomic availability check in COMP-007 (row lock); serialized match→assign |
| Explainability (matching) | NFR-005, AC-008 | Matching policy as configurable, published, deterministic selection in COMP-001 |
| Auditability | CON-014, AC-006 | Tamper-evident append-only audit trail (REQ-003) |
| Monetary exactness | stakeholder decision (ADR-004) | Money value object; no bare floats on any monetary path |
| Evolvability (pricing, taxonomy, integrations) | CON-019, CON-018, NFR-007 | Volatility encapsulation in COMP-002, COMP-005, COMP-006 |
| Operability | CON-022 | Modular monolith; small team; no heavyweight distributed infra |
| Channel equivalence | NFR-006 | Single Application orchestration shared by both channels |
| Responsiveness | NFR-009, REQ-013 | In-process orchestration; p95 ≤ 2s on interactive channels |

## Business Architecture

The system automates the brokerage front door (BG-002). The Business Use-Case Model (Business Modeling active) models the organizational process; the system use cases derive from it via the derivation bridge. The architecture's subsystems map to the business processes as follows: COMP-001 realizes BUC-004 (Broker Worker to Project), COMP-002 realizes BUC-007 (Process Payments), COMP-003 realizes BUC-010 (Regulatory Reports), COMP-004 realizes BUC-012 (Detect Fraud). The representative (STK-003) remains as a business worker for exception handling (BUC-011) and fallback, served by the Representative Console channel — not a separate code path, but the same Application orchestration (NFR-006).

### Architecture Decision Records

#### ADR-001 — Architectural style: modular monolith (not microservices)

- **Context:** The system replaces a legacy that failed to reach cloud/external-integration. The team is small (CON-022), throughput is not binding (CON-021), and deployments are few and long-lived (CON-017).
- **Decision:** A modular monolith — one deployable, internally decomposed into interface-bounded modules (COMP-001..COMP-009).
- **Alternatives considered:** Microservices (rejected — distributed complexity unjustified at this scale, contradicts CON-021/CON-022); layered monolith without domain decomposition (rejected — does not encapsulate volatility).
- **Trade-offs:** Sacrifices independent scaling/deployment of subsystems; gains operability, simplicity, and a single transaction boundary that simplifies the availability race (R005).
- **Consequences:** Subsystem interfaces must be disciplined so a future extraction to a service is possible without restructuring (NFR-007).

#### ADR-002 — Decomposition strategy: by change, not by feature

- **Context:** The Use-Case Model annotates four "Volatility: High" areas (matching, pricing, reporting, fraud) plus configurable-data constraints (taxonomy, certification).
- **Decision:** Each subsystem encapsulates ONE area of change. Subsystems are named after the decision they hide, not the feature they serve.
- **Alternatives considered:** Functional decomposition (Billing Service, Shipping Service) — rejected, maximizes change ripple; layer-only decomposition — rejected, layers are not a decomposition.
- **Consequences:** A change to the matching policy touches only COMP-001; a new jurisdiction's reporting rules touch only COMP-003 configuration.

#### ADR-003 — Persistence mechanism: PostgreSQL (latest)

- **Context:** The system is data-centric (Data Model FIRED) and must satisfy tamper-evident audit (REQ-003), retention (CON-015), residency (CON-016), and future analytics (NFR-004).
- **Decision:** PostgreSQL (latest), as declared by the stakeholder. The database driver's type handling is configured so exact numeric columns are never degraded to floating-point numbers on the way back (see ADR-004).
- **Alternatives considered:** A document store (rejected — weaker integrity/audit guarantees for a financial intermediary); a hybrid (rejected — larger operational footprint, contradicts CON-022).
- **Consequences:** The Data Model and Implementation roles build on PostgreSQL; the driver type-handling requirement is a binding constraint on the persistence layer.

#### ADR-004 — Money mechanism: exact value object, no bare floats

- **Context:** The system is a financial intermediary (CON-004) handling wages, fees, tax withholding, and currency conversion (FR-022). The stakeholder declared this mechanism **mandatory** and stated it constrains every other mechanism derived from it.
- **Decision:** Every monetary amount is a **Money value object** carrying an exact amount and its currency. Arithmetic is permitted only between Money of the same currency; crossing currencies requires an explicit conversion that records the rate applied and the moment it was applied. The rounding policy is declared once and is identical in the domain, in persistence, and at the API. No monetary amount ever exists as a bare number — not in the domain, not on the HTTP boundary, not coming back from the database driver.
- **Two edges closed explicitly** (the runtime has no native decimal type, so exactness lives in the value object and risk lives at exactly two edges):
  1. **Database driver** — an exact numeric column must not be degraded to a floating-point number on the way back; the driver's type handling is configured so it never is.
  2. **JSON** — amounts crossing the API boundary are serialised and parsed without passing through a floating-point representation.
- **Consequences:** A bare floating-point number anywhere on a monetary path is a **critical defect**, not a style preference. This constrains COMP-002 (Pricing & Settlement), the persistence layer, and the API boundary. The rounding policy is a single declared source of truth.

#### ADR-005 — Identity provider: Keycloak over OIDC

- **Context:** Authentication for workers and contractors on the self-service channel (REQ-001) was deferred as an out-of-cycle open question. The stakeholder has now decided the mechanism.
- **Decision:** Keycloak as the identity provider over OIDC, with the provider chosen at deployment time through configuration.
- **Alternatives considered:** Greenfield authentication (rejected — reinvents identity, contradicts CON-022); a single hard-coded provider (rejected — contradicts the deployment-time configurability required by CON-017).
- **Consequences:** The Security infrastructure (I4) is Keycloak/OIDC; the provider is a deployment-time configuration choice, consistent with the multi/single-tenant topology decision.

## Traceability

| Element | Traces From | Link Type | Traces To |
|---|---|---|---|
| COMP-001 Matching | UC-004, NFR-005, AC-008 | Realizes | BUC-004 |
| COMP-002 Pricing & Settlement | UC-012, UC-016, CON-019, FR-022, FR-023, CON-009 | Realizes | BUC-007 |
| COMP-003 Regulatory Reporting | UC-013, CON-007, CON-014 | Realizes | BUC-010 |
| COMP-004 Fraud Detection | UC-017, FR-016, NFR-004 | Realizes | BUC-012 |
| COMP-005 Taxonomy & Certification | CON-018, UC-001, UC-003 | Realizes | BUC-001 |
| COMP-006 Integration Gateway | NFR-007, FR-017, STK-005 | Realizes | BUC-007 |
| COMP-007 Assignment & Availability | UC-004, NFR-008, AC-005, CON-013 | Realizes | BUC-005 |
| COMP-008 Party & Membership | UC-001, UC-002, UC-008 | Realizes | BUC-001, BUC-002 |
| COMP-009 Project | UC-003, UC-015 | Realizes | BUC-003 |
| ADR-001 | CON-021, CON-022, CON-017 | DependsOn | — |
| ADR-002 | Use-Case Model (Volatility: High) | DependsOn | — |
| ADR-003 | CON-015, CON-016, REQ-003, NFR-004 | DependsOn | Data Model |
| ADR-004 | CON-004, FR-022, CON-009 | DependsOn | COMP-002, Data Model |
| ADR-005 | REQ-001, CON-017 | DependsOn | Security (I4) |
