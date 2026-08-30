# Fitizen India Rebuild — Setup Guide

This archive contains the complete **Next.js Fitizen India Rebuild** source code, including the organizer six-step Create Event flow, approved venue directory, venue availability calendar and watches, administrator controls, public event discovery, reporting, manual payments, CSR sponsorship briefs, Stage 10 consented participant event-day history, aggregate authority analytics, expiring-grant reminders, and tests.

> **Security note:** The archive deliberately excludes `node_modules`, build output, runtime logs, database dumps, generated checkpoints, and all `.env*` files. Create fresh secrets in your own environment.

## 1. Requirements

| Requirement | Recommended version or service |
| --- | --- |
| Node.js | 22.x or later |
| Package manager | pnpm 10.x |
| Database | MySQL 8+ or TiDB, reachable using a MySQL connection URL |
| Runtime | HTTPS-capable host for secure session cookies in production |
| Optional services | Manus Forge-compatible storage and Maps proxy; SMTP for email delivery |

## 2. Extract and install

Extract the archive, open a terminal in the project folder, and install the lock-filed dependencies.

```bash
unzip fitizen-india-rebuild-nextjs-stage10-health-history.zip
cd fitizen-rebuild
pnpm install --frozen-lockfile
```

## 3. Configure environment variables

Create `.env.local` at the project root. Do **not** commit it. The first two variables are the minimum required for local authentication and database access.

```dotenv
# Required
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DATABASE
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-characters

# Required for upload storage when running outside Manus
BUILT_IN_FORGE_API_URL=https://your-forge-endpoint.example
BUILT_IN_FORGE_API_KEY=replace-with-server-side-forge-token

# Required for the interactive organizer map through the Maps proxy
VITE_FRONTEND_FORGE_API_URL=https://your-forge-endpoint.example
VITE_FRONTEND_FORGE_API_KEY=replace-with-client-map-proxy-token

# Optional SMTP configuration for organizer and attendee email delivery
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=Fitizen <no-reply@example.com>
```

The organizer map is designed to use the configured proxy values above. Do not expose a raw third-party Maps key in client code. For local testing without the proxy, the rest of the venue form works; the map displays its retry/error guidance until proxy values are supplied.

## 4. Create and migrate the database

Create an empty MySQL or TiDB database, verify `DATABASE_URL` points to it, then apply the included migration history. The current schema is included through `0034_talented_manta.sql`. Stage 10 additively adds participant-history consent, append-only dated category entries, correction records, history audit records, and idempotent authority-grant reminder deliveries. It also idempotently seeds only aggregate-health functions for Local Authority, District-Level, and State-Level. It does not modify existing events, registrations, categories, users, roles, grants, legacy CSR records, or historic audit evidence.

```bash
# Inspect the tracked migration files first
ls drizzle/*.sql

# Apply migrations to the database named in DATABASE_URL
pnpm drizzle-kit migrate
```

When changing the schema later, generate a new migration, review its SQL, then apply it in a controlled deployment.

```bash
pnpm drizzle-kit generate
# Review the newly generated drizzle/00xx_*.sql file
pnpm drizzle-kit migrate
```

## 5. Start the application

Run the development server and open the printed localhost URL, normally `http://localhost:3000`.

```bash
pnpm dev
```

Use the normal sign-up flow to create accounts. After assigning an account the `admin` role in the database, administrators can sign in at `/admin/login`. A master administrator creates Local Authority and CSR sponsor accounts from **Administrator Console → Accounts** with `MASTER` confirmation; those accounts sign in at `/local-authority/login` and `/csr/login` respectively. The historic `/mcd` and `/mcd/login` routes safely redirect to the Local Authority workspace during the compatibility period. Never rely on demonstration credentials in a production deployment.

For this verified project preview only, the isolated Local Authority test account retains its historical email `mcd@fitizen.local` with password `MCDPublicHealth!2026`, and the CSR test account is `csr@fitizen.local` with password `CSRImpact!2026`. Both were created through the administrator workflow and are audit logged. Change or remove them before any production deployment.

