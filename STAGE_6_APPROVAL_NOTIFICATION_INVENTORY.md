# Stage 6 Administrator Approval Reconciliation

## Document Gate Reconciliation

| Stage 6 requirement | Existing delivery | Reconciliation result |
| --- | --- | --- |
| Application review | Master administrator review is limited to submitted applications. | Complete since Stage 3. |
| Fewer selected functions than requested | The administrator can choose only requested function IDs; server validation permits fewer optional functions while requiring every mandatory requested function and dependency. | Complete since Stage 3. |
| Dates, scope, reason | Approval validates scope/date fields and writes the administrative reason. | Complete since Stage 3. |
| Grant and audit controls | Approval/grant state plus capability and administrator audit evidence commit transactionally. | Complete since Stage 3; status/expiry controls were strengthened in Stages 4–5. |
| Notification | Applicants can currently discover an outcome only by reopening the capability page; there is no general owner-scoped approval-decision inbox. | Missing; Stage 6 must add a non-destructive decision-notification record and UI. |

## Stage 6 Minimal Additive Scope

The implementation will create an owner-scoped capability decision notification after an administrator returns, rejects, approves, suspends, revokes, expires, or batch-expires a capability lifecycle item. The record will show a concise decision title, administrative reason, relevant application/grant reference, action route, read state, and timestamp. The notification write will share the administrator lifecycle transaction so no approval/grant state commits without its corresponding owner notice.

The application status and grant status panels remain authoritative; the notification is an additional inbox signal, not a new authorization source. Email, SMS, scheduled reminders, arbitrary cross-user notification access, automated grant decisions, legacy role changes, event ownership changes, and CSR funding changes are explicitly out of scope.

## Compatibility and Rollback

`FITIZEN_CAPABILITY_DECISION_NOTIFICATIONS_ENABLED` will default enabled. Setting the exact value `false` will hide the new applicant notification surface and prevent future decision-notification inserts while retaining all existing application, grant, audit, and legacy behavior. Existing stored notification records remain untouched. The underlying Stage 3–5 review and grant lifecycle does not depend on this flag.
