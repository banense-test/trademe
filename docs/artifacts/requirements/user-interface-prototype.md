## Document Control
| Field | Value |
|---|---|
| Phase | Elaboration |
| Status | Draft — iteration 1 |
| Milestone Target | End-of-Elaboration review |

## Prototype Scope and Goals

The User-Interface Prototype is triggered (UX-critical) because the self-service channel (NFR-002) replaces 220 representatives across 9 call centers (BG-002) — the front-door user experience is the single largest determinant of whether workers and contractors (STK-001, STK-002) can move off the phone channel. Mobile accessibility is a must-have (NFR-001, REQ-008).

**Goals:**
1. Validate that the self-service flows for the highest-frequency operations (register, request workers, record hours) are navigable by a non-technical user without representative intervention (AC-003).
2. Confirm channel equivalence (NFR-006): the same matching, financial flow, and compliance reach the user whether they arrive via self-service or via a representative on the fallback channel (UC-011).
3. Surface the configurable-taxonomy and certification-framework touchpoints (CON-018) where the UI must render jurisdiction-specific data without code changes.

**Out of scope for the prototype:** deep continuing-education delivery, billing/collections mechanics, and the nice-to-have capabilities (UC-017..UC-021) — all declared out of scope or deferred.

## Storyboards
Storyboards visualize the critical self-service flows for stakeholder validation. Each storyboard traces to a use case in the Use-Case Model and renders the interaction sequence as a screen-by-screen flow. The highest-frequency operations (register, request workers, record hours) are the primary validation targets for AC-003 (end-to-end without representative intervention).

### Storyboard 1 — Worker Registration (UC-001)

```plantuml
@startuml
title TradeMe Self-Service — Worker Registration Storyboard (UC-001)

|Worker|
start
:Screen 1 — Identity & contact details;
:Screen 2 — Trades & skill levels\n(select from configurable taxonomy, CON-018);
:Screen 3 — Geographic availability & expected rate\n(rate varies by trade/skill/experience/location/union/certs, FR-001);
:Screen 4 — Certifications held\n(upload / self-attest, verification deferred);
:Screen 5 — Review & confirm;

|System|
:Validate against taxonomy & certification frameworks (CON-018);
:Create worker record;
:Initiate membership (UC-008);
:Confirm — "You're registered";
stop
@enduml
```

### Storyboard 2 — Contractor Registration (UC-002)

```plantuml
@startuml
title TradeMe Self-Service — Contractor Registration Storyboard (UC-002)

|Contractor|
start
:Screen 1 — Identity & contact details;
:Screen 2 — Company / business details;
:Screen 3 — Review & confirm;

|System|
:Create contractor record;
:Initiate membership (UC-008);
:Confirm — "You're registered";
stop
@enduml
```

### Storyboard 3 — Create Project Listing (UC-003)

```plantuml
@startuml
title TradeMe Self-Service — Create Project Listing Storyboard (UC-003)

|Contractor|
start
:Screen 1 — Project details\n(trades, skill levels, location, bill rate, duration);
:Screen 2 — Per-period trade needs\n(different trades for different periods, FR-003);
:Screen 3 — Review & publish;

|System|
:Validate trades against configurable taxonomy (CON-018);
if (Trade valid?) then (yes)
  :Create project listing;
else (no)
  :Extend taxonomy via configuration (CON-018);
  :Create project listing;
endif
:Confirm — "Project listed";
stop
@enduml
```

### Storyboard 4 — Contractor Request Workers (UC-004)

```plantuml
@startuml
title TradeMe Self-Service — Contractor Request Workers Storyboard (UC-004)

|Contractor|
start
:Screen 1 — Select project;
:Screen 2 — Specify needs\n(trades, skill levels, location, duration, rate);
:Screen 3 — Optional preferences\n(specific workers — soft signal, CON-006);
:Screen 4 — Submit request;

|System|
:Search available workers (FR-018);
:Select best fit per matching policy (NFR-005);
:Verify availability (race check, NFR-008);
if (Assigned?) then (yes)
  :Screen 5 — "Worker assigned" (FR-019);
else (no)
  :Screen 5 — "Awaiting match"\n(offer raise option, FR-023);
endif
stop
@enduml
```

### Storyboard 5 — Track Arrival/Departure (UC-005)

```plantuml
@startuml
title TradeMe Self-Service — Track Arrival/Departure Storyboard (UC-005)

|Worker / Contractor|
start
:Screen 1 — Select active assignment;
:Screen 2 — Signal arrival at project;

|System|
:Record arrival timestamp;

|Worker / Contractor|
:Screen 3 — Signal departure;

|System|
:Record departure timestamp;
:Update assignment status (workers can come and go, FR-005);
if (Departure without return?) then (yes)
  :Assignment remains open until termination (UC-014)\nor project closure (UC-015);
else (no)
endif
stop
@enduml
```

### Storyboard 6 — Record Hours Worked (UC-006)