### Stage 1–10 compatibility and rollback flags

| Variable | Default | Effect | Safe rollback |
|---|---:|---|---|
| `FITIZEN_LOCAL_AUTHORITY_TERMINOLOGY` | enabled | Makes `/local-authority` the canonical authority workspace while retaining `/mcd` redirects. | Set to `false` to use the retained `/mcd` workspace path without rewriting any account or audit data. |
| `FITIZEN_ACCOUNT_PROFILE_ROUTE_MIGRATION` | disabled | Enables the canonical `/account/profile` route and redirects the retained `/dashboard/profile` path. | Leave unset or set any value other than `true` to keep `/dashboard/profile` canonical. |
| `FITIZEN_CAPABILITY_CATALOG_ENABLED` | enabled | Shows the Stage 3 applicant catalog, application/grant status views, and administrator capability-governance navigation. | Set to the exact value `false` to hide the new navigation and return direct applicant/admin capability views to retained workspaces without deleting or changing any Stage 3 data. |
| `FITIZEN_CAPABILITY_AUTHORIZATION_ENFORCEMENT` | disabled | When set to the exact lowercase value `true`, enforces a current `LOCAL_AUTHORITY` + `LA_EVENT_REVIEW` selected-function, time-bound, territory-matching grant for the first migrated Local Authority event-review action. | Leave unset or set any value other than `true`, then restart the application, to restore the retained legacy Local Authority review path without deleting grants or audit evidence. |
| `FITIZEN_CAPABILITY_MIS_EXPORT_ENFORCEMENT` | disabled | When set to the exact lowercase value `true`, enforces a current national `LOCAL_AUTHORITY` + `LA_MIS_EXPORT` selected-function grant for valid Local Authority XLSX/PDF MIS exports. | Leave unset or set any value other than `true`, then restart, to restore the retained Local Authority MIS-export path without deleting grants or audits. |
| `FITIZEN_CSR_CAPABILITY_AUTHORIZATION_ENFORCEMENT` | disabled | When set to the exact lowercase value `true`, enforces a current territory-matching `CSR_BRIEF_SUBMIT` grant for CSR brief submission and a national `CSR_IMPACT_VIEW` grant for valid CSR XLSX/PDF impact exports. | Leave unset or set any value other than `true`, then restart, to restore retained CSR brief and report access without deleting grants, budgets, requests, assignments, or audits. |
| `FITIZEN_CAPABILITY_DECISION_NOTIFICATIONS_ENABLED` | enabled | Shows private Stage 6 applicant decision notices and writes future owner-scoped notices for administrator application/grant decisions. | Set to the exact value `false`, then restart, to hide the inbox and stop future notice writes without changing applications, grants, audits, roles, or existing notice rows. |
| `FITIZEN_CAPABILITY_WORKSPACE_SWITCHER_ENABLED` | enabled | Shows the Stage 7 `/dashboard/workspaces` index, eligible-workspace links, and compact account-menu switcher for only current selected-function grants. | Set to the exact value `false`, then restart, to hide the Stage 7 workspace surfaces and redirect their routes to retained user workspace routes without changing grants, selected functions, legacy roles, or audit evidence. |
| `FITIZEN_WORKSPACE_LANDING_PREFERENCES_ENABLED` | enabled | Allows standard users to save `/dashboard/workspaces/preferences` as participant, organizer, or one current eligible capability workspace. | Set to the exact value `false`, then restart, to bypass saved preference resolution and hide the settings route without deleting preference rows or changing existing login/return paths. |
| `FITIZEN_CAPABILITY_GRANT_USAGE_REPORTING_ENABLED` | enabled | Shows the administrator-only selected-function grant usage report in **Administrator Console → Capability Governance**. | Set to the exact value `false`, then restart, to hide the report without changing grants, execution audits, functions, or MASTER lifecycle controls. |
| `FITIZEN_CSR_CAPABILITY_WORKSPACE_ENABLED` | enabled | Enables the Stage 8 selected-function CSR capability workspace beneath `/dashboard/workspaces/CSR_SPONSORSHIP`. | Set to the exact value `false`, then restart, to remove the Stage 8 operational CSR workspace while retaining the legacy `/csr` route, requests, budgets, sponsorships, assignments, concepts, grants, and audit evidence. |
| `FITIZEN_CSR_GRANT_USAGE_EXPORT_ENABLED` | enabled | Enables administrator-only CSV/XLSX CSR grant-usage downloads under Capability Governance. | Set to the exact value `false`, then restart, to hide the export route and controls without changing grants, selected functions, requests, assignments, funding records, or audits. |
| `FITIZEN_WORKSPACE_DEFAULT_EXPIRY_ALERTS_ENABLED` | enabled | Shows owner-scoped in-app notices when the grant saved as a capability landing default ends within 30 days. | Set to the exact value `false`, then restart, to hide the derived notice without changing saved preferences, login fallback, grant dates, or authorization. |
| `FITIZEN_CSR_ASSIGNMENT_TIMELINE_ENABLED` | enabled | Shows the administrator-only, read-only Stage 8 capability assignment chronology. | Set to the exact value `false`, then restart, to hide the timeline without changing CSR requests, assignments, funding records, participant policy, or audits. |
| `FITIZEN_AUTHORITY_CAPABILITY_WORKSPACE_ENABLED` | enabled | Enables Stage 9 selected-function Local Authority, District-Level, and State-Level workspace operations and masked authority MIS exports. | Set to the exact value `false`, then restart, to route Stage 9 authority workspaces back to the workspace index without changing grants, plans, programmes, exceptions, legacy Local Authority routes, or audits. |
| `FITIZEN_PARTICIPANT_HISTORY_ENABLED` | enabled | Enables the owner-only Stage 10 `/dashboard/history` consent, event-day entry, immutable history, and correction surfaces. | Set to the exact value `false`, then restart, to hide Stage 10 participant history and stop new Stage 10 history writes without deleting registrations, entries, corrections, consent, or audit evidence. |
| `FITIZEN_STAGE10_AUTHORITY_ANALYTICS_ENABLED` | enabled | Enables selected-function, scope-limited aggregate health analytics and aggregate CSV exports for Stage 10 authority workspaces. | Set to the exact value `false`, then restart, to hide aggregate charts/exports without exposing individual data or changing grants, entries, or audits. |
| `FITIZEN_STAGE10_GRANT_REMINDER_AUTOMATION_ENABLED` | enabled | Enables in-app authority-grant expiry alerts and the protected daily reminder handler. | Set to the exact value `false`, then restart, to hide alerts and stop new reminder delivery without changing grant dates/status, stored notices, or authorization. |

