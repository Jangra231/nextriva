# Authorized Live-Site Content Audit

## About Us

The live site positions Fitizen India as a **Mumbai-based marathon and sports event management company** operating since 2017. Its visible messaging highlights professional, participant-first, community-driven event execution for organisers, institutions, and communities across India.

| Section | Visible content to carry into the rebuild |
|---|---|
| Hero | "Your partner in sports events" with a Mumbai-based sports-event-management positioning statement and execution since 2017. |
| Impact | `1,00,000+` participants engaged; `50+` events delivered; execution since 2017. |
| Story | Women-founded in Mumbai, with an emphasis on professional, participant-focused, community-driven running events. |
| Services | Marathon & Running Events; Multi-Sport & Participative Events; Event Partner for Other Organisers. |
| Differentiators | Women-Founded; Single-Point Accountability; Technology-First; PAN-India Reach; Organiser Partner; Community-First. |
| Mission | Expertly organise experiential marathons, running events, cyclothons, and multi-sport events that promote fitness and support organisers, institutions, and corporates. |
| Values | Participant-First; Operational Excellence; Community & Inclusion; Trust & Transparency; Continuous Growth. |

## FAQ Content

The public FAQ covers discovering and booking events, external-event behaviour, tickets and payments, viewing My Bookings, organiser listing and Manage Events usage, public browsing without an account, and the privacy-policy support route. These topics should be added as a public FAQ experience linked from the footer.

## Existing Public Navigation

The live public experience visibly exposes **Events**, **About**, an event search and city discovery flow, quick filters, **Create Event**, FAQ, and Privacy Policy. The revised rebuild should retain these terms in public navigation and expand the footer with the missing FAQ and Privacy Policy routes.

## Create Event Workflow Parity

The authorized live wizard confirms the required six-step order: **Basics**, **Location**, **Description**, **Cover Image**, **Tickets and Pricing**, and **Custom Questions**. Step one is headed **Basic details** and groups Event Name, Event Display Name, Event Visibility, Event Category, separate start/end Date and Time controls, Event TimeZone, **Exit**, a step counter, and **Save & Next**. The sidebar explicitly groups the final two areas as Tickets & Pricing and Participant Questions. The rebuild must preserve this sequence, step locking, and progression terminology while accepting the user-specified **Save and Next** wording already used elsewhere in the project.

Direct navigation to the live `?step=2` URL remains on Basics until that current step is successfully saved, confirming that later sections are server-locked rather than merely hidden in the interface. The rebuild applies the same principle through locked sidebar navigation and server-side `canSubmitWizardStep` mutation validation.

### Steps Two Through Six

The live locked sidebar exposes the following subsequent sections and descriptors: **Location — Venue & address**, **Description — Tell participants about your event**, **Cover Image — Upload your event photo**, **Tickets & Pricing — Tickets / Categories, pricing & limits**, and **Participant Questions — Custom Questions / Collect participant details**. To avoid changing the authorized live account simply to unlock its draft, no real live event data was submitted.

The rebuilt workflow was exercised end to end as the reusable demo user. Location requires City, Venue name, and Full address; Description requires event narrative; Cover Image accepts an upload or valid URL; Tickets and Pricing requires ticket name, price, and quantity with an optional short description; and Custom Questions offers an optional question, response type, and required toggle. Each successful step unlocks precisely the next step, retains the session, supports Exit and draft auto-save, and leaves publication as a separate final action.

#### Live Step 2 — Location

After successfully saving Basics, the live site creates a slugged draft URL and unlocks Location. This step is headed **Add Venue Address** and uses a two-mode control: **Add Venue Address** or **Venue not decided**. In address mode it presents an optional **BIB / expo collection date**, required **City**, optional **Venue name**, **Address line 1**, and **Address line 2**, followed by **Exit**, a `step 2/6` counter, and **Save & Next**. This is richer than the rebuild’s prior single full-address text area and will be matched before delivery.

#### Live Step 3 — Description

The live Description page is headed **Description** with the guidance “Write a compelling description, add agenda highlights, and event guidelines.” Its Event description field is a required rich-text editor, with visible controls for bold, italic, underline, bulleted list, ordered list, link, image, and clear formatting. It retains the standard **Exit**, `step 3/6`, and **Save & Next** progression controls. The rebuild’s plain textarea will be upgraded to an editor-style input and matching guidance.

#### Live Step 4 — Cover Image

The live Cover Image step states that the image is the main banner for the event page and listings. It provides one upload drop-zone labeled **Click to upload or change the cover image** and recommends **1920 × 1080 px** at **16:9**. It has no visible URL-entry alternative. The rebuild will retain its secure upload handling, expose the same recommendation, and make upload—not an external URL—the primary path.

#### Live Step 5 — Tickets & Pricing

The live step is headed **Tickets & Pricing** and starts with **No tickets yet. Add your first ticket to get started.** It includes a GST setting (Yes/No) and an **Add Another Ticket** action. Its ticket composer provides Ticket Display Name, Ticket Description, ticket category choices (**Paid**, **Free**, **Donation**), ticket price in INR, Platform fee / Fitizen fee / payment-gateway fee allocation controls (Me or Buyer), total quantity, minimum and maximum per-booking limits, a sale-start date/time and sale-end date/time, and an optional attendee message. The composer has **Create Ticket**, while the step retains **Exit**, `step 5/6`, and **Save & Next**. The rebuild’s simplified one-ticket form will be expanded to surface the corresponding fields and fee/sale-window structure.

The live validation requires every sale-window date/time and rejects a sale end that falls after the event’s start (`Ticket sale must end before the event start time.`). A created ticket is then shown as an editable/deletable card including sale dates, quantity, and category. These controls will be represented in the rebuilt ticket form and validation model.

#### Live Step 6 — Custom Questions

The live final step is headed **Custom Questions** and explains that organizers may add, remove, or reorder registration fields. It seeds editable/deletable **Name** (Text) and **Email** (Email) system questions, each applied **For: All tickets**, and includes **Add New Question**. The final controls are **Exit**, `Participant Questions – step 6/6`, and **Activate**. Activation is the live publication boundary; it will not be used for this temporary audit draft. The rebuild will add the system-question preview, per-question edit/delete controls, and an activation-style final state while retaining the requested custom-question workflow.

### Final Post-Basics Parity Verification

The rebuild was re-tested with the reusable demo account after the remaining interaction gaps were resolved. **Location** now exposes the verified address/undecided modes, BIB/expo collection date, city, and two-line address structure. **Description** has the observed editor-style formatting controls and guidance. The draft continued to preserve its authenticated session while advancing through every locked step.

**Cover Image** now uses an upload-first crop-and-apply flow: an uploaded image opens a 16:9 crop stage with zoom, horizontal/vertical positioning, reset, and Apply crop controls. Applying the crop produced and uploaded a new cover asset successfully before the wizard moved forward.

**Tickets and Pricing** now starts from managed saved-ticket cards, including category, quantity, sale dates, and accessible edit/delete controls. The Add Ticket composer includes the observed category, price, capacity, per-booking, fee-allocation, attendee-message, and sale-window controls. Its persisted sale windows are also validated server-side to end before the event begins.

**Custom Questions** now presents Name and Email system-field cards and a managed custom-question area with Add New Question, editable question/type/required controls, accessible delete controls, and move-up/move-down ordering controls. The final Activation-style action remains separate from saving questions, so verifying a draft does not publish it.
