# Stage 8 Browser Validation

The authenticated participant browser session opened `/dashboard/workspaces/preferences` after the managed-service restart. The **Default view on login** page rendered the participant and organizer options, disabled the capability option when no current grant existed, showed the safe active-workspace explanation, preserved access to **All workspaces**, and displayed the account/navigation controls without component overlap at the desktop viewport. No preference was submitted during this non-mutating validation, so no existing user preference was changed.

The displayed zero-workspace state is expected for the retained participant account: the Stage 7/8 rules correctly expose no capability choice without a current selected-function grant. Database-backed integration coverage separately validates the active CSR capability flow, selected-function boundary, administrator assignment, and cleanup.
