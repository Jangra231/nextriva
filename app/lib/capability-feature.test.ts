import { afterEach, describe, expect, it } from "vitest";
import { isAuthorityCapabilityWorkspaceEnabled, isCapabilityCatalogEnabled, isCapabilityDecisionNotificationsEnabled, isCapabilityGrantUsageReportingEnabled, isCapabilityWorkspaceSwitcherEnabled, isCsrAssignmentTimelineEnabled, isCsrCapabilityWorkspaceEnabled, isCsrGrantUsageExportEnabled, isParticipantHistoryEnabled, isStage10AuthorityAnalyticsEnabled, isStage10GrantReminderAutomationEnabled, isWorkspaceDefaultExpiryAlertsEnabled, isWorkspaceLandingPreferencesEnabled } from "./capability-feature";

const original = process.env.FITIZEN_CAPABILITY_CATALOG_ENABLED;

afterEach(() => {
  if (original === undefined) delete process.env.FITIZEN_CAPABILITY_CATALOG_ENABLED;
  else process.env.FITIZEN_CAPABILITY_CATALOG_ENABLED = original;
});

describe("Stage 3 capability catalog visibility flag", () => {
  it("is enabled by default and only disables the catalog surface when explicitly false", () => {
    delete process.env.FITIZEN_CAPABILITY_CATALOG_ENABLED;
    expect(isCapabilityCatalogEnabled()).toBe(true);
    process.env.FITIZEN_CAPABILITY_CATALOG_ENABLED = "false";
    expect(isCapabilityCatalogEnabled()).toBe(false);
    process.env.FITIZEN_CAPABILITY_CATALOG_ENABLED = "FALSE";
    expect(isCapabilityCatalogEnabled()).toBe(true);
  });
});

describe("Stage 6 capability decision notification flag", () => {
  const originalNotifications = process.env.FITIZEN_CAPABILITY_DECISION_NOTIFICATIONS_ENABLED;

  afterEach(() => {
    if (originalNotifications === undefined) delete process.env.FITIZEN_CAPABILITY_DECISION_NOTIFICATIONS_ENABLED;
    else process.env.FITIZEN_CAPABILITY_DECISION_NOTIFICATIONS_ENABLED = originalNotifications;
  });

  it("is enabled by default and only disables notification persistence and visibility when explicitly false", () => {
    delete process.env.FITIZEN_CAPABILITY_DECISION_NOTIFICATIONS_ENABLED;
    expect(isCapabilityDecisionNotificationsEnabled()).toBe(true);
    process.env.FITIZEN_CAPABILITY_DECISION_NOTIFICATIONS_ENABLED = "false";
    expect(isCapabilityDecisionNotificationsEnabled()).toBe(false);
    process.env.FITIZEN_CAPABILITY_DECISION_NOTIFICATIONS_ENABLED = "FALSE";
    expect(isCapabilityDecisionNotificationsEnabled()).toBe(true);
  });
});

describe("Stage 7 capability workspace switcher flag", () => {
  const originalWorkspaces = process.env.FITIZEN_CAPABILITY_WORKSPACE_SWITCHER_ENABLED;

  afterEach(() => {
    if (originalWorkspaces === undefined) delete process.env.FITIZEN_CAPABILITY_WORKSPACE_SWITCHER_ENABLED;
    else process.env.FITIZEN_CAPABILITY_WORKSPACE_SWITCHER_ENABLED = originalWorkspaces;
  });

  it("is enabled by default and only disables dynamic workspace exposure when explicitly false", () => {
    delete process.env.FITIZEN_CAPABILITY_WORKSPACE_SWITCHER_ENABLED;
    expect(isCapabilityWorkspaceSwitcherEnabled()).toBe(true);
    process.env.FITIZEN_CAPABILITY_WORKSPACE_SWITCHER_ENABLED = "false";
    expect(isCapabilityWorkspaceSwitcherEnabled()).toBe(false);
    process.env.FITIZEN_CAPABILITY_WORKSPACE_SWITCHER_ENABLED = "FALSE";
    expect(isCapabilityWorkspaceSwitcherEnabled()).toBe(true);
  });
});