The Stage 2 legacy capability mapping is an additive compatibility record only. Stage 3 grants retain selected functions, territory, dates, lifecycle status, and audit evidence. Centralized server-side grant authorization is opt-in: Stage 4 covers Local Authority event review, while Stage 5 separately covers Local Authority MIS exports, CSR brief submission, and CSR impact exports. Every other retained role/workflow continues to use its established authorization boundary.

### Stage 3 capability catalog and governance

Standard User accounts use `/dashboard/capabilities` to search/filter active catalog entries, inspect required/optional functions, dependency codes, and sensitive-data declarations, then save and submit a scope/date-bound application. Draft and returned applications remain owner-editable. Mandatory functions and dependencies are validated on the server; a minimum 20-character justification is required before a draft can be saved.

Administrators use `/admin?view=capabilities` to review only submitted applications. A literal `MASTER` confirmation is required to return, reject, approve, create a selected-function grant, or update a grant status. Approval records a valid start/end range, bounded territory scope, administrative reason, dedicated capability audit record, and existing administrator audit record in one transaction.

### Stage 4 authorization and grant expiry

The first grant-enforced execution path is Local Authority event review. Before enabling `FITIZEN_CAPABILITY_AUTHORIZATION_ENFORCEMENT=true`, open **Administrator Console → Capabilities**, create a Local Authority migration grant for the retained authority account, select every mandatory Local Authority function, set a scope that matches the intended event territories, select valid start/end dates, explain the decision, and enter `MASTER`. Only then enable the flag and restart the application. A grant must be active, inside its date interval, include `LA_EVENT_REVIEW`, and match the event city/zone/ward to authorize the review. Successful grant-backed reviews append dedicated capability execution evidence.

