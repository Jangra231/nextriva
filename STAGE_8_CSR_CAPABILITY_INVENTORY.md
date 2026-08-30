# Stage 8 CSR Capability Inventory

## Objective

Stage 8 completes the **CSR capability** for a standard `USER` who holds a current, active, selected-function `CSR_SPONSORSHIP` grant. It must not replace or weaken the protected legacy `/csr` sponsor workflow. The implementation will reuse the existing CSR profile, budget, request, event, registration, grant, and audit records where possible, while adding only the identifiers and assignment controls needed to meet the staged brief.

## Protected baseline

| Existing surface | Current behavior that remains intact |
|---|---|
| `/csr` and legacy `csr` role | Retained CSR sponsor dashboard, budgets, sponsor brief, administrator review, event matching, assigned-event impact, and report views. |
| `csrProfiles` | One profile per existing user, with company, authorized contact, contact details, and active state. |
| `csrBudgets` | Sponsor-owned budgets with remaining-funds validation. |
| `csrSponsorshipRequests` | Draft, submit, changes-requested, approval-for-matching, rejection, assignment, and cancellation workflow. |
| Administrator controls | `MASTER`-confirmed review and one live organiser-owned event matching, with administrator audit evidence. |
| Existing privacy boundary | CSR workspace queries are profile-owned and show only events assigned through the CSR request lifecycle. |

## Stage 8 gaps to close

| Requirement | Additive delivery approach |
|---|---|
| Capability-backed CSR workspace | Add a flag-controlled, server-validated CSR workspace beneath the existing Stage 7 dynamic workspace route. It is available only for active `CSR_SPONSORSHIP` grants with the requested function. |
| Function-level working routes | Gate request submission, assigned-event visibility, limited participant visibility, and funding/impact views through selected-function authorization. Hidden navigation is never the authorization boundary. |
| Request, sponsorship, and assignment identifiers | Add public, immutable IDs for new sponsorship requests, CSR sponsorship records, and event assignments. Existing numeric request IDs and historic records remain readable. |
| Administrator/CSR notices | Write owner-scoped decision notices for the CSR user and existing administrator audit evidence for the queue; do not create fabricated delivery channels. |
| Future Event Concept | Add an administrator-created concept that links to one approved CSR request but is not an event, never accepts registrations, never creates a public QR code, and cannot contain attendance or health information. |
| Assigned-event participant data | Add an administrator-chosen field policy per assignment. Query only the assigned event and only permitted fields; no profile, address, identity document, other-event, or health fields are included. |
| Funding and impact completion | Persist an assignment-level funding/completion state and permit completion only after a real assigned event and recorded funding/report evidence exist. |
| Repeat requests | Keep each sponsorship request independently identified and separately reviewed/assigned; no grant or earlier approval auto-approves a later request. |

## Authorization and isolation contract

The server will derive the capability workspace from the signed-in user’s active grant, current validity interval, active catalogue record, and selected active functions. Every mutating action and direct URL must independently validate user ownership, grant eligibility, selected function, request/assignment ownership, and scope. A CSR user cannot self-review, self-assign, browse the general event catalogue in the capability workspace, alter the assigned event, or retrieve non-approved participant fields.

The administrator remains the sole reviewer and assignment authority. Existing `MASTER` confirmation and administrator audit logging remain required for review, event assignment, policy changes, and future-event-concept creation. Stage 8 does not alter event ownership, venue/location, dates, capacity, registrations, public QR behavior, health records, legacy roles, or default authorization outside its explicit function gates.

## Rollback boundary

The new CSR capability workspace will be controlled by a dedicated feature flag. Disabling it removes only the new capability-workspace routes/navigation and returns users to the retained standard workspace; it does not delete grants, legacy CSR records, profiles, budgets, requests, assignments, concepts, audit evidence, or workspace preferences. The retained `/csr` route continues to operate independently during rollback.

## Acceptance evidence planned

The Stage 8 test matrix will cover an active selected-function path; denied unchecked function; expired/suspended/foreign grant; draft/submit/revise/reject/approve lifecycle; separate second request; administrator-only event or concept assignment; user-only assigned-event visibility; field-policy denial; concept non-event restrictions; funding/impact completion; existing CSR compatibility; cleanup; responsive UI; TypeScript; full Vitest suite; production build; database preservation; and archive inspection.

## Completion evidence

The delivered implementation includes selected-function CSR setup, budgets, drafts, submissions, private decision notices, MASTER review, sponsorship/assignment public identifiers, exact-one event-or-concept assignment, administrator-approved participant fields, real-event-only funding recording, and read-only user visibility. It retains legacy CSR routes and role behavior. The full suite passed with **42 Vitest files / 102 tests**, along with TypeScript and the bounded-memory Next.js production build. Final preserved-data verification retained five users and five profiles with unchanged legacy role counts and zero temporary Stage 8 records. The inspected clean source archive has 372 entries and excludes dependencies, build output, legacy Vite source, logs, local secrets, metadata, and database files.
