# Deep Staged-Document Audit

## Audit method

The original `Staged_Next.pdf` requirements were reread against the active Next.js routes, server actions, Drizzle schema, migrations, capability tests, Stage 0–10 inventories, and browser reproduction of the public homepage. This audit distinguishes a **confirmed gap** from an intentionally deferred Stage 11 legacy cutover or a stricter privacy boundary adopted in Stage 10.

| Stage | Verified implementation | Audit result |
| --- | --- | --- |
| 0–4 | Compatibility mapping, two-account profile layer, catalog/functions/grants/audits, server authorization, scope/date/function checks, and tests are present. | Complete for staged compatibility rollout. Legacy-role removal remains correctly deferred to Stage 11. |
| 5 | Generic capability application form persists selected functions, justification, scope, dates, draft/revision status, and application lifecycle. | **Remediated additively:** nullable role-specific CSR/Local Authority/District-Level/State-Level detail now persists with bounded server-side validation. Owner-scoped PDF/JPEG/PNG supporting-document metadata is stored separately from S3 bytes and remains visible only to the applicant and administrator reviewer. Historic generic applications remain valid. |
| 6 | MASTER decisions, selected-function grants, reasons, decision notices, audits, and fewer-function approval are present. | **Remediated:** the administrator review queue now applies validated server-side status, capability, applicant, geography, and requested-date filters. Filtered display does not modify literal `MASTER`, scope, selected-function, audit, or authorization safeguards. |
| 7 | Current active selected-function workspace derivation, direct-route revalidation, isolation, and legacy workspace preservation are present. | Complete. |
| 8 | Exact-grant CSR request, review, assignment, event/concept isolation, approved participant policy, funding, impact, audit, and repeat-request flow are present. | Complete. The post-assignment creation of sponsorship/assignment identifiers follows the documented selected-event/concept boundary. |
| 9 | Selected-function authority workspaces, exact-grant/scope checks, plans/programmes/exceptions, masked exports, and audit actions are present. | Complete for only operationally seeded functions. Individual health entry access is intentionally deferred/restricted by the Stage 10 privacy boundary. |
| 10 | Consent, immutable daily entries, correction lineage, audit, category-aware forms, aggregate exact-grant authority analytics, and both reminder paths are implemented. | Complete. Aggregate-only authority access is a deliberate stricter privacy boundary: it never exposes individual participant health entries. The publication-confirmed daily reminder job is enabled at 09:00 UTC with durable recipient/grant/window idempotency. |
| 11 | Legacy cutover was intentionally not started. | Correctly deferred until signed-off migration validation. |

## Confirmed public homepage defects

Browser reproduction confirmed the **Free** quick filter could toggle its visual chip state without changing `/` query state or refreshing server-backed results. The first client-state carousel repair remained non-hydrating in the managed preview, so the final repair uses ordinary banner links rather than a client event handler. Live verification confirmed the Free link uses `/?filter=Free&sort=soonest`, and Next banner advances `?banner=1` to `?banner=2` with distinct slide content and theme. Both homepage defects are remediated without changing discovery rules or event data.

## Remediation scope

The completed remediation pass preserved existing application, grant, audit, role, event, CSR, and Stage 10 history data. Quick filters now use deterministic GET navigation. The carousel uses deterministic banner links with distinct visual state and visible position labels. Role-specific applications, secure supporting-document references, and server-backed administrator review filters are additive. The Stage 11 legacy-account cutover, automatic grant renewal, authority access to individual health data, and unrelated legacy workflow migrations remain out of scope.