The same governance page exposes **Grant expiry operations**. A master administrator can view the due count and process all active grants whose end time has passed by providing a reason and `MASTER`. Authorization already treats a past-end grant as inactive before this operation runs; processing it persists `expired` status and both audit records. No background expiry scheduler is configured in Stage 4.

Applicant catalog filtering now supports audience, required/optional function type, sensitive/standard data handling, dependency state, and multiple sort orders. These controls change only the displayed catalog and preserve current application validation and lifecycle behavior.

### Stage 5 selective authorization and grant reminders

Stage 5 adds independent rollout flags rather than broad replacement of existing authorization. Before enabling the Local Authority MIS flag, create a Local Authority migration grant that includes `LA_MIS_EXPORT` and uses national scope. Before enabling the CSR flag, create a CSR migration grant with `CSR_BRIEF_SUBMIT` and a territory matching the sponsor’s brief preferences; select `CSR_IMPACT_VIEW` and national scope only if CSR impact report export must be grant-enforced. The **Stage 5 CSR migration grants** panel requires `MASTER`, records both audit streams, and leaves the legacy `csr` role untouched.

Capability, CSR, and Local Authority overview dashboards show a read-only **Grant reminders** widget for active grants that started and end within 30 days. Grants ending within seven days are urgent; a past-end active row is labelled expired until the existing MASTER-controlled Stage 4 expiry operation persists the status. No automatic scheduler or notification delivery was added.

### Stage 6 administrator decisions and private inbox

Administrators already use the Capability Governance view to return, reject, or approve only submitted applications. Approval can select fewer optional functions than were requested, but it cannot include an unrequested function or omit a required/dependency function. Valid scope, dates, reason, literal `MASTER`, dedicated capability evidence, and administrator audit evidence are required.

The application owner now sees a private **Capability decisions** inbox at `/dashboard/capabilities` when a master returns, rejects, approves, changes a grant status, processes expiry, or creates a direct Local Authority/CSR migration grant. The panel is not a new authorization source: it links back to the existing application/grant record. The recipient can filter the private list by all, approved, returned, rejected, or grant-update outcomes, mark matching unread notices as read in one owner-scoped action, or mark an individual notice as read. The unread count appears only in that account’s standard-user navigation and account menu. Motion is transform/opacity-only and disabled for reduced-motion preferences. Email, SMS, scheduled reminders, and cross-user inbox access are intentionally not part of Stage 6.

### Stage 7 active capability workspaces

Stage 7 adds a navigation aid, not a new authorization or execution engine. Standard users can open `/dashboard/workspaces` and, when eligible, use the compact account-menu switcher or **Workspaces** navigation item. A workspace is derived live from a grant only when all of the following are true: the catalogue capability is active, the grant belongs to the signed-in account profile, the grant is `active`, the current time is within its start/end interval, and the grant contains at least one selected function that remains active.

Each workspace link carries the capability code and grant identifier, but the destination revalidates account ownership, status, dates, catalogue state, capability-code match, and selected active functions on the server before rendering. A forged, foreign, suspended, expired, future, functionless, or mismatched route returns safely to the workspace index. The workspace page displays only that validated grant’s selected functions, scoped territory, and validity window. It does not grant operational access, carry a prior workspace context forward, or infer a workspace from Stage 2 legacy mappings. Retained `mcd`/Local Authority and `csr` role workspaces remain unchanged.

