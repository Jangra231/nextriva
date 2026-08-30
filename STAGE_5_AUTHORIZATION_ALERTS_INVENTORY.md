# Stage 5 Authorization and Grant-Alert Inventory

**Stage status:** In progress. Stage 5 extends only the explicitly listed execution paths and keeps every other retained role-based workflow unchanged unless its independent rollout flag is enabled.

| Surface | Existing authorization | Stage 5 selected function | Rollout decision |
| --- | --- | --- | --- |
| Local Authority MIS XLSX/PDF export | `mcd` role guard in `/api/exports/local-authority` | `LOCAL_AUTHORITY` + `LA_MIS_EXPORT` | Add a dedicated export-enforcement flag. Require a current selected-function grant only when it is exactly enabled. |
| CSR sponsorship brief submission | CSR role guard and owner-scoped draft lifecycle | `CSR_SPONSORSHIP` + `CSR_BRIEF_SUBMIT` | Add a dedicated CSR rollout flag. Preserve draft creation/editing and legacy submit behavior until explicitly enabled. |
| CSR report export | CSR role guard and sponsor-scoped report | `CSR_SPONSORSHIP` + `CSR_IMPACT_VIEW` | Include in the same explicit CSR rollout, because the report exposes the selected sponsor's assigned-event impact. |
| CSR budget creation, master review, and event assignment | Retained CSR/master guards | None in this release | Preserve without grant enforcement to avoid reworking budget/accounting or master authorization during this selective cutover. |
| Grant alerts/reminders | No dashboard surface yet | Existing grants and validity dates only | Compute live dashboard reminders from current dates; do not add a background scheduler or alter grant records. |

## Rollout and Alert Boundaries

`FITIZEN_CAPABILITY_MIS_EXPORT_ENFORCEMENT` and `FITIZEN_CSR_CAPABILITY_AUTHORIZATION_ENFORCEMENT` will default disabled and activate only on exact lowercase `true`. The master administrator must be able to create an auditable scoped migration grant for the retained Local Authority or CSR account before enabling a respective flag.

Alert widgets will show the account's due, scheduled, and near-expiry grants from live grant dates. They are advisory and do not mutate data; central authorization remains authoritative. The initial expiry horizon is 30 days and will use responsive, stacked cards so it remains readable on small screens without overlapping navigation, tables, or forms.
