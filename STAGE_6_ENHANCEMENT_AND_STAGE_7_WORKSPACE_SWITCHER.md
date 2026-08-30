# Stage 6 Enhancement and Stage 7 Workspace Switcher

## Scope and preservation boundary

This delivery completes the requested Stage 6 private-inbox usability enhancement and the document-defined Stage 7 standard-user workspace switcher. It is additive. It introduces no schema migration, role-enum change, persistent workspace-choice record, legacy-role migration, or broad authorization enforcement. Existing `user`, `admin`, `mcd`, and `csr` role values, sessions, ownership, applications, grants, audits, Local Authority workspace, and CSR workspace remain intact.

## Stage 6 inbox enhancement

The existing decision inbox now has a closed, server-supported outcome filter: **all**, **approved**, **returned**, **rejected**, and **grant updates**. A recipient can bulk mark matching unread notices as read or mark one notice at a time. Both database updates include the signed-in recipient predicate and therefore cannot update another account’s notice. The unread count is likewise recipient-scoped and appears only in the eligible standard-user navigation and account menu.

The list and controls use short transform/opacity transitions with a reduced-motion override. The responsive controls wrap instead of overlapping, preserving readable actions on narrow widths. The inbox remains informational: it does not alter application, grant, selected-function, audit, or authorization state.

## Stage 7 eligibility and isolation contract

`getActiveCapabilityWorkspaces(userId, now)` derives workspace entries at request time. It returns a grant only when the feature flag is enabled and the signed-in account’s profile owns a grant whose status is `active`, validity interval contains `now`, linked catalogue capability is active, and grant-function joins resolve to one or more active selected functions. Entries are ordered by catalogue sort order and grant end time.

`getActiveCapabilityWorkspaceContext(userId, capabilityCode, grantId, now)` applies the same constraints to every dynamic URL. It additionally requires a safe uppercase capability code, a positive grant ID, and an exact grant/capability-code match. Invalid, foreign, expired, future-dated, suspended, inactive-catalogue, or functionless requests return no context. The route redirects that failure safely to `/dashboard/workspaces`; it does not reuse an earlier workspace payload.

The workspace index is `/dashboard/workspaces`. Valid links use `/dashboard/workspaces/[capabilityCode]?grant=[grantId]`; the destination shows only the validated capability, current selected functions, approved territory, and validity. It deliberately grants no new execution action. The standard navigation adds **Workspaces** only when an eligible workspace exists; the account menu can list eligible entries. The retained Local Authority and CSR role workspaces are neither turned into dynamic workspaces nor altered.

## Rollback

Set `FITIZEN_CAPABILITY_WORKSPACE_SWITCHER_ENABLED=false` and restart the application to remove Stage 7 workspace navigation and surfaces. The workspace index redirects to `/dashboard/my-bookings`; dynamic routes cannot resolve a workspace context. This hides the navigation aid only. It does not delete or edit capabilities, selected functions, grants, application records, roles, or audit evidence.

Set `FITIZEN_CAPABILITY_DECISION_NOTIFICATIONS_ENABLED=false` and restart to hide the inbox and stop future decision-notice writes. Existing notification rows, applications, grants, audits, roles, and legacy workflows remain unchanged.

## Validation evidence

Focused database-backed tests verify recipient-only filtered bulk read, unread counting, active selected-function workspace derivation, direct URL rejection for a wrong capability code or fake grant, and withdrawal of a suspended grant workspace. Their cleanup check reported zero Stage 7 test users, notifications, applications, grants, and audit records. Desktop browser validation confirmed the authenticated participant’s workspace empty state and capability dashboard rendered without overlap. The managed screenshot runner does not inherit the authenticated browser session; its unauthenticated mobile protected views are intentionally blank and were not treated as product failures. Source review confirms the mobile switcher uses min-width-safe grid items, wrapping metadata, and narrow-view padding.

The final validation run passed `pnpm check`, **41 Vitest files / 100 tests**, and `NODE_OPTIONS=--max-old-space-size=768 NODE_ENV=production pnpm build`. Final database preservation verification reported five users and five profiles with unchanged legacy role counts (`admin:1`, `csr:1`, `mcd:1`, `user:2`), six catalogue records, no active grants or stored decision notifications, and no Stage 7 test residue. The inspected clean source archive contains 358 entries and excludes dependencies, build output, legacy Vite source/configuration, logs, secrets, local databases, and Manus metadata.
