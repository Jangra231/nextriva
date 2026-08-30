# Stage 1 Completion — Local Authority Terminology Compatibility

**Stage status:** Complete and validated. This stage changes terminology and routing only; the legacy database role value `mcd`, existing authority accounts, historic audit records, and underlying public-health monitoring data remain intact.

## Delivered Compatibility Layer

| Concern | Stage 1 outcome | Preservation control |
|---|---|---|
| Canonical terminology | The active interface, login, navigation, reports, and administrator provisioning controls use **Local Authority**. | Historical role values are not rewritten. |
| Legacy role mapping | `mcd`, `bmc`, and `mcd/bmc` map to the `LOCAL_AUTHORITY` capability. | The `users.role` column remains unchanged; current authority users retain `mcd`. |
| Canonical routes | `/local-authority`, `/local-authority/login`, and `/api/exports/local-authority` are the active endpoints. | `/mcd`, `/mcd/login`, and `/api/exports/mcd` remain safe compatibility redirects. |
| Account provisioning | New authority accounts are created through the Local Authority-labelled master control and retain the compatible stored `mcd` role. | Existing accounts, public IDs, and login credentials are not altered. |
| Audit records | New decisions use `local_authority.*` audit action codes. | Historic `mcd.*` audit events remain immutable and readable. |
| Data migration | Migration `0025_medical_alex_wilder.sql` creates and seeds `authorityTerminologyMappings`. | The migration uses `CREATE TABLE IF NOT EXISTS` plus duplicate-safe seed upserts. |

## Feature Flag and Rollback

The feature flag `FITIZEN_LOCAL_AUTHORITY_TERMINOLOGY` is enabled unless explicitly set to `false`. With the default setting, Local Authority routes are canonical and the historic MCD routes redirect safely. Setting the flag to `false` switches the retained authority workspace back to `/mcd` without altering the database, sessions, account IDs, user roles, audit history, or other workflow records.

> Rollback is an application-routing change, not a destructive data rollback. The terminology mapping table and historic authority records are intentionally retained to preserve compatibility and auditability.

## Validation Evidence

The Local Authority role helper resolves `mcd`, `bmc`, `mcd/bmc`, and `LOCAL_AUTHORITY` terminology inputs to the same capability. A legacy-role authority demonstration account successfully authenticated through `/local-authority/login`, and `/mcd?view=reports` redirected to `/local-authority?view=reports` while retaining the selected view. The rendered workspace exposed Local Authority labels across navigation, account controls, reports, event review, territory monitoring, CSR-supported activity, organizer monitoring, and MIS export links.

Focused compatibility tests, the full regression suite, the type checker, and the bounded-memory production build passed. The migration was also safely re-run against the database to confirm that its mapping seeds are duplicate-safe. No test or browser validation action changed an existing production record.

## Stage 2 Entry Gate

Stage 2 may start only from this checkpoint. It should introduce the requested account/capability evolution through additive data models, explicit user-facing profile terminology, feature-flagged route changes, migration guards, data validation, and rollback tests—never by rewriting or dropping legacy roles in place.
