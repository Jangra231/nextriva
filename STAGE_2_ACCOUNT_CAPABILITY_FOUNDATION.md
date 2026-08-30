# Stage 2 Completion — Account and Capability Foundation

**Stage status:** Complete and validated. Stage 2 is deliberately additive. It introduces explicit account-profile terminology and legacy capability mappings without replacing the established `users.role` model or activating the future capability-grant system ahead of Stage 3 and Stage 4 authorization work.

## Delivered Foundation

| Concern | Stage 2 implementation | Preservation control |
|---|---|---|
| Permanent identity | Every existing user receives exactly one `userAccountProfiles` row linked by the existing numeric user ID. | Existing `users.id`, `publicId`, login credential, session token subject, event ownership, and registrations are unchanged. |
| Two account types | Existing `admin` users map to `PLATFORM_ADMIN`; all other current role values map to `USER`. | Legacy `user`, `mcd`, and `csr` values remain stored in `users.role` and are retained in the profile’s `legacyRole`. |
| Profile terminology | The profile workspace presents **User Profile** or **Platform Admin Profile** from the additive account profile. | The existing profile edit form, avatar, name, email, and permanent ID behavior remain unchanged. |
| Legacy capability mapping | `mcd` maps to `LOCAL_AUTHORITY`; `csr` maps to `CSR` in `legacyAccountCapabilityMappings`. | These are compatibility records, not executable grants. Stage 3 will add catalog, grants, scope, functions, dates, and statuses. |
| Migration audit | `accountMigrationRecords` keeps one duplicate-safe Stage 2 mapping record per user. | Historic administrator audits are not rewritten or removed. |
| Route migration | `/account/profile` is present but disabled by default. | `/dashboard/profile` remains canonical unless `FITIZEN_ACCOUNT_PROFILE_ROUTE_MIGRATION=true`. |

## Database Changes

Migration `0026_workable_saracen.sql` creates `userAccountProfiles`, `legacyAccountCapabilityMappings`, and `accountMigrationRecords` using duplicate-safe table creation and backfill upserts. Migration `0027_aspiring_ma_gnuci.sql` aligns the existing profile foreign-key name with the tracked schema. Both changes are additive; neither changes a legacy user row, role, password, user ID, public ID, event, registration, sponsorship record, or audit record.

The verified database has five legacy users, five account profiles, and five Stage 2 migration records. Active compatibility mappings remain limited to the existing Local Authority and CSR accounts. Test-only account data created during regression coverage is deleted automatically.

## Route Flags and Rollback

`FITIZEN_ACCOUNT_PROFILE_ROUTE_MIGRATION` is disabled unless exactly set to `true`. When disabled, `/account/profile` redirects to the retained `/dashboard/profile` route. When enabled, the legacy profile route redirects to the canonical account route. This keeps both code paths in place and makes rollback a configuration change rather than a data reversal.

`FITIZEN_LOCAL_AUTHORITY_TERMINOLOGY` remains the Stage 1 compatibility flag. Existing Local Authority visual terminology and retained MCD routes continue to behave as documented in `STAGE_1_LOCAL_AUTHORITY_COMPLETION.md`.

## Local Authority Workflow Polish

The Local Authority workspace now has a dedicated route loading state, strengthened active navigation and metric-card motion, targeted hover/focus feedback for review controls and table rows, animated report-download affordances, responsive review-form layout, and an explicit pending-review visual state. All non-essential animation honors `prefers-reduced-motion`. No authority decision was submitted during verification.

## Validation and Stage 3 Gate

The focused Stage 2 compatibility suite passed. The full suite passed with **35 test files and 87 tests**, TypeScript validation passed, and the bounded-memory Next.js production build passed. Browser checks confirmed the Local Authority event-review page, the guarded disabled `/account/profile` fallback, the Local Authority overview, and the new visual feedback surfaces. Stage 3 may now introduce the capability catalog, applications, grants, scoped functions, dates, statuses, and audit controls; it must not treat Stage 2 compatibility mappings as grants.
