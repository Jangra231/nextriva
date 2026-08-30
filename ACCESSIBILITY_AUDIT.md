# Accessibility Audit

This audit covers the principal public discovery, account, organizer, and attendee experiences implemented in the Next.js application. It records code-level and visual verification performed before delivery.

| Area | Verified controls and behavior | Accessibility measures applied |
|---|---|---|
| Public landing and event discovery | Header navigation, event search, city selector, quick filters, carousel controls, category filters, event cards | Landmark navigation, a skip link, labelled search and city fields, explicit carousel button labels and current-slide indication, visible focus treatment, keyboard-native links and buttons |
| Public event detail and registration | Event information, ticket selection, Register now action, unavailable-ticket state | Meaningful cover-image alternative text, decorative icons marked hidden, labelled ticket selector, named registration form, disabled button semantics, and status message for unavailable registration |
| Login and sign-up | Name, email, password inputs, account error paths, submit actions | Visible form labels, browser autocomplete hints, semantic email/password input types, and assertive live error messages |
| Organizer dashboard and event wizard | Organizer navigation, profile menu, event action menu, six-step creation form, draft auto-save, image upload | Accessible profile and three-dot menu names, semantic `details` controls for keyboard operation, labelled inputs, persistent focus treatment, polite live draft-save/upload messages, labelled wizard loading state, and server-side locked-step feedback |
| Attendee dashboard and attendee management | List/grid toggle, registration wallet, attendee status controls | Native keyboard links and buttons, status badges, labelled registration-status selectors, responsive table wrapper, and loading-state announcement |
| Reports and promotions | Organizer data views and promotion form | Semantic headings, standard labelled form fields, focus-visible controls, and table headings for structured data |

## Interaction Checks

The major navigation, form, filter, carousel, menu, and selection controls are native links, buttons, `select` elements, inputs, or `details` elements. They therefore retain keyboard activation and expected focus behavior. A global `:focus-visible` rule provides a high-contrast outline, while the skip link provides a direct route to the main-content landmark on public pages and the dashboard.

The platform uses live regions for login/sign-up errors, image-upload status, event draft-save status, ticket availability, and page-loading skeletons. The production build and automated workflow tests were re-run after the audit changes.