```plantuml
@startuml
title TradeMe Self-Service — Record Hours Storyboard (UC-006)

|Worker|
start
:Screen 1 — Select assigned project;
:Screen 2 — Enter hours (date, hours worked);
:Screen 3 — Review & submit;

|System|
:Validate hours against assignment;
if (Hours exceed assignment duration?) then (yes)
  :Flag for review (UC-010);
else (no)
endif
:Compute wages from hours and agreed rates (FR-007);
:Apply jurisdiction minimum wage floor (CON-008);
:Apply risk premium for high-risk work (CON-010);
:Confirm — "Hours recorded, wage computed";
stop
@enduml
```

### Storyboard 7 — Complete Certification Course (UC-007)

```plantuml
@startuml
title TradeMe Self-Service — Complete Certification Course Storyboard (UC-007)

|Worker|
start
:Screen 1 — Browse available courses (basic CE tracking, FR-008);
:Screen 2 — Register for course;
:Screen 3 — Mark course completed;

|System|
:Record course completion;
:Record resulting certification on worker record (FR-009);
:Update credential status for matching and regulatory purposes;
:Confirm — "Certification recorded";
stop
@enduml
```

### Storyboard 8 — Maintain Membership (UC-008)

```plantuml
@startuml
title TradeMe Self-Service — Maintain Membership Storyboard (UC-008)

|Worker / Contractor|
start
:Screen 1 — View membership status (active / lapsed / renewed);

|System|
if (Renewal due?) then (yes)
  :Screen 2 — Renew membership (pay annual fee, UC-009);
  :Update status to renewed;
else (no — non-payment)
  :Mark membership lapsed;
  :Restrict from new matches until renewed;
endif
:Enforce membership-violation detection (CON-005, AC-007);
stop
@enduml
```

### Storyboard 9 — Terminate Assignment (UC-014)

```plantuml
@startuml
title TradeMe Self-Service — Terminate Assignment Storyboard (UC-014)

|Contractor / Representative|
start
:Screen 1 — Select active assignment;
:Screen 2 — State termination reason\n(project end, illness, walk-off, cancellation);

|System|
:Verify termination request;
if (Verifiable cause?) then (yes)
  :Remove worker from active assignment;
  :Make worker available for new matches;
  :Record termination and deviation from commitment (CON-013);
  :Confirm — "Assignment terminated";
else (no — casual termination for better pay)
  :Reject termination (CON-006, CON-013);
  :Screen 3 — "Termination requires a verifiable cause";
endif
stop
@enduml
```

### Storyboard 10 — Close Project (UC-015)

```plantuml
@startuml
title TradeMe Self-Service — Close Project Storyboard (UC-015)

|Contractor|
start
:Screen 1 — Select project;
:Screen 2 — Signal closure (complete or cancelled);

|System|
:Verify closure request;
if (Workers still assigned?) then (yes)
  :Release workers via termination flow (UC-014);
else (no)
endif
:Move project to closed state;
:Retain records for regulatory retention period (CON-015);
:Confirm — "Project closed";
stop
@enduml
```

### Wireframes — Primary Screens (Salt)

The following Salt wireframes render the primary screens for the highest-frequency flows. They are the tangible realization of the storyboards above and the basis the Implementer builds from.

**Wireframe W-1 — Worker Registration, Screen 2 (Trades & Skills):**

```plantuml
@startsalt
title Worker Registration — Screen 2 (Trades & Skills)
{
  {^ TradeMe — Worker Registration (Step 2 of 5) }
  {T
    + Trades & Skill Levels
    ++ Select trade | [Electrician ▼]
    ++ Skill level | [Journeyman ▼]
    ++ Years experience | [12 ]
    ++ Add another trade | [ + Add ]
    ++ Geographic availability | [UK — London ▼]
    ++ Expected rate (per hour) | [£ 45.00 ]
    ++ Union member | (X) Yes ( ) No
  }
  { [ < Back ] | [ Next > ] }
}
@endsalt
```

**Wireframe W-2 — Contractor Request Workers, Screen 2 (Specify Needs):**

```plantuml
@startsalt
title Contractor Request Workers — Screen 2 (Specify Needs)
{
  {^ TradeMe — Request Workers (Step 2 of 4) }
  {T
    + Project needs
    ++ Trade | [Electrician ▼]
    ++ Skill level | [Journeyman ▼]
    ++ Location | [Manchester ▼]
    ++ Duration | [6 weeks ]
    ++ Bill rate (per hour) | [£ 62.00 ]
    ++ Preferred worker (optional) | [ (soft signal) ]
  }
  { [ < Back ] | [ Submit request > ] }
}
@endsalt
```

**Wireframe W-3 — Worker Record Hours, Screen 2 (Enter Hours):**