### Workspace landing preferences, activity summaries, and grant reporting

Standard users can open `/dashboard/workspaces/preferences` and choose Participant home, Organizer events, or one current active capability workspace as the normal-login landing view. A supplied safe `returnTo` still takes precedence. Capability choices are persisted only after server validation of the account-owned, active, current selected-function grant. At login, the saved choice is revalidated; an expired, suspended, foreign, inactive, or functionless grant falls back safely to **My Bookings**. Preferences do not grant authorization or create a workspace.

Every dynamic workspace displays a read-only activity summary taken only from the matching grant’s capability audit records. Administrators see the complementary **Grant usage reporting** table under **Administrator Console → Capability Governance**, including selected functions, effective status, authorized-action count, latest recorded evidence, and the existing `MASTER`-protected status controls. The report does not infer unrecorded activity and does not alter authorization.

### Stage 8 CSR capability workspace

Stage 8 adds operational CSR capability support for a standard user only when the active `CSR_SPONSORSHIP` grant selects the required function. The workspace uses `/dashboard/workspaces/CSR_SPONSORSHIP?grant=[grantId]`; every form, direct participant route, and data query revalidates the exact account-owned grant, current dates, catalogue state, selected function, and territory. The retained `/csr` legacy role workspace is not removed or converted.

The selected `CSR_BRIEF_SUBMIT` function permits the user to complete an existing CSR company profile, create a budget, save an independent CSR request, and submit only that request for administrator review. Each Stage 8 request is explicitly linked to its grant and gets a `CSR-REQ-…` public identifier. A `MASTER` administrator can return, reject, or approve it for matching. Approval creates no event and commits no budget by itself.

After approval, a `MASTER` administrator creates one `CSR-SPN-…` sponsorship and one `CSR-ASN-…` assignment. The assignment chooses **exactly one** currently live organizer-owned event or, for a future-event request, one `CSR-CON-…` future-event concept. A concept is a planning record only: it is not an event, cannot accept registrations, cannot have a public QR code, has no attendance or health information, and cannot receive a funding record. Event ownership, venue, dates, capacity, registrations, and public QR behavior stay with the organizer/event workflow.

The administrator selects a closed participant-field policy for a real assigned event. The `CSR_ASSIGNED_PARTICIPANT_VIEW` function can read only the approved combination of name, email, registration status, attendance status, and participation date for that one assignment. Profile, address, identity, health, unrelated-event, and unapproved fields are never queried. `CSR_ASSIGNED_EVENT_VIEW` and `CSR_FUNDING_TRACK` independently control assigned-record visibility and funding state. A funding reference and report are recorded by a `MASTER` administrator; completion additionally requires a real assigned event and recorded report evidence.

### Stage 9 authority capability workspaces and requested administration enhancements

Administrators can download server-derived **CSR usage CSV** or **CSR usage XLSX** from **Administrator Console → Capability Governance → Grant usage reporting**. The export includes only CSR grant status, scope window, selected functions, request/assignment/concept/funding aggregate counts, execution count, and latest execution time. It intentionally excludes participant fields, legacy CSR requests not linked to a capability grant, payment detail, and health data.

A standard user who saves a current capability workspace as the normal-login destination sees an in-app expiry alert only when that exact active grant ends within 30 days. The alert is derived at request time; no scheduler, email, persistent notice, or authorization change is created. Sign-in still revalidates the preference and safely falls back if the grant expires, is suspended, is foreign, has no selected active functions, or no longer matches the stored capability context.

**Administrator Console → CSR sponsorships** includes a read-only capability assignment timeline for Stage 8 request creation, submission, administrator review, event-or-concept assignment, funding record, and report completion. It is not an editing interface and displays no participant fields.

