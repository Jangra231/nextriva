# Stage 4 Completion — Central Authorization, Local Authority Rollout, and Grant Expiry

**Stage status:** Complete and validated. Stage 4 begins execution authorization only for the Local Authority event-review mutation, and only when the explicit rollout flag is enabled. Existing roles, sessions, routes, event ownership, CSR isolation, historical data, and read-only Local Authority monitoring remain preserved.

## Delivered Controls

| Control | Behavior | Compatibility protection |
| --- | --- | --- |
| Central decision service | Evaluates a capability code, selected function code, time window, status, and resource territory as a single server-side decision. | A disabled rollout flag returns the retained legacy authorization path without changing a role or stored grant. |
| First Local Authority cutover | `LA_EVENT_REVIEW` is checked against active, selected-function, time-valid, city/zone/ward-matching grants before `localAuthorityModerateEvent` executes. | Enforcement is disabled by default; Local Authority review continues through the existing `mcd` role until the flag is explicitly enabled. |
| Migration grant preparation | A MASTER-confirmed administrator can create a selected-function, scoped, time-bound Local Authority migration grant directly for a retained `mcd` account. | The operation never edits `users.role`; it writes dedicated capability and existing administrator audit evidence in one transaction. |
| Grant expiry | The administrator sees the due count and can batch-persist expired status for active grants past their end time. | The operation is idempotent, requires MASTER and a reason, and writes capability plus administrator audit records for each affected grant. Effective authorization already rejects a past-end grant before the batch is run. |
| Advanced catalog usability | Applicants can filter by audience, required/optional function type, sensitive/standard data handling, and dependency state; they can sort by recommended order, name, function count, or sensitive-data priority. | Filtering and sorting are read-only query controls; application validation and grant lifecycle remain unchanged. |

## Rollout Procedure

The `FITIZEN_CAPABILITY_AUTHORIZATION_ENFORCEMENT` variable is disabled unless it has the exact value `true`. Before enabling it, a master administrator must create a current Local Authority migration grant from **Administrator Console → Capabilities**, select the mandatory Local Authority functions, provide a territory that matches the events to be reviewed, choose a valid date interval, state a reason, and type `MASTER`.

When the flag is set to `true`, only the first migrated execution path—the Local Authority event-review mutation—requires `LOCAL_AUTHORITY` plus `LA_EVENT_REVIEW`, a current selected-function grant, and a matching event territory. A successful grant-backed review also appends `capability.execution_authorized` evidence. Monitoring, MIS export, CSR visibility, organizer paths, CSR paths, and administrator controls retain their existing authorization behavior in this release.

> **Operational rollback:** Set `FITIZEN_CAPABILITY_AUTHORIZATION_ENFORCEMENT` to any value other than the exact lowercase `true`, then restart the application. This immediately restores the retained Local Authority role-based review path without deleting applications, grants, function selections, expiry records, audit evidence, or legacy data.

## Expiry Operations

Grant authorization never depends on a delayed expiry job. A grant ending at or before the current time is rejected as non-current by the centralized decision service even while its stored status is still `active`. The administrator’s **Grant expiry operations** panel persists `expired` status for due grants and captures a reason plus both audit records. No background scheduler was introduced in Stage 4; the master-controlled operation is deliberate, transparent, and safe for the current rollout.

## Validation Gate

The database-backed Stage 4 regression test covered the disabled compatibility path, enforcement denial without a grant, a selected-function city-scoped grant, grant-authorized Local Authority event review, execution audit evidence, controlled expired-grant creation, batch expiry, and complete cleanup. The authorization unit test covered exact time/function/territory matching and strict rollout-flag semantics.

Browser verification confirmed six catalog records with advanced filters, optional-function filtering from six to five matches with query preservation, the administrator migration-grant and zero-state expiry controls, administrator denial at the Local Authority route, retained Local Authority login/workspace data, and the compatibility-mode event-review notice. No browser action submitted an application, grant, expiry batch, or event decision.

Final validation passed with **39 Vitest files and 94 tests**, TypeScript, and the bounded-memory Next.js 16.3.1 production build. Post-suite database verification reported five retained users and profiles, legacy role counts of `admin:1, csr:1, mcd:1, user:2`, six active catalog records, no due active grants, and zero residual Stage 4 test users, events, grants, or audits.
