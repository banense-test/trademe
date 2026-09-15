## Document Control
| Field | Value |
|---|---|
| Phase | Elaboration |
| Status | Draft — iteration 2 (packaging, environment configuration, and installation procedures refined) |
| Milestone Target | End-of-Elaboration review (Lifecycle Architecture Milestone) |
## Deployment Topology

**Deployment mode: Custom-built** — a bespoke system deployed to the company's own cloud infrastructure, not shrink-wrapped or downloadable. This is the only mode consistent with the declared scope: the system is a financial intermediary (CON-004) operating jurisdiction-specific compliance (CON-007), deployed to a small number of long-lived country-level environments (CON-017).

**Strategy (Elaboration baseline):** The same software artifact deploys in two topologies, chosen at deployment time through configuration — never a code branch (CON-017, AC-002):

1. **Multi-tenant (default)** — one instance serves multiple jurisdictions sharing a single PostgreSQL store, with jurisdiction rules held in configuration (CON-007, NFR-003).
2. **Single-tenant** — a dedicated instance for a jurisdiction whose personal-data-residency rules (CON-016) forbid cross-border data. Same software, isolated data node.

The number of deployments is small (countries, not customers) and long-lived; no rapid provisioning is required (CON-017). The identity provider (Keycloak over OIDC, ADR-005) is likewise a deployment-time configuration choice.

**Elaboration refinement:** The Inception topology is now elaborated with the two infrastructure subsystems the baselined SAD introduces — the **Scheduler (I2)** for time-triggered work (recurring membership fees UC-009, payment runs UC-012, regulatory reports UC-013, fraud scans UC-017) and the **Configuration subsystem (I3)** as the single source of jurisdiction rules (AC-001, NFR-003). Both are in-process components of the modular monolith (ADR-001), not separate nodes — they deploy inside the Application Node, not beside it.

```plantuml
@startuml
skinparam componentStyle rectangle
title TradeMe Deployment Topology — Elaboration (Deployment Model)

node "Cloud — Multi-Tenant Deployment (default)" as MT {
  node "Application Node" {
    component "TradeMe App\n(Node.js LTS + TypeScript)" as APP_MT
    component "Scheduler\n(I2 — fees, payments, reports, fraud)" as SCH_MT
    component "Configuration\n(I3 — jurisdiction rules)" as CFG_MT
  }
  node "Data Node" {
    database "PostgreSQL\n(Jurisdictions A, B, C)" as DB_MT
  }
  node "Identity Node" {
    component "Keycloak\n(OIDC)" as KC_MT
  }
  APP_MT --> DB_MT
  APP_MT --> KC_MT
  SCH_MT --> APP_MT
  CFG_MT --> APP_MT
}

node "Cloud — Single-Tenant Deployment\n(residency-constrained jurisdiction)" as ST {
  node "Application Node" {
    component "TradeMe App" as APP_ST
    component "Scheduler\n(I2)" as SCH_ST
    component "Configuration\n(I3)" as CFG_ST
  }
  node "Data Node" {
    database "PostgreSQL\n(Jurisdiction D only)" as DB_ST
  }
  node "Identity Node" {
    component "Keycloak\n(OIDC)" as KC_ST
  }
  APP_ST --> DB_ST
  APP_ST --> KC_ST
  SCH_ST --> APP_ST
  CFG_ST --> APP_ST
}

node "External Systems" as EXT {
  component "Contractor AP Systems" as AP
  component "Credential Validators" as VAL
}

node "User Channels" as CH {
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

note right of DB_MT
  Money exactness (ADR-004): driver type-handling
  configured so exact numeric columns never
  degrade to float on read.
end note
@enduml
```

## Nodes and Connectors

