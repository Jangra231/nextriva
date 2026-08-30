# Stage 4 Authorization Inventory

**Stage status:** In progress. This inventory defines the first compatibility-safe enforcement boundary before any legacy Local Authority behavior is routed through capability grants.

| Surface | Current authority guard | Current behavior | Stage 4 treatment |
| --- | --- | --- | --- |
| Local Authority event review | Legacy `users.role === "mcd"` through `requireLocalAuthorityAction` | An authority can approve, request changes, freeze, or suspend an event. | **First migrated execution path.** Require `LOCAL_AUTHORITY` + `LA_EVENT_REVIEW`, a current selected-function grant, and matching territory only when the Stage 4 rollout flag is enabled. |
| Local Authority overview | Legacy route/session guard | Read-only summaries and review-queue links. | Preserve as legacy-compatible observation in this rollout. |
| Territory, organizer, venue, and CSR monitoring | Legacy route/session guard | Read-only monitoring of existing records. | Preserve without grant enforcement in this rollout. Future function-by-function migration will use `LA_TERRITORY_MONITOR`. |
| Local Authority MIS export | Legacy route/session guard | Read-only XLSX/PDF export of current authority data. | Preserve without grant enforcement in this rollout. Future migration will use `LA_MIS_EXPORT`. |
| Master capability governance | Administrator role plus `MASTER` confirmation | Reviews applications and manages grants. | Add direct Local Authority migration grants and explicit due-expiry processing, with capability and administrator audit evidence. |

## Central Decision Contract

The Stage 4 decision service receives an account, capability code, function code, and optional resource territory. It accepts a grant only when it is active, inside its start/end interval, includes the selected function and dependencies, and matches the requested territory. It returns a structured decision with the matched grant/function rather than depending on UI state.

`FITIZEN_CAPABILITY_AUTHORIZATION_ENFORCEMENT` defaults to disabled. With the flag disabled, the first Local Authority execution path retains its existing role-based behavior and records no forced migration. With the exact value `true`, event review becomes grant-authorized. This keeps the cutover reversible without changing legacy roles, sessions, ownership, events, or historic workflows.

> Stage 4 starts with only the Local Authority event-review mutation. It does not silently reroute CSR, organizer, administrator, monitoring, or export permissions through the new service.
