## Document Control
| Field | Value |
|---|---|
| Phase | Inception |
| Status | Draft — iteration 3 |
| Milestone Target | End-of-Inception review |
## Domain Overview

TradeMe is a skilled-trade labor brokerage: it matches independent workers to general contractors for a margin, acting as the financial intermediary (contractors pay the system, the system pays workers). The domain vocabulary spans labor law, tax, certification, and payment terminology that varies across jurisdictions (UK, Ireland, Canada, plus the existing European footprint). Terms below are the canonical definitions used across all artifacts; where a term is jurisdiction-specific, that is noted.

## Term Definitions
| Term | Definition | Jurisdiction Note |
|---|---|---|
| Worker | An independent skilled-trade individual who registers with the marketplace, lists trades/skills/certifications/availability/rates, finds work, records hours, and receives payment. Not an employee of the company (CON-003). | — |
| Contractor | A general contractor who registers, lists projects, requests workers, and pays through the system. | — |
| Internal Representative | Operations staff performing exception handling, escalations, and fallback human channel. Shrinks from 220 across 9 call centers to a single small backup call center. | — |
| Regulator | A jurisdiction-specific body requiring reports on labor activity, payment flows, and worker certifications on defined cadences. | Varies by jurisdiction |
| Assignment | The committed allocation of a worker to a project for an agreed duration, with arrival and departure tracked. | — |
| Matching | The system's selection of the best available worker for a project's needs, per a configurable, explainable policy (NFR-005). | — |
| Bill Rate | The rate a contractor pays for a worker's time on a project. | — |
| Expected Rate | The rate a worker lists as their expectation; varies by trade, skill level, experience, project type, location, union membership, and certifications (FR-001). | — |
| Margin | The difference between what the contractor pays and what the worker receives; the company's revenue (CON-004). | — |
| Money | A value object carrying an exact amount and its currency. Arithmetic is permitted only between Money of the same currency; crossing currencies requires an explicit conversion that records the rate applied and the moment it was applied. No monetary amount ever exists as a bare number — not in the domain, on the HTTP boundary, or from the database driver. | — |
| Currency | The denomination of a monetary amount. Conversion is required when a contractor and worker are in different currency or jurisdictional boundaries (FR-022); single-currency deployments need no conversion. | Varies by jurisdiction |
| Certification | A credential a worker holds, recorded on their record; required for specific tasks by jurisdiction (CON-011). | Certification frameworks are jurisdiction-specific (CON-018) |
| Continuing Education (CE) | Course registration, attendance, completion, and certification recording. Basic tracking only; delivery/test/accreditation out of scope. | — |
| Membership | Recurring annual status (active, lapsed, renewed) for workers and contractors, with an annual fee. | — |
| Financial Intermediary | The company's role: contractors pay the system, the system pays workers (CON-004). | — |
| Wage Floor | Jurisdiction-specific minimum wage the system must respect (CON-008). | Varies by jurisdiction |
| Risk Premium | Adjustment for high-risk work (e.g., high-voltage electrical, skyscraper) as required by jurisdiction (CON-010). | Varies by jurisdiction |
| Wage-Leaning | Rules about claims against future wages (CON-012). | Varies by jurisdiction |
| Employment Tax | Tax obligations the system handles on behalf of workers, as the financial intermediary (CON-009). | Varies by jurisdiction |
| Retention Window | The longest applicable regulatory retention period across served jurisdictions; records are not deleted before it elapses (CON-015). | Varies by jurisdiction |
| Data Residency | Requirement that personal data about a jurisdiction's residents remain within its borders (CON-016). | Varies by jurisdiction |
| Multi-Tenant | Default deployment topology: a single instance serves multiple jurisdictions (CON-017). | — |
| Single-Tenant | Deployment topology forced by data-residency rules for a specific jurisdiction (CON-017). | — |
| Trade-and-Skill Taxonomy | Configurable data describing trades and skills; grows and reshapes over time (CON-018). | Varies by jurisdiction |
| Fraud Detection | Capability to notice suspicious activity patterns (e.g., wage-avoidance termination); data retained to support later implementation (FR-016). | — |
| Membership Violation | A contractor bypassing the marketplace to hire a worker directly (CON-005, AC-007). | — |
| Fallback Channel | The phone-based human channel for users preferring human interaction (FR-013, NFR-006). | — |
| Self-Service Channel | Direct software interaction by workers and contractors (NFR-002). | — |
| Channel Equivalence | The same matching, financial flow, and compliance regardless of channel (NFR-006). | — |
## Traceability
| Element | Traces From | Link Type | Traces To |
|---|---|---|---|
| Worker | STK-001 | Derives | UC-001, UC-005, UC-006, UC-007, UC-008 |
| Contractor | STK-002 | Derives | UC-002, UC-003, UC-004, UC-008 |
| Financial Intermediary | CON-004 | Derives | UC-012 |
| Money | CON-004, FR-022 | Derives | UC-012 |
| Currency | FR-022 | Derives | UC-012 |
| Matching | FR-018, NFR-005 | Derives | UC-004 |
| Certification | CON-011, CON-018 | Derives | UC-007 |
| Membership | FR-010, FR-011 | Derives | UC-008, UC-009 |
| Retention Window | CON-015 | Derives | UC-013 |
| Data Residency | CON-016 | Derives | (deployment topology) |
| Multi-Tenant / Single-Tenant | CON-017 | Derives | (deployment topology) |
| Trade-and-Skill Taxonomy | CON-018 | Derives | UC-001, UC-003 |
| Fraud Detection | FR-016 | Derives | UC-017 |
| Membership Violation | CON-005, AC-007 | Derives | UC-008, UC-017 |
