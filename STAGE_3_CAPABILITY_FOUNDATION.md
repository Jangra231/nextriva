# Stage 3 Completion — Capability Catalog, Applications, and Scoped Grants

**Stage status:** Complete and validated. Stage 3 is intentionally additive and records the capability lifecycle without replacing the retained `users.role` model, disrupting legacy routes, changing ownership, or enforcing new execution authorization before Stage 4.

## Delivered Capability Foundation

| Concern | Stage 3 implementation | Preservation control |
| --- | --- | --- |
| Catalog | Six active catalog capabilities: Local Authority, CSR sponsorship, venue stewardship, event hosting, district delivery, and state programme stewardship. | Existing MCD, CSR, organizer, participant, administrator, event, venue, registration, and ownership workflows remain in place. |
| Function metadata | Every function has a stable code, display name, description, active state, required/optional marker, dependency codes, sensitive-data declaration, and sort order. | Metadata describes future authorization only. It does not alter a legacy role or grant a legacy account additional execution rights. |
| Applications | An account-profile owner can save a validated draft, submit it, revise a returned application, and see its lifecycle outcome. | Existing role/session access is not routed through an application. Only the owner may edit or submit its draft/returned record. |
| Scope and validity | Applications and grants retain a national, state, district, city, zone, or ward scope plus start/end dates. | No existing event, venue, CSR brief, authority report, or audit record is copied, rewritten, or deleted. |
| Grants | An administrator can create a selected-function, time-bound, scoped grant from a submitted application and later mark it active, suspended, revoked, or expired. | Grant status is informational in Stage 3; current MCD, CSR, organizer, and administrator authorization remains authoritative. |
| Audits | Capability application and grant actions create dedicated immutable evidence rows; master decisions also retain the existing generic administrator audit event. | Historic administrator audit rows remain append-only and unchanged. |
| Atomic lifecycle | Draft save/revision, submission, review, approval/grant creation, and grant-status changes commit their affected records and audit evidence in one database transaction. | A failed multi-record lifecycle operation rolls back rather than leaving partial application/function/grant/audit state. |

## Database Changes

Migration `0028_ambitious_adam_warlock.sql` creates the additive catalog, function, application, application-function, grant, grant-function, and dedicated capability-audit tables. It duplicate-safely seeds Local Authority, CSR sponsorship, venue stewardship, and event-hosting catalog records.

Migration `0029_purple_electro.sql` additively adds required-function, dependency-code, and sensitive-data metadata to `capabilityFunctions`. It duplicate-safely seeds the required `DISTRICT_LEVEL` and `STATE_LEVEL` records and their functions, then consistently annotates the original seed functions. Neither migration changes a legacy user ID, public ID, password, session, role value, event, ownership relationship, CSR record, registration, or historic audit row.

## Interface and Lifecycle Scope

Standard User accounts can use `/dashboard/capabilities` to search and audience-filter the active catalog, inspect function metadata, create a request, select exact functions, provide territory/date evidence, and view applications and time-bound grants. Mandatory functions are preselected and enforced server-side; functions with dependencies cannot be saved or granted without their prerequisite.

Master administrators use `/admin?view=capabilities` to inspect the full catalog and metadata, review submitted requests with literal `MASTER` confirmation, choose only applicant-requested functions, set a bounded territory/date range, and manage grant status with an administrative reason. Browser verification was deliberately non-mutating: lifecycle persistence was exercised by the isolated database-backed integration test instead.

> **Stage 4 boundary:** A grant, scope, function selection, dependency, or active-status indicator does not yet gate any protected legacy feature. Stage 4 must centralize and apply execution authorization only after compatibility mappings and current MCD/CSR/organizer behavior have been explicitly migrated and tested.

## Rollback and Compatibility

`FITIZEN_CAPABILITY_CATALOG_ENABLED` defaults to enabled. Set it to the exact value `false` to hide the Stage 3 capability navigation, redirect a direct applicant route request to `/dashboard/my-bookings`, and return an administrator `?view=capabilities` request to the existing overview. The flag does not delete or mutate capability catalog, application, grant, function, or audit records.

This is the safe Stage 3 operational rollback. Do not drop the Stage 3 tables or reverse migrations in a live database: retain the additive records and use the flag while investigating or preparing a forward fix. Stage 1 Local Authority terminology and Stage 2 profile-route flags remain independent and unchanged.

## Validation and Stage 4 Gate

The focused lifecycle test exercised draft, submission, returned revision, scoped approval, time-bound selected-function grant creation, suspension, audit evidence, transaction-backed cleanup, district/state seed coverage, and the Stage 4 enforcement boundary. The full regression suite passed with **37 test files and 90 tests**. TypeScript validation passed, and the bounded-memory Next.js production build passed.

Browser checks confirmed the standard account catalog search, applicant form feedback, function metadata, role-boundary redirect, administrator capability-governance view, responsive card/table presentation, and the absence of persisted browser-created application or grant data. Database verification confirmed five preserved users and profiles, the retained legacy role counts (`user` 2, `admin` 1, `mcd` 1, `csr` 1), six active catalog records, and zero residual Stage 3 test users, applications, grants, or capability audit rows. Stage 4 may now introduce centralized execution authorization; it must not bypass the retained legacy authorization paths until that next-stage work is separately validated.
