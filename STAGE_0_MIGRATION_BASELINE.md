# Stage 0 Migration Baseline

**Status:** Complete as a documentation-only inspection.  
**Data changes:** None.  
**Authentication changes:** None.  
**Prepared for:** Stage 1 terminology compatibility only.

## Executive baseline

Fitizen is an **Next.js 16.3.1 App Router** application with server-rendered pages, route handlers, server actions, and a custom password-plus-JWT session implementation. The current application is already a modern Next.js codebase, but its authorization model is still centered on four database role values—`user`, `admin`, `mcd`, and `csr`—with dedicated MCD and CSR routes. The staged document therefore requires a carefully additive compatibility migration rather than a direct role rename or route removal.[1] [2] [3]

The current platform has working organizer/participant flows, a master administrator console, a separate MCD public-health workspace, and a separate CSR sponsorship workspace. The CSR workflow must remain a protected operational baseline through all later capability work: it currently supports owned briefs, administrator review, one live-event assignment, budget commitment at assignment, scoped impact, and audit logging.[3] [4]

> **Stage 0 conclusion:** No database or authorization migration should begin until Stage 1 introduces a safe MCD/BMC-to-Local-Authority compatibility layer. Stage 2 must then retain the old role values behind a feature flag while the new `PLATFORM_ADMIN` and `USER` account model is tested.

## Current architecture inventory

| Area | Current implementation | Stage migration implication |
|---|---|---|
| Framework and routing | Next.js `16.3.1` with App Router. Active pages live below `app/`; dynamic event and create-event routes are already in place. [1] | Preserve every existing public, dashboard, `/admin`, `/mcd`, and `/csr` route until a tested replacement exists. |
| Server operations | Form submissions use server actions in `app/actions.ts`; APIs use App Router route handlers below `app/api/`. [3] | Central capability checks must be introduced into both server actions and route handlers, not only navigation. |
| Session | `fitizen_session` is an HTTP-only, secure, partitioned JWT cookie. The JWT subject is the numeric primary key of `users`; the live user record is loaded on each request. [2] | The future two-account model can preserve a person’s existing numeric `users.id` as its session identity. |
| Password authentication | Password users are stored in `users.passwordHash`; hashes use `scrypt`; passwords are validated with timing-safe comparison. [2] | Do not replace the current login flow during terminology work. Preserve credential compatibility in Stage 2. |
| Database and ORM | MySQL/TiDB through `mysql2`, Drizzle ORM, `drizzle/schema.ts`, and migrations `0000` through `0024`. [1] [5] | Future schema changes must be additive Drizzle migrations, reviewed before apply, with no table drop or destructive role-enum edit. |
| Identity | `users.id` is the relational primary key; `users.publicId` is a unique public ID generated as `USR-…`; events similarly have permanent `EVT-…` public IDs. [4] | The target model must map all legacy role behavior to the same existing user ID; it must not create replacement user records. |
| Audit | `adminAuditLogs` records administrator ID, action, entity, before state, after state, and timestamp. [4] | Stages 2–11 must extend this audit chain for account mapping, capability applications, grants, functions, scopes, and decisions. |

## Current role and workspace model

The `users.role` enum currently contains `user`, `admin`, `mcd`, and `csr`. These are used directly in server-side helper functions and server-action guards. `admin` is the master role; `mcd` is granted the public-health authority console; and `csr` is granted the sponsor workspace. A standard `user` can use both participant and organizer navigation under one current account.[3] [6] [7]

| Current value | Current entry point | Current server guard | Compatibility treatment required later |
|---|---|---|---|
| `user` | `/login`, participant and organizer dashboard routes | `requireUser` and current-user checks | Map to target `USER` while retaining the existing `users.id` and standard workspace. |
| `admin` | `/admin/login`, `/admin` | `requireAdministrator` and `isAdministrator` | Map to target `PLATFORM_ADMIN`; retain master controls and audit behavior. |
| `mcd` | `/mcd/login`, `/mcd` | `requireMcdAuthority` and `isMcdAuthority` | Preserve value and route temporarily; Stage 1 maps terminology to `LOCAL_AUTHORITY` and changes UI labels safely. |
| `csr` | `/csr/login`, `/csr` | `requireCsrSponsor` and `isCsrSponsor` | Preserve the operational CSR workflow until an active CSR capability grant has an end-to-end replacement. |

