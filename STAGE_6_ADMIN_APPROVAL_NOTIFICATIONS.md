# Stage 6 Completion — Administrator Approvals and Owner-Scoped Decision Notifications

**Stage status:** Complete and validated. The document-defined Stage 6 review/grant gate was reconciled against the Stage 3–5 implementation. Selective function grants, dates, scope, reasons, MASTER confirmation, capability audits, administrator audits, and safe rollback already met the core acceptance gate. Stage 6 additively closes the missing owner-notification requirement.

## Administrator Approval Gate

| Requirement | Delivered behavior | Preservation control |
| --- | --- | --- |
| Selective functions | An administrator may grant fewer optional functions than requested; the server rejects unrequested, inactive, missing mandatory, and dependency-incomplete selections. | Unchecked functions are never inserted into `capabilityGrantFunctions` and therefore cannot be authorized by a later rollout. |
| Scope, dates, and reason | Approval validates the territory and bounded time window, then retains the decision reason. | Stored legacy roles, ownership, events, CSR records, sessions, and public IDs are not edited. |
| MASTER and audit | Review, grant status update, direct migration grant, and expiry operations remain MASTER-confirmed and commit capability plus administrator audit evidence. | Audit history is append-only; legacy authorization remains present until a separate rollout flag is enabled. |
| Decision inbox | The applicant now receives a private in-app notice for return, rejection, approval/grant creation, grant status change, direct migration grant, and batch expiry. | The inbox is additional context only; the application/grant records remain authoritative and an owner can read or mark only their own notifications. |

## Additive Persistence and Transactional Behavior

Migration `0030_gorgeous_sprite.sql` adds the `capabilityDecisionNotifications` table. It references the recipient user plus optional application/grant records, retains a type, title, reason body, action route, read state, and creation time, and indexes owner inbox reads. The migration is additive and does not modify any existing account, role, event, ownership, CSR, profile, audit, or grant row.

When enabled, application return/rejection/approval, grant status changes, batch expiry, and direct Local Authority/CSR migration grants write the recipient notification within the same transaction as the lifecycle state and audit records. A failure rolls the decision state, audit evidence, and notification back together. A direct mark-read action includes the recipient user in its update predicate, preventing cross-user inbox access.

## Rollback

`FITIZEN_CAPABILITY_DECISION_NOTIFICATIONS_ENABLED` is enabled unless set to the exact lowercase value `false`. With `false`, the applicant inbox is hidden and no future capability decision-notification record is inserted. Review, grant, expiry, authorization, applications, roles, and historic data continue unchanged; existing notice rows are retained. Restart the application after changing this flag.

> **Stage 7 boundary:** The inbox does not select a workspace or grant a menu. Only active approved capability workspaces and selected functions may appear in a future central workspace switcher, and that switcher must retain scope and data-context isolation.

## Validation Gate

The focused lifecycle regression covered a draft, submission, requested revision, resubmission, selective approval, time-bound grant, suspension, three private decision-notification types, audit evidence, and cleanup. The feature-flag test verifies default-enabled and exact-string disable behavior. Browser verification created one isolated temporary participant notice, confirmed its wrapped responsive card and owner-scoped mark-read transition, then removed it. The capability grant copy was also updated to accurately describe the current selective rollout rather than the earlier Stage 3-only boundary.

Final validation passed with **40 Vitest files and 97 tests**, TypeScript, and a bounded-memory Next.js 16.3.1 production build. Final database verification retained five users/profiles and the legacy `admin:1, csr:1, mcd:1, user:2` role counts, reported six active catalog records and zero persisted decision notifications, due grants, temporary test users, applications, grants, or decision notices.