Stage 9 adds operational workspace routes only through a current selected-function grant: `/dashboard/workspaces/LOCAL_AUTHORITY?grant=[grantId]`, `/dashboard/workspaces/DISTRICT_LEVEL?grant=[grantId]`, and `/dashboard/workspaces/STATE_LEVEL?grant=[grantId]`. The dynamic route validates account ownership, capability code, grant status, dates, active catalogue, selected functions, and every action’s territory. Local Authority can use existing review/monitor/MIS functions plus read-only approved-location monitoring; District-Level can create grant-scoped delivery plans, review in-scope events, monitor aggregate delivery, export masked MIS, and manage scoped exceptions; State-Level can create grant-scoped programmes, view aggregate performance/coverage, export masked MIS, manage scoped escalations, and view aggregate capability-linked CSR impact. The retained `/local-authority` and `/mcd` compatibility workflows stay separate.

No Stage 9 authority surface collects, displays, or exports health records. Exports contain aggregate territory data only; participant names, email, profile, identity, payment, and health data are excluded. New plan, programme, and exception records inherit the exact authorizing grant’s stored territory and write capability execution evidence. A direct route or action with a foreign, suspended, expired, functionless, wrong-capability, or out-of-scope grant is denied or returns safely to the workspace index.

### Stage 10 consented participant history, analytics, and reminders

Standard users open **My event history** at `/dashboard/history` after a confirmed registration. The server derives the event category, registration ownership, event-day date range, and form type; it never trusts a browser-sent category or workspace claim. **Running** and **Wellness** show an explicit-consent health check-in. **Learning** shows an education reflection, **Community** a community check-in, and **Music/Food & Drink** an event-experience reflection. A health check-in is voluntary participant-entered wellbeing data, not a clinical record, diagnosis, treatment, or medical advice.

Single-day events accept one dated entry; multi-day events provide **Add daily update** for each date inside the configured event range. Every entry receives a public ID and is insert-only. A participant cannot edit or delete an entry through normal actions. A correction creates a distinct correction public ID, reason, and validated replacement payload while retaining the original row unchanged. The participant alone can grant or withdraw health consent. Withdrawing consent stops new health entries but retains prior immutable evidence. Every participant view, consent update, entry creation, correction, aggregate authority view, and aggregate health export appends Stage 10 audit evidence.

Local Authority, District-Level, and State-Level workspaces show no individual history records. Only an exact active scope-matching grant with its selected `*_HEALTH_AGGREGATE_VIEW` function can show or download aggregate entry counts by date and wellbeing status. Aggregates exclude user ID, name, email, registration number, raw payload, notes, correction content, and every other individual field. CSR receives no Stage 10 health view or export.

The standard dashboard displays an in-app reminder for any current authority grant that ends within 30 days. The protected `/api/scheduled/authority-grant-reminders` handler adds at most one private notice per recipient/grant/reminder window (30/14/7/3/1 days) and never auto-renews or changes a grant. The publication-confirmed project schedule **authority-grant-reminders-daily** is enabled at `0 0 9 * * *` (daily 09:00 UTC) and calls this handler with platform scheduled authentication. Its durable task identifier is `oJmcXfBhsJKyF4NkrALEBP`; administrators can inspect, pause, resume, or view its execution history in the project schedule controls.

The public homepage repairs preserve URL-backed search/city/category/date-price/accessibility/sort filters across quick-filter interactions and revalidate server-backed results. The hero uses ordinary previous/next/dot banner links with a `banner` query value, preserving any discovery query state and remaining keyboard reachable without requiring client hydration or motion.

## 6. Venue directory and sample data

An administrator manages approved venues at **Administrator Console → Venue directory**. The workspace contains an audited, MASTER-confirmed **Load sample venues** control. It adds these three clearly labelled verification entries without replacing existing directory data:

| Sample venue | Capacity | Accessibility |
| --- | ---: | --- |
| Sample · Riverfront Activity Ground | 1,200 | Step-free entry and accessible washroom |
| Sample · Civic Indoor Hall | 450 | Lift access and reserved seating |
| Sample · Lake Park Amphitheatre | 800 | Standard access |

Organizers see the directory first in **Create Event → Step 2: Add venue and location**. They can filter, check the month availability calendar, watch a reserved venue, or choose **Enter a manual location** if the exact place is not listed. Only administrators can create, edit, retire, import, or exceptionally release directory records; every change requires `MASTER` and is audit logged.

## 7. Local Authority public-health workspace

The Local Authority compatibility capability is limited to a distinct authority console at `/local-authority`. It can monitor all currently recorded events, approved activity categories, active eligible locations, ward/zone/city activity, recorded participation, organizers, partner-channel promotion counts, and underservice signals based on active eligible locations with no live events. Local Authority accounts may approve submitted events, request changes, freeze, or suspend approved events; every decision is audit logged. In Stage 4 compatibility mode, this retains the existing `mcd` role guard. With explicit Stage 4 enforcement enabled, event review requires a matching selected-function, time-bound grant. With the separate Stage 5 MIS flag enabled, valid MIS download additionally requires a national `LA_MIS_EXPORT` grant. User-role, payment, venue-directory, CSR, organizer, monitoring, and report-page controls remain unchanged.

Local Authority MIS downloads are available in XLSX and PDF at **Local Authority → MIS reports**. Local Authority can monitor administrator-assigned CSR-supported activity but cannot review CSR sponsorship requests, alter CSR budgets, or change organiser ownership. Current health-screening and settlement data are not invented and remain explicitly out of scope until their dedicated consent and outcome models are implemented.

## 8. CSR sponsorship briefs

Legacy CSR sponsors work in `/csr`. The **Sponsorship briefs** workspace provides exactly two agency-free routes: **Sponsor an existing matched event** and **Sponsor a future event brief**. Neither route lists every platform event. The sponsor records its preferred event type, audience, city/zone/ward, dates, budget amount, capacity, accessibility needs, detailed requirements, and success indicators. The Stage 8 selected-function capability workspace is separate and appears only through an active Standard User grant; it does not alter legacy CSR records or role behavior.

Each submitted brief is visible to the master administrator at **Administrator Console → CSR sponsorships**. With `MASTER` confirmation, the administrator can approve a brief for matching, request additions, or reject it; additions and rejections require an explanation visible to the sponsoring CSR company. The sponsor can revise and resubmit only its own draft or returned brief. When the Stage 5 CSR enforcement flag is enabled, submission additionally requires a matching `CSR_BRIEF_SUBMIT` grant; valid XLSX/PDF impact exports require national `CSR_IMPACT_VIEW`. After approval, the administrator selects one currently live organiser-owned event and records a matching note with `MASTER` confirmation. Only that assignment commits the budget and exposes the assigned event and actual participation/check-in impact to the sponsor. Funding never transfers event ownership.

> Historic implementation-agency and direct sponsorship tables are retained only to preserve existing data. They are not part of the active CSR user interface, request actions, reports, or administrator workflow.

## 9. Test and production checks

Run these checks before deploying any change.

```bash
pnpm check
pnpm test
NODE_ENV=production pnpm build
pnpm start
```

If the production build runs in a constrained machine, stop development watchers first and use a bounded Node heap, for example:

```bash
NODE_OPTIONS=--max-old-space-size=768 NODE_ENV=production pnpm build
```

## 10. Deployment checklist