The dedicated role redirects are a key migration risk. Standard dashboard code redirects `mcd` users to `/mcd` and `csr` users to `/csr`; authentication also chooses MCD or CSR destinations from the direct role value. These checks need a compatibility adapter in later stages rather than an immediate replacement.[3] [7]

## Compatibility-sensitive routes and workflows

| Surface | Current route or module | Preservation requirement |
|---|---|---|
| Public event discovery and registration | `/`, `/events`, `/events/[slug]`, `/events/[slug]/register` | Must remain public/participant-compatible throughout the migration. |
| Organizer and participant workspace | `/dashboard/*`, `DashboardShell` | Must remain the default `USER` workspace after Stage 7. Current organizer/participant switching must not be broken. |
| Administrator console | `/admin`, `/admin/login`, `AdminShell`, `AdminMasterControl` | Must remain the full platform configuration and audit surface while its internal role name transitions to `PLATFORM_ADMIN`. |
| MCD authority console | `/mcd`, `/mcd/login`, `McdShell`, MCD MIS export | Must remain reachable via a compatibility layer while user-facing terminology transitions to **Local Authority**. |
| CSR workspace | `/csr`, `/csr/login`, `CsrShell`, CSR exports and sponsorship actions | Must preserve draft, submit, return, reject, assignment, budget, scoped event, impact, and report behavior. |
| Venue and geography workflows | `/admin?view=venues`, Create Event location tools, availability API | Future scope enforcement must preserve location/date reservation protection and administrator overrides. |
| Reports and exports | `/api/exports/admin`, `/api/exports/attendees`, `/api/exports/csr`, `/api/exports/mcd`, `/api/exports/reports`, `/api/exports/venues` | Later capability authorization must cover direct export requests and scoped queries, not only UI links. |

## Current data model inventory

The platform already separates key business domains. The primary compatibility-sensitive tables are `users`, `events`, `registrations`, `adminAuditLogs`, `csrProfiles`, `csrBudgets`, legacy `csrSponsorships`, current `csrSponsorshipRequests`, approved venues, venue approvals, tickets, and promotions. The current CSR request table is additive and contains sponsor profile ownership, budget, request kind, event preferences, status, administrator review fields, and one assigned event reference.[4]

The legacy direct sponsorship and implementation-agency tables remain in the schema strictly for historical preservation. Their existence is not evidence that they remain an active user-facing requirement. No Stage 1 or Stage 2 work should remove them; later migration mapping must keep historic foreign-key links readable.[4]

## Current tests and operational commands

| Purpose | Command | Baseline use |
|---|---|---|
| Development server | `pnpm dev` | Local development and browser review. |
| Type safety | `pnpm check` | Required before every stage checkpoint. |
| Automated regression suite | `pnpm test` | Required before enabling a migrated feature. The current suite includes role, CSR, MCD, venue, payments, exports, workflow, and integration coverage. |
| Production build | `NODE_OPTIONS=--max-old-space-size=768 NODE_ENV=production pnpm build` | Required final validation on constrained environments. |
| Migration generation and apply | `pnpm drizzle-kit generate`, then review SQL, then `pnpm drizzle-kit migrate` | Never run against production without reviewed SQL and a verified backup. [1] [5] |

## Backup and export plan before any schema or account migration

The application source archive and checkpoint are not substitutes for a database backup. Before applying **any** later migration, the deployment owner must create a database-provider snapshot or a logical MySQL/TiDB export using a read-consistent process such as `mysqldump --single-transaction --routines --events`. The backup must be encrypted, stored outside the application repository, access-restricted, timestamped, and verified through a restore drill against an isolated environment.

| Backup layer | Required artifact | Verification before migration |
|---|---|---|
| Source | Saved web-project checkpoint and clean source ZIP | Confirm checkpoint restores the current code and lockfile. |
| Database schema | Provider snapshot or schema-only export | Confirm all tables, indexes, enum definitions, and migration ledger are present. |
| Database data | Encrypted consistent logical dump or provider point-in-time snapshot | Confirm row counts for `users`, `events`, `registrations`, `csrProfiles`, `csrBudgets`, `csrSponsorshipRequests`, and `adminAuditLogs` after a test restore. |
| Object storage | Export of keys and metadata for covers, avatars, payment proofs, and related uploads | Confirm referenced object keys resolve in the restore environment. |
| Migration evidence | Reviewed migration SQL, checksum, deployment timestamp, operator, and feature-flag state | Attach to the stage report before feature enablement. |

