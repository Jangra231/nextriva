# Enhanced Stage 6 and Stage 7 Workspace Inventory

## Owner-Scoped Decision Inbox Boundaries

| Requirement | Safe implementation boundary |
| --- | --- |
| Advanced outcome filtering | Filter only the signed-in user’s existing decision notifications by a closed set of unread/application/grant/approved/returned filters. Query parameters never broaden the recipient predicate. |
| Bulk action | Provide only non-destructive bulk mark-read. The server first selects unread records belonging to the signed-in user, validates the requested filter, and updates only those IDs. No bulk delete, application status change, grant change, or audit rewrite is introduced. |
| Unread badge | Expose a count of the signed-in user’s unread decision notices in existing participant navigation/profile menu; do not reveal any other user’s count. |
| Motion | Use short opacity/transform entry transitions, action feedback, visible focus states, and a reduced-motion fallback. No layout-changing animation is required. |

## Stage 7 Eligibility and Isolation Contract

| Concern | Stage 7 contract |
| --- | --- |
| Eligible workspace | A capability is eligible only where the signed-in account has at least one active grant with a start time at or before now, an end time after now, an active catalog entry, and at least one active selected function. |
| Selected functions | The workspace entry is populated only from `capabilityGrantFunctions` joined to the user’s current eligible grant(s); it does not infer a function from an application, legacy role, or catalog record. |
| Workspace route | A generic `/dashboard/workspaces/[capabilityCode]` landing page validates the same server-side eligibility contract before showing grant scope/function details. A hand-crafted or expired/suspended route cannot expose another workspace context. |
| Legacy continuity | Participant/organizer navigation and the retained `/local-authority` and `/csr` role-based workspaces stay untouched. The Stage 7 switcher is additive and does not convert a grant to current Local Authority/CSR execution access. |
| Rollback | `FITIZEN_CAPABILITY_WORKSPACE_SWITCHER_ENABLED` defaults enabled. Exact `false` hides dynamic workspace navigation and redirects direct dynamic workspace routes to the retained participant dashboard without mutating grants, roles, applications, or audits. |

The current production-equivalent data has no active grants. Browser verification therefore requires isolated temporary grant data with guaranteed cleanup; the zero-state must not fabricate an approved workspace.
