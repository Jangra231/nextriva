# Stage 5 Completion — Selective MIS/CSR Authorization and Grant Reminders

**Stage status:** Complete and validated. Stage 5 extends the centralized capability decision service to two additional Local Authority/CSR execution areas while leaving all other retained workflows on their established role-based authorization paths.

## Delivered Controls

| Control | Stage 5 behavior | Compatibility protection |
| --- | --- | --- |
| Local Authority MIS export | Valid XLSX/PDF MIS downloads can require `LOCAL_AUTHORITY` + `LA_MIS_EXPORT`, a current selected-function grant, and national scope. | `FITIZEN_CAPABILITY_MIS_EXPORT_ENFORCEMENT` is disabled unless it is the exact lowercase value `true`; the existing Local Authority role guard remains authoritative otherwise. |
| CSR brief submission | A submitted sponsorship brief can require `CSR_SPONSORSHIP` + `CSR_BRIEF_SUBMIT`, a current selected-function grant, and matching city/zone/ward scope. | `FITIZEN_CSR_CAPABILITY_AUTHORIZATION_ENFORCEMENT` is disabled by default; the retained CSR role continues to own its existing brief workflow until deliberately enabled. |
| CSR impact export | Valid XLSX/PDF CSR reports can require `CSR_SPONSORSHIP` + `CSR_IMPACT_VIEW`, a current selected-function grant, and national scope. | The same disabled-by-default CSR flag retains the existing protected sponsor-export behavior until rollout. |
| CSR migration grants | A master administrator can create a direct, selected-function, scoped, time-bound CSR migration grant for a retained `csr` account. | This does not change `users.role`, profile identity, budget, request ownership, event ownership, or historic CSR data. |
| Execution audit evidence | A successful enforced CSR brief submission, Local Authority MIS export, or CSR impact export appends dedicated `capability.execution_authorized` evidence. | Invalid export formats are rejected before execution evidence is written. |
| Expiring-grant reminders | Capability, CSR, and Local Authority dashboards display active grants ending within 30 days, with urgent (seven-day) and expired states. | The widget is read-only and does not alter grant status. MASTER-controlled expiry processing remains the Stage 4 operation. |
| Responsive layout refinement | Catalog controls, cards, request controls, governance controls, and grant reminders now use minimum-width guards, wrapping, small-screen single-column layouts, and protected long-text handling. | Existing design tokens, routes, form actions, and dashboard content remain unchanged. |

## Rollout Procedure and Rollback

Start each Stage 5 rollout only after a master administrator creates the appropriate migration grant at **Administrator Console → Capabilities**, confirms required functions and dependencies, sets valid dates, provides an accurate scope, records a reason, and enters `MASTER`. For Local Authority MIS, the grant must include the optional `LA_MIS_EXPORT` function and use national scope. For CSR brief submission, the grant must include `CSR_BRIEF_SUBMIT` and cover the sponsor’s preferred territory. For CSR impact export, it must include `CSR_IMPACT_VIEW` and use national scope.

Set `FITIZEN_CAPABILITY_MIS_EXPORT_ENFORCEMENT=true` only to protect Local Authority MIS downloads. Set `FITIZEN_CSR_CAPABILITY_AUTHORIZATION_ENFORCEMENT=true` only to protect CSR brief submission and CSR impact downloads. The existing Stage 4 `FITIZEN_CAPABILITY_AUTHORIZATION_ENFORCEMENT=true` remains the separate event-review rollout. Restart the application after changing a flag.

> **Operational rollback:** Set either Stage 5 flag to any value other than the exact lowercase `true`, then restart. This restores the retained Local Authority or CSR role-based path immediately, without deleting grants, functions, applications, audit evidence, CSR budgets, CSR requests, event assignments, or legacy account data.

## Deliberately Deferred Scope

Stage 5 does not grant-gate CSR budget creation, CSR draft editing, administrator CSR review, event assignment, budget commitment, Local Authority monitoring, Local Authority report-page rendering, venue operations, organizer workflows, or administrator actions. These paths retain their established protections and require a later, separately validated migration if centralized grants are needed.

## Reminder Semantics

The alert widget reads only active grants that have started and end within the next 30 days. It shows an expired state for an active record whose end date has elapsed, an urgent state within seven days, and an upcoming state otherwise. Effective authorization continues to reject an ended grant even if a master administrator has not yet run the batch expiry operation. No scheduler, automatic grant status mutation, notification delivery, or fabricated reminder data was introduced.

## Validation Gate

The focused Stage 5 database-backed test covered disabled compatibility for MIS export and CSR brief submission, denial without selected-function grants, national Local Authority MIS authorization, city-scoped CSR brief authorization, capability execution evidence, alert-query classification, and cleanup. Cleanup verification confirmed zero temporary Stage 5 users, grants, requests, or capability audit rows.

Browser review confirmed the Local Authority grant-reminder widget sits between the header and metrics without overlap; the participant dashboard retains navigation and renders grant reminders, six advanced filters, and six catalog cards with clear spacing. The protected unauthenticated narrow preview intentionally returns an empty protected shell, so it was not treated as a visual route failure; mobile-safe layout rules were verified in source and compile/build checks. No browser export, grant, expiry, application, or event mutation was submitted.

Final validation passed with **40 Vitest files and 96 tests**, TypeScript, and a bounded-memory Next.js 16.3.1 production build. Final database verification preserved `users=5`, `profiles=5`, legacy role counts of `admin:1, csr:1, mcd:1, user:2`, six active catalog records, zero active/due grants, and zero residual Stage 5 test data.
