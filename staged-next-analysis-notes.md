# Staged Next Migration Analysis Notes

## Document purpose

The uploaded document defines a **stage-by-stage migration** from multiple role-specific account types to a centralized two-account model with capability grants, while keeping the existing workflows working throughout the transition.

## Final target model captured from the document

- Account types reduce to `PLATFORM_ADMIN` and `USER`.
- Additional authority modes become **capabilities**, not separate account types.
- Required capabilities listed in the document are `CSR`, `LOCAL_AUTHORITY`, `DISTRICT_LEVEL`, and `STATE_LEVEL`.
- The current MCD/BMC naming must be safely migrated to **Local Authority** with backward compatibility.

## Global stage rules captured from the document

- No destructive schema or route changes without rollback planning.
- Keep compatibility layers while old and new models coexist.
- Use feature flags for risky cutovers.
- Enforce permissions on the server and in the UI.
- Add tests before enabling migrated features broadly.
- End every stage with changed files, database changes, tests, known issues, and rollback steps.

## Stage summary captured so far

### Stage 0

- Architecture inspection only.
- Must document current Next.js stack, auth/session model, ORM/schema/migrations, existing user types, CSR and authority flows, route compatibility, commands, backup/export plan, and rollback plan.

### Stage 1

- Introduce terminology compatibility only.
- Rename MCD/BMC-facing behavior to `LOCAL_AUTHORITY` internally and **Local Authority** in the UI.
- Must preserve historical values, add compatibility mapping, safe redirects if needed, and idempotent migration coverage.

### Stage 2

- Add `PLATFORM_ADMIN` and `USER` without removing old access.
- Must keep compatibility mappings, avoid duplicate users, preserve ownership, support both models behind a feature flag, and audit migration/account mapping decisions.

### Stage 3

- Create capability catalog, capability grants, capability applications, scope, dates, statuses, selected function codes, and audit records.
- Existing user/event data must remain unchanged.

### Stage 4

- Implement server-side authorization helpers and scope enforcement before UI migration.
- Must block unchecked, expired, suspended, revoked, and out-of-scope access at the backend level.

### Stage 5

- Add authority applications from the Organiser workspace.
- CSR, Local Authority, District-Level, and State-Level forms must support real persistence, draft/save/resubmit behavior, and secure document handling.

### Stage 6

- Administrator reviews authority applications and grants only selected functions.
- Must support approve, return, reject, selective function assignment, preview, notifications, and audit records.

### Stage 7

- Build central workspace selection and dynamic navigation.
- Standard user workspace always remains visible; capability workspaces appear only for active grants and only with granted functions.

### Stage 8

- Preserve the CSR workflow as a **fully operational** capability workspace.
- Requirements captured from visible pages include: request draft and submit, administrator review, administrator event assignment, CSR-only assigned-event view, limited approved participant information, funding and impact tracking, separate approval for every additional sponsorship request, and strict restrictions preventing self-approval/self-assignment or unrestricted data access.

### Stage 9

- Connect Local Authority, District-Level, and State-Level functions to the new capability model using only selected approved functions and scope enforcement.

### Stage 10

- Implement append-only daily health history with immutable prior records and audited corrections.

### Stage 11

- Remove legacy access only after complete migration validation, pilot rollout, and rollback readiness.

## CSR-specific constraints captured from the visible later pages

- Show only events assigned to the CSR user.
- Do not show unrelated events, unassigned concepts, or another CSR user’s events.
- Limit participant visibility to approved fields only.
- Every new CSR request must create a separate request ID and go through separate administrator review and event assignment.
- CSR cannot approve its own request, assign itself an event, alter assigned event attributes, or access unrestricted personal or health information.

## Immediate implication for implementation order

- The document expects **Stage 0 first**, with written architecture and migration reporting before any migration or terminology implementation begins.

## Final document guardrails

The final end-to-end path requires one permanent user identity to move from standard participant/organiser workspaces through an authority application, selected function approval, scope and date activation, a working CSR sponsorship request, administrator review, administrator assignment of a single event, limited assigned-event data access, funding and impact updates, and a separately reviewed second request. The document explicitly states that a capability is not complete merely because a menu appears; every selected function must prove its UI action, server authorization, scoped data query, database operation, resulting status, notification, and audit record. Unselected functions must remain hidden and backend-blocked.

The document also requires the team to begin at Stage 0, stop after each acceptance checklist, document the outcome, run tests, commit the changes, and defer any incomplete function rather than activating it. Legacy access can be disabled only after pilot validation demonstrates that the new two-account and capability workflow works end-to-end and remains rollback-ready.
