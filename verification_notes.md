# Verification Notes — Create Event, GST, Capacity, and Questions

## Browser verification

On 21 August 2026, the signed-in demo account was verified from the public header, the landing-page call to action, and the organizer **Create New Event** control. Each entry point created a fresh draft and opened the first wizard step directly on the preview origin; it did not return to Login.

The signed-out flow was also verified end-to-end. The Create Event route redirected to `/login?returnTo=/dashboard/manage-events/create-event/new`. Logging in with the demo account then created draft `210002` and opened its first wizard step directly. The post-login action now creates the draft itself when that exact return destination is requested, avoiding a chained redirect that could otherwise lose the freshly set session.

The full six-step workflow was exercised with an organizer test event. A cover image was uploaded and cropped, then step 5 saved a paid **GST Early Bird** ticket with a price of ₹500, 18% GST, a 40-ticket capacity, and a valid sale window. The ticket manager displayed `0 / 40`, `40 spaces remaining`, and `0% filled`. The Reports page subsequently displayed the same ticket with its GST label and capacity analytics.

At step 6, two custom questions were created. Native drag-and-drop was exercised programmatically in the browser, producing the order `Dietary Restrictions`, then `Team Name`. Saving the step reloaded the server-rendered wizard with that same order, confirming persisted reordering. Arrow move controls remained visible as the accessible fallback.

## Automated verification

`pnpm test` completed with 2 passing test files and 11 passing tests. `NODE_ENV=production pnpm build` completed successfully on Next.js 16.3.1.

## Follow-up redirect verification

After the reported follow-up issue, the live preview was rechecked using the signed-in demo account. Selecting the public header **Create Event** control generated draft `300001` and opened its fully rendered first wizard step rather than Login. The wizard's no-session fallback now preserves the new-draft route as its return destination, so a transient missing session cannot silently change the user intent to the generic event dashboard.

The direct no-session wizard route was also verified. Opening `/dashboard/manage-events/create-event/300001` while signed out sent the browser to Login with `returnTo=/dashboard/manage-events/create-event/new`; signing in created draft `330001` and opened its rendered first wizard step. This confirms both the signed-in click path and the fallback path keep the user in the Create Event workflow.

## Draft persistence verification

Event `420001` was created through the public Create Event control and populated without submitting the next step. Its Basics fields auto-saved successfully, including the title, display name, start date/time, and end date/time. A full page reload retained those values, and the database record confirmed the persisted timestamps. The event then appeared first in **My Events → Drafts** as **Autosave Persistence Test**, dated 15 Nov 2026, with an editable draft link. The wizard now displays **Draft saved · Step 1 of 6** after a persisted draft reload.

## Definitive Create Event entry fix

The visible Create Event controls were previously ordinary links to a GET route that created drafts. In an App Router interface, such links can be prefetched, so the click path could be inconsistent. All visible Create Event controls now submit the single `createEventAction` server action instead; draft creation occurs only on an explicit button submission. In the verified preview, a signed-in submission opened event `480001` directly at the Basics wizard. A signed-out submission reached Login with the Create Event return path, and signing in opened event `480002` at the same wizard step.

## Unified final-flow verification

The obsolete GET draft-creation route was removed. The direct `/new` URL is now a harmless start page whose button calls the same server action used by every visible Create Event control. In the final test, signed-in creation opened event `510001`; its Basics details saved to Step 2 and reloaded with the full title and timestamps intact. The final signed-out test used the same visible Create Event button, returned through Login, and created event `510002` at the rendered Basics step after authentication.

## Basics-first slug workflow verification

The authorized live Fitizen wizard was inspected at its stable `/dashboard/manage-events/create-event` entry. It specifies that submitting Basics generates the event slug and unlocks later steps. The rebuilt `/dashboard/manage-events/create-event/new` entry now follows the same progression: it displays Basics without creating a draft; a valid Basics submission creates the record, generates its slug, and redirects directly to Location. In the final authenticated test, event `600001` was saved from Basics and opened Location at `?step=2&saved=1` without a Login redirect. Its slug generator is covered by the test suite.

## Categories restoration verification

The Basics-first form now uses the established `getCategories()` data source, which ensures the persisted organizer categories are available before the form renders. The browser verified the full list: Community, Food & Drink, Learning, Music, Running, and Wellness. In a fresh test, **Community** was selected and event `630001` saved successfully to Location. The database confirmed `categoryId = 6`, `categoryName = Community`, a generated slug, and `currentStep = 2`.

After a full reload of event `630001` at Basics, the browser confirmed its event name, display name, selected Community category, public visibility, both dates, both times, and Asia/Calcutta timezone were all retained. **My Events → Drafts** then visibly displayed the saved event as a **COMMUNITY** draft with its title and date.

The reloaded controls were also read directly from the rendered page: `category = Community`, `visibility = public`, and `timezone = Asia/Calcutta`.

## Fresh-session complete creation and publication verification

The authenticated session cookie now uses secure cross-site preview settings so the event creation server actions retain the account session in the embedded preview. After logging in again with the demo account, the first **Save and Next** created event `660001` and opened Location rather than Login. The same authenticated session completed Location, Description, Cover Image upload/crop, a free Community Run RSVP ticket, and Custom Questions. With the user's confirmation, the event was activated. It is now a **Running / Live** event in My Events, its public page renders cover, description, timing, location, and the free ticket, and its card appears on the homepage.

## Event banner, discovery, and sharing verification

The former Cover Image step is now clearly presented as **Event Banner**, with a saved banner preview, client-side type/size validation, cropping workflow, replacement control, and stored `coverUrl` persistence. The homepage now accepts search, city, category, date/price filters, and Soonest/Latest/Recently added sorting; a verified Free + Running + Soonest query returned the expected live event and quick filters now remain on the homepage. The public event page shows native Share, WhatsApp, Facebook, X, LinkedIn, and Copy Link controls. All platform links contain the canonical public event URL, and the copy action showed the live “Event link copied” status.

