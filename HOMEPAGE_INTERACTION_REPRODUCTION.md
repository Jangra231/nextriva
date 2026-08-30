# Homepage Interaction Reproduction

## Live observation

On the managed preview, the **Free** quick-filter chip visually entered its active state but the URL remained `/` and the server-backed event results did not refresh. The current implementation updates URL state through a transition, but the browser observation shows the interaction can finish with the visual chip selected while public result state remains unchanged. The repair must provide a deterministic navigation path and avoid relying on a transition refresh sequence that may be coalesced.

The **Next banner** control on the Events across India hero was clicked successfully, yet the rendered side-show did not visibly change. The component state includes three different labels and theme classes, but all slides reuse the same visual card structure and most visual tokens. The repair must make active-slide transitions explicit, label the current position, and provide visibly distinct slides so manual/automatic progression is perceivable.

## Scope guard

These observations concern public homepage presentation only. They do not modify event records, discovery filtering rules, public-card data, registrations, roles, grants, participant history, or authority workflows.

## Post-repair verification

The homepage now uses ordinary `GET /` navigation for the discovery form and each quick-filter chip. On the managed preview, the **Free** chip exposes and accepts `/?filter=Free&sort=soonest`; the page renders the matching-events state from that URL rather than relying on a client-side transition refresh. The regular filter form is likewise a standard browser-submitted GET form, so its query can be copied, refreshed, and revisited safely.

The hero carousel now carries an explicit `data-slide` state, a live **Banner n of 3** label, distinct forest/sun/coral visual treatments, visible dot state, keyboard arrow support, hover/focus pause behavior, and an autoplay guard for reduced-motion preferences. These changes make a slide transition perceivable even where a screenshot is taken between animations.

During the immediate managed-preview check on 25 August, the **Next banner** button was visible but did not update the DOM's `data-slide` attribute when clicked. This indicates a remaining client hydration/event-binding issue rather than a visual-only carousel issue; it must be investigated before the repair is considered complete.

A managed development-service restart and a fresh public-page load did not change that control behavior. The remediation therefore needs a navigation fallback that is independent of a hydrated React click handler, just as the quick-filter repair is.

The final repair renders the carousel as ordinary keyboard-reachable **Previous**, **Next**, and dot links that preserve discovery query parameters and set a `banner` query value. Live verification confirmed `/?banner=1` renders **Banner 2 of 3 — Races and wellness** and clicking **Next banner** navigates to `/?banner=2`, rendering **Banner 3 of 3 — Community experiences** with the coral treatment. This path no longer depends on client hydration or timers; it remains usable under reduced-motion preferences.

The latest progressive-navigation pass retains those real `href` fallback paths but intercepts hydrated quick-filter and banner interactions with a non-scrolling Next route transition. Public verification of **Free** updated the URL to `/?filter=Free&sort=soonest`, showed the active chip and matching-results heading, and preserved all public discovery controls without a full document-navigation contract.
