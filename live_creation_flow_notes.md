# Authorized Live Fitizen Creation Flow Notes

On 21 August 2026, the authorized live Fitizen workflow was inspected at `https://www.fitizenindia.com/dashboard/manage-events/create-event` using the existing authenticated browser session. The entry starts at a stable, non-identifier URL and presents the six-step wizard with **Basics** active.

The live wizard explicitly states: **“Submit Basics to generate the event slug and unlock the next steps.”** This establishes that the public event slug is generated only after a valid Basics submission, rather than at the moment the user presses Create Event.

The rebuilt workflow will therefore preserve a pending creation context until Basics is saved, then create or finalize the event record with its user-facing slug and continue directly to Location without an authentication redirect.