| Step | Action |
| --- | --- |
| 1 | Set production secrets in the hosting provider; do not upload `.env.local`. |
| 2 | Apply reviewed Drizzle migrations against the production database. |
| 3 | Set a strong production `JWT_SECRET` and serve over HTTPS for secure session cookies. |
| 4 | Configure Forge storage and Maps proxy values if uploads and interactive map pins are enabled. |
| 5 | Run `pnpm check`, `pnpm test`, and `pnpm build`. |
| 6 | Verify admin MASTER safeguards, Local Authority boundaries, legacy CSR brief review/matching, Stage 8 selected-function CSR request/assignment/participant-field boundaries, CSR export/timeline privacy, Stage 9 authority selected-function and territory isolation, Stage 10 consent/correction/aggregate-only history boundaries, daily-reminder activation, preference-expiry fallback, organizer Create Event venue selection, private inbox bulk/filter ownership, direct workspace-route isolation, and public discovery after release. |

## Project map

| Path | Purpose |
| --- | --- |
| `app/` | Next.js App Router pages, API routes, server actions, and UI components |
| `app/components/LocationSelector.tsx` | Organizer Create Event step-2 location and venue layout |
| `app/components/VenueDirectorySelect.tsx` | Full-width approved venue picker, filters, calendar, and venue watches |
| `app/lib/db.ts` | Drizzle queries, audited administration helpers, workspace preferences/activity/expiry notices, grant reporting/exports, Stage 9 authority scope operations, Stage 10 history/analytics/reminders, venue booking, notifications, and legacy/Stage 8 CSR lifecycle controls |
| `drizzle/schema.ts` | Database schema |
| `drizzle/` | Tracked MySQL/TiDB migration SQL, currently through 0034 |
| `STAGE_3_CAPABILITY_FOUNDATION.md` | Stage 3 scope, preservation controls, rollback flag, and validation gate |
| `STAGE_4_AUTHORIZATION_INVENTORY.md` | First-cutover authorization boundary and compatibility inventory |
| `STAGE_4_AUTHORIZATION_AND_EXPIRY.md` | Stage 4 implementation, rollout, expiry operation, rollback, and validation gate |
| `STAGE_5_AUTHORIZATION_ALERTS_INVENTORY.md` | Stage 5 selective rollout inventory and preservation boundary |
| `STAGE_5_SELECTIVE_AUTHORIZATION_AND_ALERTS.md` | Stage 5 implementation, flags, grant reminders, responsive safeguards, rollback, and validation gate |
| `STAGE_6_APPROVAL_NOTIFICATION_INVENTORY.md` | Stage 6 acceptance-gate reconciliation and preserved boundary |
| `STAGE_6_ADMIN_APPROVAL_NOTIFICATIONS.md` | Stage 6 decision inbox, transactional lifecycle, rollback, and validation gate |
| `STAGE_6_ENHANCEMENT_AND_STAGE_7_WORKSPACE_SWITCHER.md` | Stage 6 inbox enhancement and Stage 7 workspace eligibility, isolation, rollback, and validation contract |
| `STAGE_7_WORKSPACE_SWITCHER_INVENTORY.md` | Stage 7 acceptance inventory and preserved legacy-workspace boundary |
| `STAGE_8_CSR_CAPABILITY_INVENTORY.md` | Stage 8 protected baseline, selected-function scope, data isolation, and rollback inventory |
| `STAGE_8_BROWSER_VALIDATION.md` | Authenticated browser evidence for landing-preference layout and safe zero-workspace behavior |
| `STAGE_9_AUTHORITY_CAPABILITY_INVENTORY.md` | Stage 9 authority function map, scope/privacy boundary, requested enhancement inventory, rollback, and acceptance gate |
| `STAGE_10_HEALTH_HISTORY_INVENTORY.md` | Stage 10 consent, append-only history, category forms, aggregate analytics, reminder activation, rollback, and acceptance inventory |
| `app/**/*.test.ts` | Vitest coverage |

## Support boundaries

The source archive is portable, but Manus-managed OAuth, Forge storage, Maps proxy, and other project-injected values must be replaced with your own compatible services when running outside Manus. Keep the existing server-side authorization, `MASTER` confirmations, and audit logging intact when extending admin features.
