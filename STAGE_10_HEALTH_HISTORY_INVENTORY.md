# Stage 10 Consented Participant History Inventory

## Objective and protected baseline

Stage 10 implements the migration brief’s manual, append-only daily health history requirement without changing existing users, registrations, events, categories, legacy authority routes, CSR data, grants, or prior audit evidence. It also completes the requested category-aware participant forms, aggregate authority analytics, dual expiring-grant reminder delivery, and homepage interaction repairs.

The stage is not a clinical-record system and does not provide diagnosis, treatment, triage, or medical advice. A health check-in is a participant-entered wellbeing record for an eligible event. It is not shown to organisers, legacy role dashboards, CSR, or authority users as an individual record.

## Additive model

| Record | Purpose | Mutability and access boundary |
| --- | --- | --- |
| `participantHistoryConsents` | Captures the participant’s explicit current consent and withdrawal time for health check-ins. | The participant alone can grant or withdraw consent. Withdrawal prevents new health entries but does not erase immutable historical evidence. |
| `participantHistoryEntries` | Stores one dated, participant-owned, category-form submission linked to a confirmed registration and event. `health` rows receive a dated health-entry public ID. | Insert-only. A unique registration/type/date boundary prevents duplicate daily health entries. No update or delete helper is exposed. |
| `participantHistoryCorrections` | Stores a corrected payload, reason, actor, and original-entry reference. | Insert-only. It never edits the original entry; the participant sees correction lineage. |
| `participantHistoryAuditRecords` | Stores user view/create/correction/consent events and aggregate authority view/export evidence. | Insert-only audit evidence; no sensitive payload is copied into audit context. |
| `capabilityGrantReminderDeliveries` | Stores one idempotency key for a pending authority-grant reminder window and recipient. | Insert-only delivery evidence, used by the daily handler to avoid duplicate notices. |

## Category-aware form matrix

| Existing category | Form shown after confirmed registration | Entry type | Daily behaviour |
| --- | --- | --- |
| Running, Wellness | **Health check-in**: voluntary wellbeing status, energy level, participation comfort, optional note, and explicit health consent. | `health` | Single-day events permit one event-date entry. Multi-day events expose **Add daily health update** for each eligible event date. |
| Learning | **Education reflection**: learning goal, key takeaway, optional support topic. | `education` | One dated reflection per event date. |
| Community | **Community check-in**: participation intent, connection goal, optional feedback. | `community` | One dated reflection per event date. |
| Music, Food & Drink | **Event experience reflection**: experience rating, highlight, optional feedback. | `experience` | One dated reflection per event date. |

No browser-submitted category, event duration, registration owner, date range, or form type is trusted. The server obtains the event category and local event-day boundary from the confirmed participant registration. A non-health category cannot submit a health payload, and a health-category request cannot be submitted without current consent.

## Authority, analytics, and privacy boundary

Stage 10 adds selected-function aggregate health analytics only. `LOCAL_AUTHORITY`, `DISTRICT_LEVEL`, and `STATE_LEVEL` users must hold an exact current workspace grant and the relevant selected health-aggregate function. The same scope matcher used in Stage 9 limits the aggregate to city/zone/ward/state/district resources. Administrator reporting is aggregate-only and does not become a bypass for individual records.

Charts report counts by approved date/category/status and never return participant name, user ID, registration number, email, note, raw health payload, correction text, or an individual history row. CSR remains limited to its existing approved assigned-event fields and receives no Stage 10 health summary. Every participant history view, aggregate authority view, and aggregate export writes separate audit evidence.

## Expiring authority-grant reminders

The user selected both delivery methods. The standard dashboard derives an owner-scoped warning whenever the saved capability default is approaching expiry. A daily protected scheduled handler will create at most one private notice per recipient/grant/reminder window, using durable idempotency evidence and no auto-renewal, status mutation, or authorization extension.

The handler must authenticate as a scheduled caller, begin with `/api/scheduled/`, use a deterministic daily cadence, catch and JSON-encode failures, and be safe to retry. The code and tests can be delivered in this stage. The actual recurring job cannot be created until a new checkpoint is saved and the user publishes the site; that deployment gate is documented as a final activation step.

## Homepage repair boundary

The homepage already has server-backed query filters and a client carousel. Stage 10 verifies all query updates, quick filters, button loading states, carousel controls, keyboard interaction, and timed slide advancement. Repairs must preserve public event URL query state, direct `/events` discovery, existing event-card data, accessibility, reduced-motion preferences, and responsive layout.

## Rollback

Independent exact-`false` flags will hide Stage 10 participant history, aggregate authority analytics, daily reminder handler/visibility, and homepage-interaction enhancements as applicable. Rollback hides new surfaces and stops new Stage 10 writes; it does not alter historical registrations, event data, categories, legacy roles/routes, active grants, grants’ dates/statuses, or existing audit evidence. No append-only record is silently edited or deleted during rollback.

## Implementation and validation evidence

Migration `0034_talented_manta.sql` was applied additively and idempotently seeded the three health-aggregate functions. The completed implementation includes `/dashboard/history`, consent grant/withdrawal, category-derived forms, date-bound daily validation, immutable entry/correction public IDs, participant and authority audit evidence, scoped aggregate charts, an audited aggregate CSV route, in-app authority-expiry alerts, and the protected daily reminder handler. The homepage now preserves quick-filter query state and uses deterministic accessible banner links with visible slide state.

The focused Stage 10 integration test proves consent denial, first entry success, duplicate-day rejection, untouched original data after correction, exact-grant aggregate access, foreign-user denial, expiring-grant detection, and durable reminder idempotency. It cleaned up every temporary user, consent, entry, correction, audit, delivery, and grant. The final code check passed **44 Vitest files / 106 tests**, TypeScript, and the bounded-memory production build. Mobile public-page captures confirmed the repaired `Free` filter state and responsive non-overlapping discovery controls.

The inspected source archive has 393 entries, is 757,234 bytes, includes `package.json`, `SETUP.md`, migration `0034`, the Stage 10 inventory, participant-history component, and scheduled reminder handler, and excludes dependencies, build output, legacy Vite source/configuration, logs, secrets, Manus metadata, and local database files.

The daily scheduled call for `/api/scheduled/authority-grant-reminders` is active after published-deployment confirmation. Project job `authority-grant-reminders-daily` has durable task identifier `oJmcXfBhsJKyF4NkrALEBP`, is enabled, and runs at `0 0 9 * * *` (09:00 UTC). The first execution log will appear after its next scheduled invocation; durable recipient/grant/window idempotency remains the duplicate-delivery protection.