describe("Stage 8 and workspace personalization flags", () => {
  const originalPreferences = process.env.FITIZEN_WORKSPACE_LANDING_PREFERENCES_ENABLED;
  const originalUsage = process.env.FITIZEN_CAPABILITY_GRANT_USAGE_REPORTING_ENABLED;
  const originalCsr = process.env.FITIZEN_CSR_CAPABILITY_WORKSPACE_ENABLED;

  afterEach(() => {
    if (originalPreferences === undefined) delete process.env.FITIZEN_WORKSPACE_LANDING_PREFERENCES_ENABLED;
    else process.env.FITIZEN_WORKSPACE_LANDING_PREFERENCES_ENABLED = originalPreferences;
    if (originalUsage === undefined) delete process.env.FITIZEN_CAPABILITY_GRANT_USAGE_REPORTING_ENABLED;
    else process.env.FITIZEN_CAPABILITY_GRANT_USAGE_REPORTING_ENABLED = originalUsage;
    if (originalCsr === undefined) delete process.env.FITIZEN_CSR_CAPABILITY_WORKSPACE_ENABLED;
    else process.env.FITIZEN_CSR_CAPABILITY_WORKSPACE_ENABLED = originalCsr;
  });

  it("uses exact-false rollback semantics for preferences, grant usage, and the CSR capability workspace", () => {
    delete process.env.FITIZEN_WORKSPACE_LANDING_PREFERENCES_ENABLED; delete process.env.FITIZEN_CAPABILITY_GRANT_USAGE_REPORTING_ENABLED; delete process.env.FITIZEN_CSR_CAPABILITY_WORKSPACE_ENABLED;
    expect(isWorkspaceLandingPreferencesEnabled()).toBe(true); expect(isCapabilityGrantUsageReportingEnabled()).toBe(true); expect(isCsrCapabilityWorkspaceEnabled()).toBe(true);
    process.env.FITIZEN_WORKSPACE_LANDING_PREFERENCES_ENABLED = "false"; process.env.FITIZEN_CAPABILITY_GRANT_USAGE_REPORTING_ENABLED = "false"; process.env.FITIZEN_CSR_CAPABILITY_WORKSPACE_ENABLED = "false";
    expect(isWorkspaceLandingPreferencesEnabled()).toBe(false); expect(isCapabilityGrantUsageReportingEnabled()).toBe(false); expect(isCsrCapabilityWorkspaceEnabled()).toBe(false);
    process.env.FITIZEN_WORKSPACE_LANDING_PREFERENCES_ENABLED = "FALSE"; process.env.FITIZEN_CAPABILITY_GRANT_USAGE_REPORTING_ENABLED = "FALSE"; process.env.FITIZEN_CSR_CAPABILITY_WORKSPACE_ENABLED = "FALSE";
    expect(isWorkspaceLandingPreferencesEnabled()).toBe(true); expect(isCapabilityGrantUsageReportingEnabled()).toBe(true); expect(isCsrCapabilityWorkspaceEnabled()).toBe(true);
  });
});

describe("Stage 9 authority and administration enhancement flags", () => {
  const keys = ["FITIZEN_CSR_GRANT_USAGE_EXPORT_ENABLED", "FITIZEN_WORKSPACE_DEFAULT_EXPIRY_ALERTS_ENABLED", "FITIZEN_CSR_ASSIGNMENT_TIMELINE_ENABLED", "FITIZEN_AUTHORITY_CAPABILITY_WORKSPACE_ENABLED"] as const;
  const originalValues = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  afterEach(() => keys.forEach(key => { const value = originalValues[key]; if (value === undefined) delete process.env[key]; else process.env[key] = value; }));
  it("is enabled by default and disables only when each Stage 9 surface is set to exact false", () => {
    keys.forEach(key => delete process.env[key]); expect(isCsrGrantUsageExportEnabled()).toBe(true); expect(isWorkspaceDefaultExpiryAlertsEnabled()).toBe(true); expect(isCsrAssignmentTimelineEnabled()).toBe(true); expect(isAuthorityCapabilityWorkspaceEnabled()).toBe(true);
    keys.forEach(key => { process.env[key] = "false"; }); expect(isCsrGrantUsageExportEnabled()).toBe(false); expect(isWorkspaceDefaultExpiryAlertsEnabled()).toBe(false); expect(isCsrAssignmentTimelineEnabled()).toBe(false); expect(isAuthorityCapabilityWorkspaceEnabled()).toBe(false);
    keys.forEach(key => { process.env[key] = "FALSE"; }); expect(isCsrGrantUsageExportEnabled()).toBe(true); expect(isWorkspaceDefaultExpiryAlertsEnabled()).toBe(true); expect(isCsrAssignmentTimelineEnabled()).toBe(true); expect(isAuthorityCapabilityWorkspaceEnabled()).toBe(true);
  });
});

describe("Stage 10 participant-history and authority analytics flags", () => {
  const keys = ["FITIZEN_PARTICIPANT_HISTORY_ENABLED", "FITIZEN_STAGE10_AUTHORITY_ANALYTICS_ENABLED", "FITIZEN_STAGE10_GRANT_REMINDER_AUTOMATION_ENABLED"] as const;
  const originalValues = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  afterEach(() => keys.forEach(key => { const value = originalValues[key]; if (value === undefined) delete process.env[key]; else process.env[key] = value; }));
  it("is enabled by default and hides each Stage 10 surface only for exact false", () => {
    keys.forEach(key => delete process.env[key]); expect(isParticipantHistoryEnabled()).toBe(true); expect(isStage10AuthorityAnalyticsEnabled()).toBe(true); expect(isStage10GrantReminderAutomationEnabled()).toBe(true);
    keys.forEach(key => { process.env[key] = "false"; }); expect(isParticipantHistoryEnabled()).toBe(false); expect(isStage10AuthorityAnalyticsEnabled()).toBe(false); expect(isStage10GrantReminderAutomationEnabled()).toBe(false);
    keys.forEach(key => { process.env[key] = "FALSE"; }); expect(isParticipantHistoryEnabled()).toBe(true); expect(isStage10AuthorityAnalyticsEnabled()).toBe(true); expect(isStage10GrantReminderAutomationEnabled()).toBe(true);
  });
});