| Node | Role | Artifacts Deployed | Notes |
|---|---|---|---|
| Application Node | Runs the TradeMe modular monolith (Node.js LTS + TypeScript) | Single deployable containing COMP-001..COMP-009 + Scheduler (I2) + Configuration (I3) | One per deployment; in-process orchestration (ADR-001); Scheduler and Configuration are in-process components, not separate nodes |
| Data Node | Persistence | PostgreSQL (latest) | Multi-tenant: shared store, jurisdiction-scoped rows; single-tenant: isolated store |
| Identity Node | Authentication/authorization | Keycloak (OIDC) | Provider chosen at deployment time (ADR-005) |
| External — Contractor AP Systems | Payment submission from contractors (FR-017, near-term) | — | Reached via Integration Gateway (COMP-006) |
| External — Credential Validators | Certification verification (STK-005) | — | Reached via Integration Gateway (COMP-006) |

**Connectors (communication paths):**

| From | To | Protocol | Notes |
|---|---|---|---|
| Self-Service / Representative Console | Application Node | HTTPS | Channel equivalence (NFR-006); both reach the same orchestration; p95 ≤ 2s (REQ-013) |
| Application Node | Data Node | PostgreSQL wire | Driver type-handling configured so exact numeric columns never degrade to floats (ADR-004) |
| Application Node | Identity Node | OIDC | Deployment-time provider selection |
| Application Node | External systems | HTTPS (outbound) | Via COMP-006; integrations added without restructuring (NFR-007) |

### Packaging Requirements (deployment unit)

The deployment unit is an **SCM release** — versioned, tagged, traceable. The Bill of Materials is the repository's lockfile (`package-lock.json`), which pins the exact dependency set of the release; no separate BOM document is produced (the lockfile *is* the BOM).

```plantuml
@startuml
skinparam componentStyle rectangle
title TradeMe Deployment Unit — Packaging (single deployable, ADR-001)

package "TradeMe Release (SCM tag)" {
  component "Application Bundle\n(compiled TypeScript → JS)" as APP {
    component "presentation\n(self-service, rep console)" as P
    component "application\n(orchestration)" as A
    component "domain\n(COMP-001..COMP-009)" as D
    component "infrastructure\n(I1..I4)" as I
  }
  component "package-lock.json\n(Bill of Materials)" as BOM
  component "Database Migrations\n(schema + seed)" as MIG
  component "Jurisdiction Configuration\n(I3 — labor, tax, cert, reporting, currency)" as JCFG
  component "Keycloak Realm Config\n(OIDC)" as REALM
}

database "PostgreSQL (latest)" as DB
component "Keycloak (OIDC)" as KC

APP --> BOM : built from
MIG --> DB : applies
JCFG --> APP : loaded at boot
REALM --> KC : provisions
APP --> DB : connects (driver type-handling, ADR-004)
APP --> KC : OIDC

note right of BOM
  The lockfile is the Bill of Materials —
  the exact dependency set of the release.
end note
@enduml
```

**Packaging rules:**

1. **Single deployable** — the modular monolith (ADR-001) ships as one application bundle; no per-subsystem artifacts. Internal module boundaries (COMP-001..COMP-009) are source-level, not deployment-level.
2. **Database migrations are versioned with the release** — schema changes and jurisdiction seed data travel with the SCM tag, applied idempotently on install.
3. **Jurisdiction configuration is data, not code** — a new jurisdiction's labor law, certification framework, tax rules, reporting requirements, and currency are described in deployment configuration (AC-001), loaded at boot by I3. No code change accompanies a new jurisdiction.
4. **Keycloak realm configuration is deployment-time** — the OIDC realm is provisioned per deployment, consistent with the multi/single-tenant choice (CON-017).
5. **Money exactness is a packaging invariant** — the database driver's type-handling configuration (ADR-004) ships with the release; an exact numeric column must never degrade to a floating-point number on read. This is verified at Gate 1, not discovered in production.

## Environment Mapping

**Target environments** (small, long-lived — CON-017):