```plantuml
@startsalt
title Worker Record Hours — Screen 2 (Enter Hours)
{
  {^ TradeMe — Record Hours }
  {T
    + Assigned project | [Riverside Tower — Electrician ]
    ++ Date | [2026-09-14 ]
    ++ Hours worked | [8.0 ]
    ++ Notes (optional) | [ ]
  }
  { [ < Back ] | [ Submit hours > ] }
}
@endsalt
```

**Wireframe W-4 — Worker Dashboard (post-login):**

```plantuml
@startsalt
title Worker Dashboard (post-login)
{
  {^ TradeMe — Worker Dashboard }
  {
    {S
      + My assignments | [Riverside Tower — active]
      + Available matches | [3 new]
      + Record hours | [Go]
      + My certifications | [2 current]
      + Membership | [Active — renews 2027-03-01]
    }
  }
}
@endsalt
```

### Storyboard Coverage Note

The storyboards above cover all Must-priority self-service use cases (UC-001..UC-008, UC-014, UC-015). The remaining Must-priority use cases are system-triggered (UC-009 membership fees, UC-012 payments, UC-013 regulatory reports — Time actor) or representative-mediated (UC-010 exception, UC-011 fallback) and do not require self-service storyboards; they are covered by the Navigation Flow and the channel-equivalence validation below. Nice-to-have use cases (UC-016..UC-021) remain at survey level pending stakeholder prioritization and are out of prototype scope.

## Navigation Flow

```plantuml
@startuml
title TradeMe Self-Service — Navigation Flow (Worker & Contractor)

|Worker|
start
:Landing / Login (Keycloak OIDC, REQ-001);
if (Registered?) then (no)
  :Register as Worker (UC-001)\n— trades, skills, certifications, availability, rate;
endif
:Worker Dashboard;
:View available projects / matches;
:Accept assignment (UC-004);
:Record hours (UC-006);
:Track CE / certifications (UC-007);
:Manage membership (UC-008);
stop

|Contractor|
start
:Landing / Login (Keycloak OIDC, REQ-001);
if (Registered?) then (no)
  :Register as Contractor (UC-002);
endif
:Contractor Dashboard;
:Create project listing (UC-003);
:Request workers (UC-004);
:Track arrivals/departures (UC-005);
:Close project (UC-015);
:Manage membership (UC-008);
stop
@enduml
```

## Validation Feedback

The prototype is validated against the following declared acceptance criteria and NFRs:

| Validation Point | Criterion | Status |
|---|---|---|
| Worker registers, matched, assigned, completes, paid end-to-end without representative intervention | AC-003 | Prototype covers register (UC-001) and request (UC-004); hours (UC-006) and payment (UC-012) are downstream flows the prototype links to |
| Same scenario in two jurisdictions produces correct tax/certification/reporting | AC-004 | Prototype renders taxonomy/certification from configuration (CON-018); jurisdiction-specific rendering is a configuration concern, not a UI-code concern |
| Channel equivalence — self-service and phone produce the same outcome | NFR-006 | UC-011 fallback channel performs the same operations; the prototype's flows are the canonical operations the representative mirrors |
| Mobile accessibility is a must-have | NFR-001, REQ-008 | Prototype targets mobile-first rendering |

`[ASSUMPTION — requires validation]` Low technical literacy (REQ-010) is an out-of-cycle open question; the prototype does not yet commit to a low-literacy design treatment until the stakeholder answers it.

## Traceability
| Element | Traces From | Link Type | Traces To |
|---|---|---|---|
| UI Prototype — Worker Registration storyboard (SB-1) | UC-001, FR-001 | Derives | UC-001 |
| UI Prototype — Contractor Registration storyboard (SB-2) | UC-002, FR-002 | Derives | UC-002 |
| UI Prototype — Create Project Listing storyboard (SB-3) | UC-003, FR-003 | Derives | UC-003 |
| UI Prototype — Request Workers storyboard (SB-4) | UC-004, FR-004, FR-018, FR-019 | Derives | UC-004 |
| UI Prototype — Track Arrival/Departure storyboard (SB-5) | UC-005, FR-005 | Derives | UC-005 |
| UI Prototype — Record Hours storyboard (SB-6) | UC-006, FR-006, FR-007 | Derives | UC-006 |
| UI Prototype — Complete Certification Course storyboard (SB-7) | UC-007, FR-008, FR-009 | Derives | UC-007 |
| UI Prototype — Maintain Membership storyboard (SB-8) | UC-008, FR-010 | Derives | UC-008 |
| UI Prototype — Terminate Assignment storyboard (SB-9) | UC-014, FR-020 | Derives | UC-014 |
| UI Prototype — Close Project storyboard (SB-10) | UC-015, FR-021 | Derives | UC-015 |
| UI Prototype — Wireframes W-1..W-4 | SB-1, SB-4, SB-6 | Refines | UC-001, UC-004, UC-006 |
| UI Prototype — Navigation Flow | NFR-002, NFR-001, REQ-008 | Derives | UC-001..UC-016 |
| UI Prototype — Channel equivalence | NFR-006 | Derives | UC-011 |

