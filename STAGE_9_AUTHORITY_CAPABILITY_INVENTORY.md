# Stage 9 Authority Capability Inventory

## Scope and preserved baseline

Stage 9 connects only selected, active, time-valid grants to Local Authority, District-Level, and State-Level operational workspaces. It does not replace `mcd`, alter the Local Authority compatibility route, change legacy user roles, delete events, move organizer ownership, expose the general event catalogue, or activate Stage 10 health-history functionality. Existing Local Authority review, venue registry, MIS, organizer monitoring, and CSR monitoring remain available through their retained compatibility controls until each new function is independently granted and validated.

The current catalog has Local Authority functions `LA_EVENT_REVIEW`, `LA_TERRITORY_MONITOR`, and `LA_MIS_EXPORT`. District-Level and State-Level capability records exist but have no functions yet. Stage 9 will add only idempotent function catalog entries and additive planning/exception records; it will not retrofit or migrate any legacy workflow data.

## Requested administration enhancements

| Addition | Scope and privacy boundary | Rollback |
| --- | --- | --- |
| CSR grant-usage export | Administrator-only server-generated CSV/XLSX report from existing grant, selected-function, audit, and Stage 8 assignment data. It excludes participant details and legacy CSR records not linked to a capability grant. | Disable the report feature flag to hide routes/actions without changing grants or audits. |
| Saved-default expiry alert | An in-app, owner-scoped derived alert appears only while a saved capability-default grant is current and within the configured pre-expiry window. Login always revalidates the grant and safely falls back after expiry. No scheduler, email, background job, or authorization change is introduced. | Disable the alert feature flag to hide alerts; preference and grant records remain unchanged. |
| Assignment timeline | Administrator-only read-only chronology from Stage 8 request submission, review, sponsorship, assignment, funding, report, and capability-audit timestamps. It lists no participant fields and never permits assignment editing. | Disable the timeline feature flag to hide the read model without changing records. |

## Stage 9 selected-function mapping

| Capability | Function | Real Stage 9 action or data surface | Scope enforcement |
| --- | --- | --- | --- |
| Local Authority | `LA_EVENT_REVIEW` | Review, approve, return, reject, freeze, or suspend an in-scope submitted/approved event through the retained event lifecycle service. | Exact current grant plus event city/zone/ward match. |
| Local Authority | `LA_TERRITORY_MONITOR` | View in-scope events, registrations, attendance aggregates, and eligible locations. | Exact grant filters every query by state/district/city/zone/ward. |
| Local Authority | `LA_MIS_EXPORT` | Download a masked, in-scope Local Authority CSV/XLSX report. | Exact grant plus export scope filter and execution audit. |
| Local Authority | `LA_LOCATION_MONITOR` | View in-scope approved-location availability and conflict information; it cannot change master venue records. | Exact grant and venue territory match. |
| District-Level | `DISTRICT_PLAN_CREATE` | Create a scoped district delivery plan with a public plan identifier and audit evidence. | Exact district-or-narrower grant; stored plan inherits only the grant scope. |
| District-Level | `DISTRICT_EVENT_REVIEW` | Review an in-scope event using the existing lifecycle service. | Exact grant and event scope match. |
| District-Level | `DISTRICT_DELIVERY_MONITOR` | View in-scope event, participation, attendance, and delivery aggregates. | Exact scope-filtered query. |
| District-Level | `DISTRICT_MIS_EXPORT` | Download a masked district MIS export. | Exact scope-filtered export and execution audit. |
| District-Level | `DISTRICT_EXCEPTION_MANAGE` | Create and resolve in-scope delivery exceptions with append-only audit evidence. | Exact scope and server-derived target validation. |
| State-Level | `STATE_PROGRAMME_CREATE` | Create a scoped state programme/campaign with a public programme identifier. | Exact state-or-national grant; stored programme inherits only the grant scope. |
| State-Level | `STATE_DISTRICT_PERFORMANCE_VIEW` | View in-scope district delivery aggregates. | Exact state/national scope filters. |
| State-Level | `STATE_COVERAGE_VIEW` | View in-scope coverage and eligible-location aggregates. | Exact scope-filtered query. |
| State-Level | `STATE_MIS_EXPORT` | Download a masked state MIS export. | Exact scope-filtered export and execution audit. |
| State-Level | `STATE_ESCALATION_MANAGE` | Create and resolve in-scope state escalations with append-only audit evidence. | Exact scope and server-derived target validation. |
| State-Level | `STATE_CSR_IMPACT_VIEW` | View aggregate assigned Stage 8 CSR funding/assignment impact only. | Exact scope-filtered aggregate; no individual participants or health data. |

## Health and sensitive-data boundary

Stage 10 is not implemented in Stage 9. There is no authority health-entry UI, health table, health export, or health-record query. All Stage 9 exports are aggregate/masked and exclude participant names, email, addresses, identity, payment, and health data. Selected participant-field policy remains limited to the existing Stage 8 CSR user route and does not transfer to authority workspaces.

## Acceptance and rollback gate

Every direct Stage 9 route/action must revalidate the signed-in account, exact grant, active capability, selected function, start/end dates, and relevant territory. Unselected, expired, suspended, foreign, wrong-capability, and out-of-scope requests must be denied. Each mutation writes capability execution evidence plus the applicable retained audit record. Feature flags hide the Stage 9 workspaces, export, expiry alert, and timeline without deleting any additive rows or changing the Local Authority compatibility workflow.

## Completion evidence

Migration `0033_dark_bloodstrike.sql` created the three planned grant-linked tables and idempotently seeded only the operational Stage 9 functions. The implementation provides aggregate/masked authority MIS downloads, scope-derived Local Authority/District-Level/State-Level workspaces, District plans, State programmes, scope-bound exceptions/escalations, exact-grant event review, CSR aggregate impact, and no Stage 10 health-data surface. It also delivers the requested administrator CSR CSV/XLSX grant-usage export, saved-default expiry alert, and read-only assignment timeline.

The focused authority and flag regression suite passed, as did the full **43-file / 104-test** suite, TypeScript, and the bounded-memory production build. Final preserved-data checks retained five users/five profiles with unchanged legacy roles and zero temporary Stage 9 accounts, grants, preferences, plans, programmes, exceptions, or audit records. The inspected clean source archive contains 381 entries and excludes dependencies, build output, legacy Vite source/configuration, logs, local secrets, metadata, and database files.
