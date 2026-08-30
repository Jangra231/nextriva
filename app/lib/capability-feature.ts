export function isCapabilityCatalogEnabled() {
  return process.env.FITIZEN_CAPABILITY_CATALOG_ENABLED !== "false";
}

export function isCapabilityDecisionNotificationsEnabled() {
  return process.env.FITIZEN_CAPABILITY_DECISION_NOTIFICATIONS_ENABLED !== "false";
}

export function isCapabilityWorkspaceSwitcherEnabled() {
  return process.env.FITIZEN_CAPABILITY_WORKSPACE_SWITCHER_ENABLED !== "false";
}

export function isWorkspaceLandingPreferencesEnabled() {
  return process.env.FITIZEN_WORKSPACE_LANDING_PREFERENCES_ENABLED !== "false";
}

export function isCapabilityGrantUsageReportingEnabled() {
  return process.env.FITIZEN_CAPABILITY_GRANT_USAGE_REPORTING_ENABLED !== "false";
}

export function isCsrCapabilityWorkspaceEnabled() {
  return process.env.FITIZEN_CSR_CAPABILITY_WORKSPACE_ENABLED !== "false";
}

export function isCsrGrantUsageExportEnabled() {
  return process.env.FITIZEN_CSR_GRANT_USAGE_EXPORT_ENABLED !== "false";
}

export function isWorkspaceDefaultExpiryAlertsEnabled() {
  return process.env.FITIZEN_WORKSPACE_DEFAULT_EXPIRY_ALERTS_ENABLED !== "false";
}

export function isCsrAssignmentTimelineEnabled() {
  return process.env.FITIZEN_CSR_ASSIGNMENT_TIMELINE_ENABLED !== "false";
}

export function isAuthorityCapabilityWorkspaceEnabled() {
  return process.env.FITIZEN_AUTHORITY_CAPABILITY_WORKSPACE_ENABLED !== "false";
}

export function isParticipantHistoryEnabled() {
  return process.env.FITIZEN_PARTICIPANT_HISTORY_ENABLED !== "false";
}

export function isStage10AuthorityAnalyticsEnabled() {
  return process.env.FITIZEN_STAGE10_AUTHORITY_ANALYTICS_ENABLED !== "false";
}

export function isStage10GrantReminderAutomationEnabled() {
  return process.env.FITIZEN_STAGE10_GRANT_REMINDER_AUTOMATION_ENABLED !== "false";
}
