# Fitizen Staged Capability Migration Roadmap

## Purpose

This roadmap translates the uploaded **Staged Next.js Migration Prompts** document into a controlled migration plan for the existing Fitizen platform. The target is not a cosmetic role rename. It is a safe transition from separate role-oriented workspaces to two account types—`PLATFORM_ADMIN` and `USER`—with independently approved, scoped, time-bounded capability grants.

> **Operating rule:** A stage is complete only when its selected functions have a working page or action, server authorization, scoped query, persisted state change, audit evidence, and a passing validation suite. A visible menu alone never proves a capability is operational.

## Non-negotiable preservation controls

| Control | Delivery requirement |
|---|---|
| Existing data | Never delete or rename a production table, historic account, ownership record, audit entry, or sponsorship record as part of a stage. Use additive migrations, compatibility mappings, and traceable legacy references. |
| Rollback | Every stage documents the migration identifier, feature flag behavior, reversible code path, and safe rollback procedure before wider activation. |
| Compatibility | Existing routes and role checks remain available until a tested replacement has been released behind a feature flag. Old MCD/BMC values must resolve safely while Local Authority terminology is introduced. |
| Authorization | The server decides whether a user can access a capability, function, scope, record, report, or export. Browser-sent capability and scope values are never trusted. |
| Validation | Each stage requires targeted tests, full regression testing, a production build, browser verification of affected flows, and a written evidence record before the next stage begins. |
| Release packaging | Every completed implementation stage receives a checkpoint and a clean Next.js-only source archive. |

## Stage sequence and delivery gates

| Stage | Scope | Main deliverable | Hard acceptance gate |
|---|---|---|---|
| 0 | Architecture, backup, and rollback inspection | Written migration baseline, compatibility inventory, backup/export plan, and rollback playbook | No data or authentication change; current architecture, roles, routes, commands, and critical workflows are documented. |
| 1 | MCD/BMC terminology compatibility | `LOCAL_AUTHORITY` compatibility layer, Local Authority UI terminology, idempotent mapping | Historic MCD/BMC records remain readable; old routes resolve safely; no user-facing MCD/BMC wording remains in the migrated surface. |
| 2 | Two account types | Additive `PLATFORM_ADMIN` and `USER` model, legacy mapping, feature flag, session compatibility | Every person retains one permanent user identity; legacy ownership remains intact; old and new sign-in paths coexist safely. |
| 3 | Capability data model | Capability catalog, applications, grants, function selections, scopes, dates, and audit model | Capabilities, scopes, and selected functions persist separately without altering existing user or event data. |
| 4 | Central authorization | Server helpers and scoped query enforcement | Direct URLs, modified requests, expired grants, suspended grants, and out-of-scope access are all denied. |
| 5 | Authority applications | Organiser-side application forms and secure document workflow | CSR, Local Authority, District-Level, and State-Level applications can draft, submit, return, revise, and persist without auto-granting access. |
| 6 | Administrator approvals | Application review, selective function grants, dates, scope, reason, notification, and audit controls | Administrators can grant fewer functions than requested; unchecked functions never enter a grant or become executable. |
| 7 | Workspace selection | Central user workspace switcher and dynamic navigation | Only active approved capability workspaces and selected functions appear; switching workspaces cannot leak prior data context. |
| 8 | Complete CSR capability | Operational CSR requests, reviews, assignment, limited data access, funding, impact, and repeat requests | CSR can see only administrator-assigned events and approved fields; each sponsorship request receives independent review and assignment. |
| 9 | Authority capabilities | Local Authority, District-Level, and State-Level functions connected through grants | Each authority action is selected-function-only, scope-limited, audited, and regression-tested. |
| 10 | Health history | Append-only daily health model with separate corrections | Prior health entries remain immutable; permissions and exports are scope-limited and audited. |
| 11 | Controlled cutover | Pilot rollout, reconciliation, monitored feature-flag enablement, and legacy retirement plan | All selected workflows pass end-to-end; rollback remains available; legacy data is preserved. |

## CSR continuity requirement

The current CSR sponsorship workflow must be treated as a protected functional baseline rather than removed during the migration. After a CSR capability grant becomes active, the user must be able to create a separate sponsorship request, receive an administrator decision, revise a returned request, receive a single administrator-assigned event, view only that assigned event and administrator-approved participant fields, and track approved funding and impact. A subsequent sponsorship request must receive an independent request ID, review, and assignment.

| CSR boundary | Required enforcement |
|---|---|
| Event visibility | A CSR user cannot browse the general event catalog through the capability workspace, an altered URL, an export, or a hand-crafted request. |
| Assignment | Only the platform administrator can assign one suitable event after an approved request. A CSR user cannot self-assign or change the organiser, venue, date, capacity, or participant information. |
| Participant and health data | Only administrator-approved fields for the assigned event can be queried. Unrestricted personal profiles, address information, identity documents, unrelated participants, and health information remain unavailable. |
| Funding lifecycle | Budget commitment, sponsorship status, reporting, and completion must be transactionally linked and audited. A later request never inherits approval from an earlier request. |

## Mandatory validation for every implementation stage

Each implementation stage will have a stage-specific test matrix covering authorization failures, compatibility behavior, data-preservation checks, retry/idempotency behavior, primary user path, administrator path, direct-route denial, export/report scope, browser rendering, TypeScript, full automated suite, and a bounded-memory production build. I will not advance to the next stage until every relevant item passes or an explicitly documented blocker is resolved.

## Immediate next stage

**Stage 0** is the correct next step. It is intentionally non-destructive: it produces a repository-specific architecture report, a route and role inventory, current command verification, a data backup/export plan, and a rollback plan. It does not modify authentication, database records, user IDs, or current workflows.