## Final banner replacement and sorting verification

The uploaded replacement banner on **Secure Session Publish Test** was saved from Step 4 and reloaded in the wizard with stored URL `/manus-storage/events/covers/30001/1787297263259_e439e054.webp`. Its public page was then rechecked and rendered the same replacement image URL, confirming persistence from upload through public delivery.

A second live event, **Sort Verification Community Walk** (event `750001`, 30 Dec 2026, Mumbai), was created through all six wizard steps, given a cropped banner and a free RSVP ticket, and published. The homepage then rendered three live event cards with distinct sort results: **Soonest first** ordered Noida 10km Run (21 Aug), Secure Session Publish Test (28 Dec), then Sort Verification Community Walk (30 Dec); **Latest first** reversed that date ordering; and **Recently added** placed the new Sort Verification Community Walk first. This demonstrates visibly distinct ordering for every supported homepage sort mode.

## Favorites, discovery feedback, reporting, checkout, and image delivery verification

The missing Next.js storage delivery route was restored and checked directly. Stored banner URLs now issue a signed redirect and return successfully from storage. The public pages for **Secure Session Publish Test** and **Noida 10km Run** visibly rendered their stored banners after the repair.

While signed in as the demo account, **Save to Favorites** on Secure Session Publish Test changed to **Saved to Favorites** after submission and persisted across the subsequent server render. The discovery controls now use transition-aware navigation and replace the event grid with an accessible animated skeleton while search, filter, or sorting updates are in progress.

The authenticated organizer Attendees dashboard rendered a protected **Export guest list CSV** control and a visual attendance-status distribution. Its download was verified as `secure-session-publish-test-mt2k1kqb-attendees.csv`. The Reports dashboard rendered its expanded registration-status and revenue analytics, and its protected export downloaded as `fitizen-event-performance.csv`.

Paid tickets now launch a hosted Stripe Checkout session rather than receiving card data in Fitizen. The Noida paid ticket displayed the GST-inclusive amount of ₹1,180, opened secure checkout in a new tab, and showed the pending checkout state in **My Registrations**. The cancellation callback then changed the same record to **Payment not completed / cancelled**, confirming cleanup. Automated tests additionally simulate session-creation failure cleanup plus `checkout.session.expired` and `checkout.session.async_payment_failed` webhook transitions.

Nodemailer sends organizer-publication, attendee-registration, and reminder messages through configured SMTP. Before SMTP credentials are supplied, the same message flow uses the intentional JSON transport preview fallback; that behavior has automated coverage. `pnpm test` passed with **7 files / 19 tests**, and `NODE_ENV=production pnpm build` passed after all additions.

## Manual UPI and bank transfer payment verification

The hosted Stripe checkout path has been removed from the public registration experience. The organizer-facing **Tickets and Pricing** step now has a **Manual payment instructions** section that supports UPI, bank transfer, or both. For the paid Noida 10km Run verification event, the organizer saved `fitizen.demo@upi`, then added the verification-only bank transfer details for **Fitizen Demo Events**, including the displayed bank name, account number, and IFSC code.

On the public paid-event page, the attendee registration panel displayed the GST-inclusive ₹1,180 amount, UPI ID, bank-transfer details, organizer note, and required transaction-reference field. Submitting `VERIFY-UPI-20260821-001` created pending registration `FZ-A44D25EA`; the attendee wallet visibly showed the pending state and reference. With user approval, the organizer selected **Confirm payment** in Attendees. The protected action removed that control, displayed **Manual payment confirmed**, and the attendee wallet then showed **Payment confirmed · ₹1,180**. The registration record confirmed `paymentStatus = paid`, retained the payment reference, and stored a `confirmationEmailSentAt` timestamp.

The automated suite now includes a database-backed lifecycle test that creates a manual paid registration, verifies its pending state, payment reference, and absent confirmation timestamp, then confirms it as the organizer and verifies the paid attendee-visible state plus confirmation timestamp. The final suite passed with **7 files and 23 tests**, and the final Next.js production build completed successfully.

## Reminder delivery safety verification

The scheduled attendee-reminder endpoint now accepts cron-authenticated callers only, returns a structured `403` for ordinary callers, and returns JSON error context on failures. Each eligible registration is first atomically claimed and durably marked before SMTP delivery, so concurrent triggers or a database failure before delivery cannot send a duplicate reminder. An SMTP failure releases that marker for a subsequent retry.

Route-level tests cover cron authentication, successful claimed delivery, already-claimed no-op behavior, database-marker failure with no email sent, and SMTP failure claim release. The final suite passed with **8 files and 29 tests**, and the final production build succeeded. SMTP credentials and actual production scheduler activation remain intentionally deferred to the user’s workspace as requested.

## Attendees layout and participant account verification

The Attendees dashboard now keeps the event selector horizontally scrollable, presents desktop registrants in a stable six-column table, and converts each registrant into a labeled card at smaller viewport widths. The manual payment column now separates **Awaiting your confirmation**, its submitted reference, **Payment received**, and **No payment required**. Pending transfers show the organizer-only **Mark payment received** action with a clear statement that it confirms the participant’s transfer.

An independent participant account was provisioned: `participant@fitizen.local` with password `FitizenParticipant!2026`. It submitted the verification reference `PARTICIPANT-UPI-20260821-001` for Noida 10km Run, creating booking `FZ-8DA29CC3`. The organizer view displayed the reference and confirmation control. After the user-approved confirmation, the participant wallet showed **Payment confirmed · ₹1,180** for that booking. TypeScript validation, the complete automated suite, and a production build all passed.