No production dump was created during Stage 0 because this workspace must not copy or alter production data without the deployment owner’s controlled backup location and retention policy.

## Rollback plan

Rollback must favor **disabling new behavior over deleting data**. MySQL DDL must be treated cautiously because many schema changes are not safely reversible inside a general transaction. Each future stage should therefore add columns/tables/indexes where possible, leave legacy values intact, and use a feature flag to select the old or new authorization path.

| Failure point | Immediate containment | Safe recovery |
|---|---|---|
| New terminology causes UI or route issue | Disable the terminology feature flag or keep old route redirect active | Restore the saved code checkpoint; preserve existing `mcd` values and re-test mapping. |
| New account mapping has an incorrect decision | Disable new account-model flag | Correct mapping through a separate audited migration; never generate replacement users. |
| Capability grant authorization is too broad or too strict | Disable capability workspace entry and retain legacy route behavior | Restore the prior checkpoint, inspect audit evidence, then correct scope/function checks using additive data changes. |
| Migration deployment failure | Stop rollout before enabling feature flags | Restore provider snapshot only under an approved incident procedure; otherwise keep additive columns/tables inactive and deploy prior code. |
| CSR regression | Disable capability-based CSR entry only; keep current tested `/csr` compatibility workspace operational | Restore code checkpoint and preserve all sponsorship requests, assignments, budgets, and audit entries. |

## Stage 0 acceptance evidence

| Required Stage 0 result | Evidence recorded | Status |
|---|---|---|
| Existing architecture documented | Next.js, App Router, server actions, API routes, session design, and test/build commands are recorded above. | Complete |
| Existing user and role model documented | Current `user`, `admin`, `mcd`, and `csr` values, route guards, redirects, and public IDs are documented. | Complete |
| Existing CSR routes and actions identified | CSR login, workspace, exports, request actions, admin review, and assignment boundaries are listed above. | Complete |
| Database backup/export plan documented | Provider snapshot, encrypted logical dump, restore verification, object-storage, and evidence procedures are specified. | Complete |
| Rollback plan documented | Feature-flag-first containment, source checkpoint restore, additive schema recovery, and CSR continuity controls are specified. | Complete |
| No destructive change | Only documentation files were added in Stage 0. No schema, database, authentication, role, route, or user data was changed. | Complete |

## Known migration risks to carry into Stage 1

The most immediate risk is the widespread direct `mcd` role and `/mcd` route assumption in authentication, page guards, server actions, navigation, exports, tests, documentation, and demo-account wording. Stage 1 must introduce a single compatibility mapper before changing labels, and it must prove that historic values still resolve correctly.[3] [6] [7]

The second risk is that CSR is currently a direct role rather than a capability grant. Stage 2 must not force existing CSR accounts into a newly created user identity, and Stage 8 cannot replace the active CSR workspace until capability-based assignment, data scope, reporting, and all blocked-route tests are complete.[3] [4]

## Stage 1 entry criteria

Stage 1 may begin only after the Stage 0 checkpoint is saved. Its scope is strictly limited to terminology compatibility: introduce `LOCAL_AUTHORITY` as a compatibility code, display **Local Authority** to users, preserve historic MCD/BMC values, retain tested old routes while a new safe route is introduced, and add idempotency and compatibility tests. It must not implement the two-account model yet.

## References

[1]: ./package.json "Fitizen runtime, dependencies, and commands"
[2]: ./app/lib/auth.ts "Current custom JWT session and password implementation"
[3]: ./app/actions.ts "Current server actions, login routes, and role guards"
[4]: ./drizzle/schema.ts "Current relational schema, roles, CSR, event, registration, and audit models"
[5]: ./drizzle.config.ts "Drizzle MySQL migration configuration"
[6]: ./app/lib/admin.ts "Current role helper and dedicated workspace guards"
[7]: ./app/components/DashboardShell.tsx "Current standard user dashboard role redirects"
[8]: ./app/components/McdShell.tsx "Current MCD-specific navigation surface"
[9]: ./app/components/CsrShell.tsx "Current CSR-specific navigation surface"
[10]: ./SETUP.md "Current operational setup, migration, test, and deployment guidance"