| Environment | Purpose | Topology | Jurisdictions |
|---|---|---|---|
| Development | Iteration build/test | Multi-tenant (single instance) | Synthetic test jurisdictions |
| Staging (acceptance gate 1) | Pre-production verification on the development site | Mirrors production topology | Representative jurisdiction set |
| Production — multi-tenant | Live brokerage (default) | Multi-tenant | UK, Ireland, Canada + existing footprint |
| Production — single-tenant | Residency-constrained jurisdiction(s) | Single-tenant | As required by CON-016 |

**Installation procedure (configuration-first rollout):**

```plantuml
@startuml
title TradeMe Installation & Rollout — Configuration-First (AC-001)

start
:Tag SCM release\n(versioned, traceable);
:Provision environment\n(Dev / Staging / Production);
:Apply database migrations\n(schema + jurisdiction seed);
:Provision Keycloak realm\n(OIDC, deployment-time);
:Load jurisdiction configuration\n(I3 — labor, tax, cert, reporting, currency);

if (Gate 1 — development/staging site?) then (pass)
  :Deploy to production install site;
  if (Gate 2 — install site smoke + compliance?) then (pass)
    :Declare jurisdiction live;
    :Operate (scheduler runs fees/payments/reports/fraud);
  else (fail)
    :Rollback to prior SCM release\n(audit trail preserved, REQ-003);
  endif
else (fail)
  :Fix and re-verify on staging;
endif

stop

note right
  New jurisdiction = configuration only, no code change (AC-001).
  Rollback triggers: reporting failure (CON-014),
  availability race inconsistency (NFR-008/AC-005),
  bare float on a monetary path (ADR-004 — critical).
end note
@enduml
```

**Rollout approach:** Jurisdiction-by-jurisdiction, configuration-first. A new jurisdiction is added by describing its labor law, certification framework, tax rules, reporting requirements, and currency in deployment configuration (AC-001) — no code change. Each jurisdiction is brought online independently, so a defect in one jurisdiction's configuration does not affect others already live.

**Two-gate acceptance (mandatory):**
1. **Gate 1 — development/staging site:** the release passes functional and compliance verification on the staging environment before any production deployment. This includes the money-exactness check (ADR-004) and the availability-race test (NFR-008, AC-005).
2. **Gate 2 — install site:** the release is verified on the production install site (per-jurisdiction smoke + compliance checks) before being declared live.

**Rollback criteria:** A production deployment is rolled back when (a) a jurisdiction's regulatory reporting fails to produce complete, on-time output (CON-014), (b) the availability race produces an inconsistent state (NFR-008, AC-005), or (c) a monetary path exhibits a bare floating-point amount (ADR-004 — critical defect). Rollback restores the prior SCM release (versioned, tagged, traceable); the tamper-evident audit trail (REQ-003) is preserved across rollback.

**Legacy coexistence:** The legacy system continues to operate alongside the new system (CON-020); no historical data migration. The new system serves new geographies and channels only.

## Traceability

| Element | Traces From | Link Type | Traces To |
|---|---|---|---|
| Multi-tenant topology | CON-017, AC-002 | DependsOn | SAD Deployment View |
| Single-tenant topology | CON-016, CON-017, AC-002 | DependsOn | SAD Deployment View |
| Configuration-first rollout | CON-007, NFR-003, AC-001 | DependsOn | COMP-003, COMP-005 |
| Two-gate acceptance | CON-014, AC-006 | DependsOn | Test Plan |
| Rollback criteria | NFR-008, AC-005, ADR-004 | DependsOn | COMP-007, COMP-002 |
| Identity node | ADR-005, CON-017 | DependsOn | Security (I4) |
| External connectors | NFR-007, FR-017, STK-005 | DependsOn | COMP-006 |
| Scheduler (I2) in-process | UC-009, UC-012, UC-013, UC-017 | DependsOn | SAD Process View |
| Configuration (I3) in-process | AC-001, NFR-003, CON-007 | DependsOn | SAD Logical View |
| Packaging (SCM release + lockfile BOM) | ADR-001, ADR-004 | DependsOn | SAD Implementation View |
