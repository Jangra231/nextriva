import {
  boolean,
  foreignKey,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  publicId: varchar("publicId", { length: 24 }).notNull().unique(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  avatarUrl: varchar("avatarUrl", { length: 1024 }),
  role: mysqlEnum("role", ["user", "admin", "mcd", "csr", "state", "district"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  phone: varchar("phone", { length: 20 }).unique(),
  gender: varchar("gender", { length: 20 }),
  dateOfBirth: varchar("dateOfBirth", { length: 10 }),
  state: varchar("state", { length: 80 }),
  city: varchar("city", { length: 80 }),
  interests: json("interests").$type<string[]>(),
  eventFormat: json("eventFormat").$type<string[]>(),
  eventFrequency: varchar("eventFrequency", { length: 40 }),
  notificationPrefs: json("notificationPrefs").$type<{ email: boolean; push: boolean; sms: boolean }>(),
  profileCompleted: boolean("profileCompleted").default(false).notNull(),
  phoneVerified: boolean("phoneVerified").default(false).notNull(),
  designation: varchar("designation", { length: 100 }),
  department: varchar("department", { length: 100 }),
  zone: varchar("zone", { length: 80 }),
  ward: varchar("ward", { length: 80 }),
  areaOfWork: varchar("areaOfWork", { length: 200 }),
  notes: text("notes"),
});

export const otpVerifications = mysqlTable("otpVerifications", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  codeHash: varchar("codeHash", { length: 255 }).notNull(),
  purpose: mysqlEnum("purpose", ["signup", "login", "password_reset"]).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  consumedAt: timestamp("consumedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("otp_phone_purpose_idx").on(table.phone, table.purpose)]);

export const passwordResets = mysqlTable("passwordResets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 255 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  consumedAt: timestamp("consumedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("pwd_reset_user_idx").on(table.userId)]);

export const authorityTerminologyMappings = mysqlTable(
  "authorityTerminologyMappings",
  {
    id: int("id").autoincrement().primaryKey(),
    legacyCode: varchar("legacyCode", { length: 64 }).notNull().unique(),
    capabilityCode: varchar("capabilityCode", { length: 64 }).notNull(),
    displayName: varchar("displayName", { length: 120 }).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("authority_terminology_capability_idx").on(table.capabilityCode, table.active)],
);

export const userAccountProfiles = mysqlTable(
  "userAccountProfiles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique(),
    accountType: mysqlEnum("accountType", ["USER", "PLATFORM_ADMIN"]).default("USER").notNull(),
    profileTerminology: varchar("profileTerminology", { length: 80 }).default("User Profile").notNull(),
    legacyRole: varchar("legacyRole", { length: 64 }),
    migrationSource: varchar("migrationSource", { length: 80 }).default("stage2_backfill").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("user_account_profiles_type_idx").on(table.accountType), foreignKey({ columns: [table.userId], foreignColumns: [users.id], name: "user_account_profile_user_fk" }).onDelete("cascade")],
);

export const legacyAccountCapabilityMappings = mysqlTable(
  "legacyAccountCapabilityMappings",
  {
    id: int("id").autoincrement().primaryKey(),
    userAccountProfileId: int("userAccountProfileId").notNull(),
    legacyRole: varchar("legacyRole", { length: 64 }).notNull(),
    capabilityCode: varchar("capabilityCode", { length: 64 }).notNull(),
    active: boolean("active").default(true).notNull(),
    mappingSource: varchar("mappingSource", { length: 80 }).default("stage2_backfill").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("legacy_account_capability_unique").on(table.userAccountProfileId, table.capabilityCode), index("legacy_account_capability_code_idx").on(table.capabilityCode, table.active), foreignKey({ columns: [table.userAccountProfileId], foreignColumns: [userAccountProfiles.id], name: "legacy_account_capability_profile_fk" }).onDelete("cascade")],
);

export const accountMigrationRecords = mysqlTable(
  "accountMigrationRecords",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    migrationCode: varchar("migrationCode", { length: 96 }).notNull(),
    beforeState: json("beforeState").$type<Record<string, unknown> | null>(),
    afterState: json("afterState").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("account_migration_record_unique").on(table.userId, table.migrationCode), index("account_migration_record_code_idx").on(table.migrationCode, table.createdAt), foreignKey({ columns: [table.userId], foreignColumns: [users.id], name: "account_migration_user_fk" }).onDelete("cascade")],
);

export const capabilities = mysqlTable(
  "capabilities",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 64 }).notNull().unique(),
    displayName: varchar("displayName", { length: 140 }).notNull(),
    description: text("description").notNull(),
    audience: varchar("audience", { length: 140 }).notNull(),
    active: boolean("active").default(true).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("capabilities_active_sort_idx").on(table.active, table.sortOrder)],
);

export const capabilityFunctions = mysqlTable(
  "capabilityFunctions",
  {
    id: int("id").autoincrement().primaryKey(),
    capabilityId: int("capabilityId").notNull(),
    code: varchar("code", { length: 96 }).notNull().unique(),
    displayName: varchar("displayName", { length: 160 }).notNull(),
    description: text("description").notNull(),
    isMandatory: boolean("isMandatory").default(false).notNull(),
    dependencyCodes: json("dependencyCodes").$type<string[] | null>(),
    handlesSensitiveData: boolean("handlesSensitiveData").default(false).notNull(),
    active: boolean("active").default(true).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("capability_functions_capability_idx").on(table.capabilityId, table.active, table.sortOrder), foreignKey({ columns: [table.capabilityId], foreignColumns: [capabilities.id], name: "capability_function_catalog_fk" }).onDelete("cascade")],
);

export const capabilityApplications = mysqlTable(
  "capabilityApplications",
  {
    id: int("id").autoincrement().primaryKey(),
    userAccountProfileId: int("userAccountProfileId").notNull(),
    capabilityId: int("capabilityId").notNull(),
    status: mysqlEnum("status", ["draft", "submitted", "changes_requested", "approved", "rejected", "cancelled", "expired"]).default("draft").notNull(),
    justification: text("justification").notNull(),
    requestedScopeType: mysqlEnum("requestedScopeType", ["national", "state", "district", "city", "zone", "ward"]).default("national").notNull(),
    requestedState: varchar("requestedState", { length: 100 }),
    requestedDistrict: varchar("requestedDistrict", { length: 100 }),
    requestedCity: varchar("requestedCity", { length: 100 }),
    requestedZone: varchar("requestedZone", { length: 100 }),
    requestedWard: varchar("requestedWard", { length: 100 }),
    requestedStartsAt: timestamp("requestedStartsAt"),
    requestedEndsAt: timestamp("requestedEndsAt"),
    applicantNote: text("applicantNote"),
    roleSpecificData: json("roleSpecificData"),
    adminNote: text("adminNote"),
    submittedAt: timestamp("submittedAt"),
    reviewedByAdminId: int("reviewedByAdminId"),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("capability_applications_user_idx").on(table.userAccountProfileId, table.updatedAt), index("capability_applications_status_idx").on(table.status, table.updatedAt), foreignKey({ columns: [table.userAccountProfileId], foreignColumns: [userAccountProfiles.id], name: "capability_application_profile_fk" }).onDelete("cascade"), foreignKey({ columns: [table.capabilityId], foreignColumns: [capabilities.id], name: "capability_application_catalog_fk" }).onDelete("cascade"), foreignKey({ columns: [table.reviewedByAdminId], foreignColumns: [users.id], name: "capability_application_admin_fk" }).onDelete("set null")],
);

export const capabilityApplicationDocuments = mysqlTable(
  "capabilityApplicationDocuments",
  {
    id: int("id").autoincrement().primaryKey(),
    applicationId: int("applicationId").notNull(),
    storageKey: varchar("storageKey", { length: 500 }).notNull(),
    fileName: varchar("fileName", { length: 180 }).notNull(),
    contentType: varchar("contentType", { length: 120 }).notNull(),
    sizeBytes: int("sizeBytes").notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("cap_app_document_application_idx").on(table.applicationId, table.createdAt), foreignKey({ columns: [table.applicationId], foreignColumns: [capabilityApplications.id], name: "cap_app_document_application_fk" }).onDelete("cascade"), foreignKey({ columns: [table.createdByUserId], foreignColumns: [users.id], name: "cap_app_document_user_fk" }).onDelete("cascade")],
);

export const capabilityApplicationFunctions = mysqlTable(
  "capabilityApplicationFunctions",
  {
    id: int("id").autoincrement().primaryKey(),
    applicationId: int("applicationId").notNull(),
    capabilityFunctionId: int("capabilityFunctionId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("cap_application_function_unique").on(table.applicationId, table.capabilityFunctionId), foreignKey({ columns: [table.applicationId], foreignColumns: [capabilityApplications.id], name: "cap_application_function_app_fk" }).onDelete("cascade"), foreignKey({ columns: [table.capabilityFunctionId], foreignColumns: [capabilityFunctions.id], name: "cap_application_function_item_fk" }).onDelete("cascade")],
);

export const capabilityGrants = mysqlTable(
  "capabilityGrants",
  {
    id: int("id").autoincrement().primaryKey(),
    userAccountProfileId: int("userAccountProfileId").notNull(),
    capabilityId: int("capabilityId").notNull(),
    applicationId: int("applicationId"),
    status: mysqlEnum("status", ["active", "suspended", "revoked", "expired"]).default("active").notNull(),
    scopeType: mysqlEnum("scopeType", ["national", "state", "district", "city", "zone", "ward"]).default("national").notNull(),
    scopeState: varchar("scopeState", { length: 100 }),
    scopeDistrict: varchar("scopeDistrict", { length: 100 }),
    scopeCity: varchar("scopeCity", { length: 100 }),
    scopeZone: varchar("scopeZone", { length: 100 }),
    scopeWard: varchar("scopeWard", { length: 100 }),
    startsAt: timestamp("startsAt").notNull(),
    endsAt: timestamp("endsAt").notNull(),
    administrativeReason: text("administrativeReason").notNull(),
    grantedByAdminId: int("grantedByAdminId").notNull(),
    decidedAt: timestamp("decidedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("capability_grants_profile_status_idx").on(table.userAccountProfileId, table.status, table.endsAt), index("capability_grants_capability_idx").on(table.capabilityId, table.status), foreignKey({ columns: [table.userAccountProfileId], foreignColumns: [userAccountProfiles.id], name: "capability_grant_profile_fk" }).onDelete("cascade"), foreignKey({ columns: [table.capabilityId], foreignColumns: [capabilities.id], name: "capability_grant_catalog_fk" }).onDelete("cascade"), foreignKey({ columns: [table.applicationId], foreignColumns: [capabilityApplications.id], name: "capability_grant_application_fk" }).onDelete("set null"), foreignKey({ columns: [table.grantedByAdminId], foreignColumns: [users.id], name: "capability_grant_admin_fk" }).onDelete("cascade")],
);

export const capabilityGrantFunctions = mysqlTable(
  "capabilityGrantFunctions",
  {
    id: int("id").autoincrement().primaryKey(),
    grantId: int("grantId").notNull(),
    capabilityFunctionId: int("capabilityFunctionId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("cap_grant_function_unique").on(table.grantId, table.capabilityFunctionId), foreignKey({ columns: [table.grantId], foreignColumns: [capabilityGrants.id], name: "cap_grant_function_grant_fk" }).onDelete("cascade"), foreignKey({ columns: [table.capabilityFunctionId], foreignColumns: [capabilityFunctions.id], name: "cap_grant_function_item_fk" }).onDelete("cascade")],
);

export const userWorkspacePreferences = mysqlTable(
  "userWorkspacePreferences",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique(),
    defaultView: mysqlEnum("defaultView", ["participant", "organizer", "capability"]).default("participant").notNull(),
    defaultCapabilityGrantId: int("defaultCapabilityGrantId").references(() => capabilityGrants.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("workspace_preference_grant_idx").on(table.defaultCapabilityGrantId), foreignKey({ columns: [table.userId], foreignColumns: [users.id], name: "workspace_preference_user_fk" }).onDelete("cascade")],
);

export const capabilityAuditRecords = mysqlTable(
  "capabilityAuditRecords",
  {
    id: int("id").autoincrement().primaryKey(),
    applicationId: int("applicationId"),
    grantId: int("grantId"),
    actorUserId: int("actorUserId").notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    beforeState: json("beforeState").$type<Record<string, unknown> | null>(),
    afterState: json("afterState").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("capability_audit_application_idx").on(table.applicationId, table.createdAt), index("capability_audit_grant_idx").on(table.grantId, table.createdAt), foreignKey({ columns: [table.applicationId], foreignColumns: [capabilityApplications.id], name: "capability_audit_application_fk" }).onDelete("set null"), foreignKey({ columns: [table.grantId], foreignColumns: [capabilityGrants.id], name: "capability_audit_grant_fk" }).onDelete("set null"), foreignKey({ columns: [table.actorUserId], foreignColumns: [users.id], name: "capability_audit_actor_fk" }).onDelete("cascade")],
);

export const capabilityDecisionNotifications = mysqlTable(
  "capabilityDecisionNotifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    applicationId: int("applicationId"),
    grantId: int("grantId"),
    kind: varchar("kind", { length: 80 }).notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    body: text("body").notNull(),
    actionUrl: varchar("actionUrl", { length: 260 }).notNull(),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("capability_decision_notification_user_idx").on(table.userId, table.readAt, table.createdAt), index("capability_decision_notification_application_idx").on(table.applicationId, table.createdAt), foreignKey({ columns: [table.userId], foreignColumns: [users.id], name: "capability_decision_notification_user_fk" }).onDelete("cascade"), foreignKey({ columns: [table.applicationId], foreignColumns: [capabilityApplications.id], name: "capability_decision_notification_application_fk" }).onDelete("set null"), foreignKey({ columns: [table.grantId], foreignColumns: [capabilityGrants.id], name: "capability_decision_notification_grant_fk" }).onDelete("set null")],
);

export const authorityDeliveryPlans = mysqlTable(
  "authorityDeliveryPlans",
  {
    id: int("id").autoincrement().primaryKey(),
    publicId: varchar("publicId", { length: 32 }).notNull().unique(),
    grantId: int("grantId").notNull().references(() => capabilityGrants.id, { onDelete: "restrict" }),
    createdByUserId: int("createdByUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 180 }).notNull(),
    objective: text("objective").notNull(),
    scopeType: mysqlEnum("scopeType", ["national", "state", "district", "city", "zone", "ward"]).notNull(),
    state: varchar("state", { length: 100 }),
    district: varchar("district", { length: 100 }),
    city: varchar("city", { length: 100 }),
    zone: varchar("zone", { length: 100 }),
    ward: varchar("ward", { length: 100 }),
    startsAt: timestamp("startsAt"),
    endsAt: timestamp("endsAt"),
    status: mysqlEnum("status", ["draft", "active", "closed"]).default("draft").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("authority_plan_grant_idx").on(table.grantId, table.updatedAt), index("authority_plan_scope_idx").on(table.scopeType, table.state, table.district, table.city)],
);

export const authorityStateProgrammes = mysqlTable(
  "authorityStateProgrammes",
  {
    id: int("id").autoincrement().primaryKey(),
    publicId: varchar("publicId", { length: 32 }).notNull().unique(),
    grantId: int("grantId").notNull().references(() => capabilityGrants.id, { onDelete: "restrict" }),
    createdByUserId: int("createdByUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 180 }).notNull(),
    objective: text("objective").notNull(),
    scopeType: mysqlEnum("scopeType", ["national", "state", "district", "city", "zone", "ward"]).notNull(),
    state: varchar("state", { length: 100 }),
    district: varchar("district", { length: 100 }),
    city: varchar("city", { length: 100 }),
    zone: varchar("zone", { length: 100 }),
    ward: varchar("ward", { length: 100 }),
    startsAt: timestamp("startsAt"),
    endsAt: timestamp("endsAt"),
    status: mysqlEnum("status", ["draft", "active", "closed"]).default("draft").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("authority_programme_grant_idx").on(table.grantId, table.updatedAt), index("authority_programme_scope_idx").on(table.scopeType, table.state, table.district, table.city)],
);

export const authorityExceptions = mysqlTable(
  "authorityExceptions",
  {
    id: int("id").autoincrement().primaryKey(),
    publicId: varchar("publicId", { length: 32 }).notNull().unique(),
    grantId: int("grantId").notNull().references(() => capabilityGrants.id, { onDelete: "restrict" }),
    createdByUserId: int("createdByUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    capabilityCode: varchar("capabilityCode", { length: 64 }).notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    details: text("details").notNull(),
    scopeType: mysqlEnum("scopeType", ["national", "state", "district", "city", "zone", "ward"]).notNull(),
    state: varchar("state", { length: 100 }),
    district: varchar("district", { length: 100 }),
    city: varchar("city", { length: 100 }),
    zone: varchar("zone", { length: 100 }),
    ward: varchar("ward", { length: 100 }),
    status: mysqlEnum("status", ["open", "resolved"]).default("open").notNull(),
    resolutionNote: text("resolutionNote"),
    resolvedByUserId: int("resolvedByUserId").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("authority_exception_grant_idx").on(table.grantId, table.updatedAt), index("authority_exception_scope_idx").on(table.capabilityCode, table.scopeType, table.state, table.district)],
);

export const csrProfiles = mysqlTable(
  "csrProfiles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
    companyName: varchar("companyName", { length: 180 }).notNull(),
    registrationNumber: varchar("registrationNumber", { length: 120 }),
    foundationName: varchar("foundationName", { length: 180 }),
    contactName: varchar("contactName", { length: 140 }).notNull(),
    contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
    contactPhone: varchar("contactPhone", { length: 40 }),
    focusAreas: text("focusAreas"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("csr_profiles_active_idx").on(table.active)],
);

export const implementationAgencies = mysqlTable(
  "implementationAgencies",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 180 }).notNull().unique(),
    registrationNumber: varchar("registrationNumber", { length: 120 }),
    contactName: varchar("contactName", { length: 140 }),
    contactEmail: varchar("contactEmail", { length: 320 }),
    contactPhone: varchar("contactPhone", { length: 40 }),
    coverageNotes: text("coverageNotes"),
    active: boolean("active").default(true).notNull(),
    createdByAdminId: int("createdByAdminId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("implementation_agencies_active_idx").on(table.active)],
);

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 80 }).notNull().unique(),
  slug: varchar("slug", { length: 90 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const approvedVenues = mysqlTable(
  "approvedVenues",
  {
    id: int("id").autoincrement().primaryKey(),
    zone: varchar("zone", { length: 100 }).notNull(),
    ward: varchar("ward", { length: 100 }).notNull(),
    location: varchar("location", { length: 160 }).notNull(),
    venueName: varchar("venueName", { length: 160 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    address: text("address"),
    sector: varchar("sector", { length: 100 }),
    area: varchar("area", { length: 120 }),
    latitudeE6: int("latitudeE6").notNull(),
    longitudeE6: int("longitudeE6").notNull(),
    setting: mysqlEnum("setting", ["indoor", "outdoor"]).notNull(),
    capacity: int("capacity"),
    isAccessible: boolean("isAccessible").default(false).notNull(),
    accessibilityNotes: text("accessibilityNotes"),
    active: boolean("active").default(true).notNull(),
    createdByAdminId: int("createdByAdminId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("approved_venues_active_city_idx").on(table.active, table.city), index("approved_venues_location_idx").on(table.location, table.venueName)],
);

export const venueApprovalRequests = mysqlTable(
  "venueApprovalRequests",
  {
    id: int("id").autoincrement().primaryKey(),
    organizerId: int("organizerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    eventId: int("eventId").references(() => events.id, { onDelete: "set null" }),
    zone: varchar("zone", { length: 100 }).notNull(),
    ward: varchar("ward", { length: 100 }).notNull(),
    location: varchar("location", { length: 160 }).notNull(),
    venueName: varchar("venueName", { length: 160 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    address: text("address"),
    sector: varchar("sector", { length: 100 }),
    area: varchar("area", { length: 120 }),
    latitudeE6: int("latitudeE6").notNull(),
    longitudeE6: int("longitudeE6").notNull(),
    setting: mysqlEnum("setting", ["indoor", "outdoor"]).notNull(),
    capacity: int("capacity"),
    isAccessible: boolean("isAccessible").default(false).notNull(),
    accessibilityNotes: text("accessibilityNotes"),
    status: mysqlEnum("status", ["pending", "changes_requested", "approved", "rejected"]).default("pending").notNull(),
    organizerNote: text("organizerNote"),
    reviewNote: text("reviewNote"),
    reviewedByAdminId: int("reviewedByAdminId").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewedAt"),
    approvedVenueId: int("approvedVenueId").references(() => approvedVenues.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("venue_request_organizer_idx").on(table.organizerId, table.updatedAt), index("venue_request_status_idx").on(table.status, table.createdAt), index("venue_request_event_idx").on(table.eventId)],
);

export const venueFilterPresets = mysqlTable(
  "venueFilterPresets",
  {
    id: int("id").autoincrement().primaryKey(),
    organizerId: int("organizerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    query: varchar("query", { length: 120 }),
    zone: varchar("zone", { length: 100 }),
    ward: varchar("ward", { length: 100 }),
    minimumCapacity: int("minimumCapacity"),
    accessibility: mysqlEnum("accessibility", ["all", "accessible", "standard"]).default("all").notNull(),
    radiusKm: int("radiusKm"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("venue_filter_presets_organizer_idx").on(table.organizerId, table.updatedAt)],
);

export const venueAvailabilitySubscriptions = mysqlTable(
  "venueAvailabilitySubscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    organizerId: int("organizerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    venueId: int("venueId").notNull().references(() => approvedVenues.id, { onDelete: "cascade" }),
    eventId: int("eventId").references(() => events.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("venue_availability_subscription_unique").on(table.organizerId, table.venueId), index("venue_availability_subscription_venue_idx").on(table.venueId)],
);

export const venueAvailabilityNotifications = mysqlTable(
  "venueAvailabilityNotifications",
  {
    id: int("id").autoincrement().primaryKey(),
    organizerId: int("organizerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    venueId: int("venueId").references(() => approvedVenues.id, { onDelete: "set null" }),
    releasedEventId: int("releasedEventId").references(() => events.id, { onDelete: "set null" }),
    title: varchar("title", { length: 180 }).notNull(),
    body: text("body").notNull(),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("venue_availability_notification_organizer_idx").on(table.organizerId, table.readAt, table.createdAt)],
);

export const events = mysqlTable(
  "events",
  {
    id: int("id").autoincrement().primaryKey(),
    organizerId: int("organizerId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizerPublicId: varchar("organizerPublicId", { length: 24 }).notNull(),
    publicId: varchar("publicId", { length: 24 }).notNull().unique(),
    categoryId: int("categoryId").references(() => categories.id, { onDelete: "set null" }),
    title: varchar("title", { length: 150 }).notNull(),
    displayName: varchar("displayName", { length: 50 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull().unique(),
    visibility: mysqlEnum("visibility", ["public", "private", "external"])
      .default("public")
      .notNull(),
    status: mysqlEnum("status", ["draft", "live", "completed"]).default("draft").notNull(),
    moderationStatus: mysqlEnum("moderationStatus", ["draft", "submitted", "approved", "rejected", "frozen", "suspended", "deleted"]).default("draft").notNull(),
    submittedAt: timestamp("submittedAt"),
    reviewedAt: timestamp("reviewedAt"),
    reviewedByAdminId: int("reviewedByAdminId").references(() => users.id, { onDelete: "set null" }),
    moderationNote: text("moderationNote"),
    currentStep: int("currentStep").default(1).notNull(),
    startsAt: timestamp("startsAt"),
    endsAt: timestamp("endsAt"),
    timezone: varchar("timezone", { length: 64 }).default("Asia/Calcutta").notNull(),
    locationMode: mysqlEnum("locationMode", ["address", "undecided"]).default("address").notNull(),
    locationSource: mysqlEnum("locationSource", ["manual", "directory"]).default("manual").notNull(),
    approvedVenueId: int("approvedVenueId").references(() => approvedVenues.id, { onDelete: "set null" }),
    bibExpoDate: timestamp("bibExpoDate"),
    city: varchar("city", { length: 100 }),
    venueName: varchar("venueName", { length: 160 }),
    addressLine1: varchar("addressLine1", { length: 220 }),
    addressLine2: varchar("addressLine2", { length: 220 }),
    address: text("address"),
    zone: varchar("zone", { length: 100 }),
    ward: varchar("ward", { length: 100 }),
    sector: varchar("sector", { length: 100 }),
    area: varchar("area", { length: 120 }),
    latitudeE6: int("latitudeE6"),
    longitudeE6: int("longitudeE6"),
    venueSetting: mysqlEnum("venueSetting", ["indoor", "outdoor"]),
    venueCapacity: int("venueCapacity"),
    venueIsAccessible: boolean("venueIsAccessible").default(false).notNull(),
    venueAccessibilityNotes: text("venueAccessibilityNotes"),
    description: text("description"),
    coverUrl: text("coverUrl"),
    fillingFastThresholdPercent: int("fillingFastThresholdPercent").default(70).notNull(),
    manualPaymentEnabled: boolean("manualPaymentEnabled").default(false).notNull(),
    manualPaymentMethod: mysqlEnum("manualPaymentMethod", ["upi", "bank", "both"]),
    upiId: varchar("upiId", { length: 128 }),
    bankAccountName: varchar("bankAccountName", { length: 160 }),
    bankAccountNumber: varchar("bankAccountNumber", { length: 64 }),
    bankIfsc: varchar("bankIfsc", { length: 32 }),
    bankName: varchar("bankName", { length: 160 }),
    manualPaymentNote: text("manualPaymentNote"),
    platformFeePercent: int("platformFeePercent").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    publishedAt: timestamp("publishedAt"),
  },
  table => [
    index("events_organizer_status_idx").on(table.organizerId, table.status),
    index("events_organizer_moderation_idx").on(table.organizerId, table.moderationStatus),
    index("events_moderation_idx").on(table.moderationStatus, table.updatedAt),
    index("events_public_listing_idx").on(table.status, table.visibility, table.startsAt),
    index("events_city_idx").on(table.city),
    index("events_approved_venue_idx").on(table.approvedVenueId),
  ],
);

export const csrBudgets = mysqlTable(
  "csrBudgets",
  {
    id: int("id").autoincrement().primaryKey(),
    csrProfileId: int("csrProfileId").notNull().references(() => csrProfiles.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 120 }).notNull(),
    totalPaise: int("totalPaise").notNull(),
    committedPaise: int("committedPaise").default(0).notNull(),
    spentPaise: int("spentPaise").default(0).notNull(),
    startsAt: timestamp("startsAt"),
    endsAt: timestamp("endsAt"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("csr_budgets_profile_active_idx").on(table.csrProfileId, table.active)],
);

export const csrSponsorships = mysqlTable(
  "csrSponsorships",
  {
    id: int("id").autoincrement().primaryKey(),
    csrProfileId: int("csrProfileId").notNull().references(() => csrProfiles.id, { onDelete: "cascade" }),
    budgetId: int("budgetId").notNull().references(() => csrBudgets.id, { onDelete: "restrict" }),
    eventId: int("eventId").notNull().references(() => events.id, { onDelete: "restrict" }),
    activityCategoryId: int("activityCategoryId").notNull().references(() => categories.id, { onDelete: "restrict" }),
    approvedVenueId: int("approvedVenueId").notNull().references(() => approvedVenues.id, { onDelete: "restrict" }),
    implementationAgencyId: int("implementationAgencyId").notNull().references(() => implementationAgencies.id, { onDelete: "restrict" }),
    city: varchar("city", { length: 100 }).notNull(),
    zone: varchar("zone", { length: 100 }).notNull(),
    ward: varchar("ward", { length: 100 }).notNull(),
    amountPaise: int("amountPaise").notNull(),
    purpose: text("purpose"),
    status: mysqlEnum("status", ["draft", "submitted", "mcd_approved", "mcd_rejected", "approved", "rejected", "cancelled"]).default("draft").notNull(),
    csrApprovalNote: text("csrApprovalNote"),
    mcdReviewNote: text("mcdReviewNote"),
    mcdReviewedByUserId: int("mcdReviewedByUserId").references(() => users.id, { onDelete: "set null" }),
    mcdReviewedAt: timestamp("mcdReviewedAt"),
    adminApprovalNote: text("adminApprovalNote"),
    submittedAt: timestamp("submittedAt"),
    reviewedByAdminId: int("reviewedByAdminId").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("csr_sponsorship_profile_idx").on(table.csrProfileId, table.updatedAt), index("csr_sponsorship_event_idx").on(table.eventId), index("csr_sponsorship_status_idx").on(table.status, table.updatedAt)],
);

export const csrSponsorshipRequests = mysqlTable(
  "csrSponsorshipRequests",
  {
    id: int("id").autoincrement().primaryKey(),
    publicId: varchar("publicId", { length: 32 }).unique(),
    capabilityGrantId: int("capabilityGrantId").references(() => capabilityGrants.id, { onDelete: "set null" }),
    csrProfileId: int("csrProfileId").notNull().references(() => csrProfiles.id, { onDelete: "cascade" }),
    budgetId: int("budgetId").notNull().references(() => csrBudgets.id, { onDelete: "restrict" }),
    requestKind: mysqlEnum("requestKind", ["existing_event", "future_event"]).notNull(),
    eventType: varchar("eventType", { length: 120 }).notNull(),
    titlePreference: varchar("titlePreference", { length: 180 }),
    intendedAudience: varchar("intendedAudience", { length: 220 }).notNull(),
    cityPreference: varchar("cityPreference", { length: 100 }),
    zonePreference: varchar("zonePreference", { length: 100 }),
    wardPreference: varchar("wardPreference", { length: 100 }),
    preferredStartDate: timestamp("preferredStartDate"),
    preferredEndDate: timestamp("preferredEndDate"),
    estimatedCapacity: int("estimatedCapacity"),
    accessibilityNeeds: text("accessibilityNeeds"),
    successIndicators: text("successIndicators"),
    details: text("details").notNull(),
    amountPaise: int("amountPaise").notNull(),
    status: mysqlEnum("status", ["draft", "submitted", "changes_requested", "approved_pending_assignment", "rejected", "assigned", "cancelled"]).default("draft").notNull(),
    csrSubmissionNote: text("csrSubmissionNote"),
    adminReviewNote: text("adminReviewNote"),
    reviewedByAdminId: int("reviewedByAdminId").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewedAt"),
    assignedEventId: int("assignedEventId").references(() => events.id, { onDelete: "set null" }),
    assignedByAdminId: int("assignedByAdminId").references(() => users.id, { onDelete: "set null" }),
    assignedAt: timestamp("assignedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("csr_request_profile_idx").on(table.csrProfileId, table.updatedAt),
    index("csr_request_capability_grant_idx").on(table.capabilityGrantId, table.updatedAt),
    index("csr_request_status_idx").on(table.status, table.updatedAt),
    index("csr_request_assigned_event_idx").on(table.assignedEventId),
  ],
);

export const csrFutureEventConcepts = mysqlTable(
  "csrFutureEventConcepts",
  {
    id: int("id").autoincrement().primaryKey(),
    publicId: varchar("publicId", { length: 32 }).notNull().unique(),
    requestId: int("requestId").notNull().unique().references(() => csrSponsorshipRequests.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 180 }).notNull(),
    activityType: varchar("activityType", { length: 120 }).notNull(),
    city: varchar("city", { length: 100 }),
    zone: varchar("zone", { length: 100 }),
    ward: varchar("ward", { length: 100 }),
    proposedStartsAt: timestamp("proposedStartsAt"),
    proposedEndsAt: timestamp("proposedEndsAt"),
    notes: text("notes").notNull(),
    status: mysqlEnum("status", ["proposed", "event_owner_requested", "converted", "cancelled"]).default("proposed").notNull(),
    createdByAdminId: int("createdByAdminId").notNull().references(() => users.id, { onDelete: "cascade" }),
    convertedEventId: int("convertedEventId").references(() => events.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("csr_future_concept_status_idx").on(table.status, table.createdAt), index("csr_future_concept_territory_idx").on(table.city, table.zone, table.ward)],
);

export const csrCapabilitySponsorships = mysqlTable(
  "csrCapabilitySponsorships",
  {
    id: int("id").autoincrement().primaryKey(),
    publicId: varchar("publicId", { length: 32 }).notNull().unique(),
    requestId: int("requestId").notNull().unique().references(() => csrSponsorshipRequests.id, { onDelete: "cascade" }),
    fundingStatus: mysqlEnum("fundingStatus", ["pending", "committed", "funded", "complete", "cancelled"]).default("pending").notNull(),
    transactionReference: varchar("transactionReference", { length: 160 }),
    transactionDate: timestamp("transactionDate"),
    fundingRecordedAt: timestamp("fundingRecordedAt"),
    reportSummary: text("reportSummary"),
    reportRecordedAt: timestamp("reportRecordedAt"),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("csr_capability_sponsorship_funding_idx").on(table.fundingStatus, table.updatedAt)],
);

export const csrEventAssignments = mysqlTable(
  "csrEventAssignments",
  {
    id: int("id").autoincrement().primaryKey(),
    publicId: varchar("publicId", { length: 32 }).notNull().unique(),
    sponsorshipId: int("sponsorshipId").notNull().unique().references(() => csrCapabilitySponsorships.id, { onDelete: "cascade" }),
    eventId: int("eventId").references(() => events.id, { onDelete: "set null" }),
    futureEventConceptId: int("futureEventConceptId").references(() => csrFutureEventConcepts.id, { onDelete: "set null" }),
    approvedParticipantFields: json("approvedParticipantFields").$type<string[] | null>(),
    assignmentNote: text("assignmentNote").notNull(),
    status: mysqlEnum("status", ["assigned", "completed", "cancelled"]).default("assigned").notNull(),
    assignedByAdminId: int("assignedByAdminId").notNull().references(() => users.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assignedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("csr_assignment_event_idx").on(table.eventId), index("csr_assignment_concept_idx").on(table.futureEventConceptId), index("csr_assignment_status_idx").on(table.status, table.updatedAt)],
);

export const tickets = mysqlTable(
  "tickets",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    pricePaise: int("pricePaise").default(0).notNull(),
    ticketCategory: mysqlEnum("ticketCategory", ["paid", "free", "donation"]).default("free").notNull(),
    gstApplicable: boolean("gstApplicable").default(false).notNull(),
    gstRatePercent: int("gstRatePercent").default(0).notNull(),
    quantityLimit: int("quantityLimit").default(100).notNull(),
    minPerBooking: int("minPerBooking").default(1).notNull(),
    maxPerBooking: int("maxPerBooking").default(10).notNull(),
    platformFeePayer: mysqlEnum("platformFeePayer", ["organizer", "buyer"]).default("organizer").notNull(),
    fitizenFeePayer: mysqlEnum("fitizenFeePayer", ["organizer", "buyer"]).default("organizer").notNull(),
    gatewayFeePayer: mysqlEnum("gatewayFeePayer", ["organizer", "buyer"]).default("organizer").notNull(),
    attendeeMessage: text("attendeeMessage"),
    quantitySold: int("quantitySold").default(0).notNull(),
    salesStartAt: timestamp("salesStartAt"),
    salesEndAt: timestamp("salesEndAt"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("tickets_event_idx").on(table.eventId)],
);

export const customQuestions = mysqlTable(
  "customQuestions",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    question: varchar("question", { length: 240 }).notNull(),
    fieldType: mysqlEnum("fieldType", ["short_text", "long_text", "select", "checkbox"])
      .default("short_text")
      .notNull(),
    options: json("options").$type<string[]>(),
    required: boolean("required").default(false).notNull(),
    position: int("position").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("questions_event_idx").on(table.eventId)],
);

export const registrations = mysqlTable(
  "registrations",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    ticketId: int("ticketId").references(() => tickets.id, { onDelete: "set null" }),
    attendeeId: int("attendeeId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    attendeePublicId: varchar("attendeePublicId", { length: 24 }).notNull(),
    registrationNumber: varchar("registrationNumber", { length: 24 }).unique(),
    orderNumber: varchar("orderNumber", { length: 40 }).notNull().unique(),
    status: mysqlEnum("status", ["confirmed", "cancelled", "checked_in"])
      .default("confirmed")
      .notNull(),
    ticketSubtotalPaise: int("ticketSubtotalPaise").default(0).notNull(),
    gstPaise: int("gstPaise").default(0).notNull(),
    paidAmountPaise: int("paidAmountPaise").default(0).notNull(),
    platformFeePaise: int("platformFeePaise").default(0).notNull(),
    gatewayFeePaise: int("gatewayFeePaise").default(0).notNull(),
    gatewayFeePercent: int("gatewayFeePercent").default(0).notNull(),
    paymentStatus: mysqlEnum("paymentStatus", ["not_required", "pending", "paid", "failed", "refunded"])
      .default("not_required")
      .notNull(),
    stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
    stripeCheckoutSessionId: varchar("stripeCheckoutSessionId", { length: 255 }),
    manualPaymentReference: varchar("manualPaymentReference", { length: 128 }),
    paymentProofUrl: varchar("paymentProofUrl", { length: 1024 }),
    paymentProofSubmittedAt: timestamp("paymentProofSubmittedAt"),
    paymentRejectedAt: timestamp("paymentRejectedAt"),
    paymentRejectionNote: text("paymentRejectionNote"),
    checkedInAt: timestamp("checkedInAt"),
    confirmationEmailSentAt: timestamp("confirmationEmailSentAt"),
    reminderClaimedAt: timestamp("reminderClaimedAt"),
    reminderEmailSentAt: timestamp("reminderEmailSentAt"),
    answers: json("answers").$type<Record<string, string | boolean>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("registrations_event_idx").on(table.eventId),
    index("registrations_attendee_idx").on(table.attendeeId),
    index("registrations_attendee_public_idx").on(table.attendeePublicId),
    index("registrations_checkout_session_idx").on(table.stripeCheckoutSessionId),
  ],
);

export const platformSettings = mysqlTable(
  "platformSettings",
  {
    id: int("id").autoincrement().primaryKey(),
    settingKey: varchar("settingKey", { length: 32 }).notNull().unique(),
    gatewayFeePercent: int("gatewayFeePercent").default(0).notNull(),
    invoicePrefix: varchar("invoicePrefix", { length: 12 }).default("NXR").notNull(),
    issuerLegalName: varchar("issuerLegalName", { length: 180 }),
    issuerTaxRegistrationNumber: varchar("issuerTaxRegistrationNumber", { length: 80 }),
    issuerAddress: text("issuerAddress"),
    updatedByAdminId: int("updatedByAdminId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("platform_settings_updated_idx").on(table.updatedAt)],
);

export const taxInvoices = mysqlTable(
  "taxInvoices",
  {
    id: int("id").autoincrement().primaryKey(),
    registrationId: int("registrationId").notNull().unique().references(() => registrations.id, { onDelete: "restrict" }),
    invoiceNumber: varchar("invoiceNumber", { length: 40 }).notNull().unique(),
    invoicePrefix: varchar("invoicePrefix", { length: 12 }).notNull(),
    issuerLegalName: varchar("issuerLegalName", { length: 180 }),
    issuerTaxRegistrationNumber: varchar("issuerTaxRegistrationNumber", { length: 80 }),
    issuerAddress: text("issuerAddress"),
    ticketSubtotalPaise: int("ticketSubtotalPaise").default(0).notNull(),
    gstPaise: int("gstPaise").default(0).notNull(),
    platformFeePaise: int("platformFeePaise").default(0).notNull(),
    gatewayFeePaise: int("gatewayFeePaise").default(0).notNull(),
    totalPaise: int("totalPaise").default(0).notNull(),
    issuedAt: timestamp("issuedAt").defaultNow().notNull(),
  },
  table => [index("tax_invoices_issued_idx").on(table.issuedAt)],
);

export const participantHistoryConsents = mysqlTable(
  "participantHistoryConsents",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
    healthConsentGranted: boolean("healthConsentGranted").default(false).notNull(),
    policyVersion: varchar("policyVersion", { length: 32 }).default("stage10-v1").notNull(),
    grantedAt: timestamp("grantedAt"),
    withdrawnAt: timestamp("withdrawnAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("history_consent_granted_idx").on(table.healthConsentGranted, table.updatedAt)],
);

export const participantHistoryEntries = mysqlTable(
  "participantHistoryEntries",
  {
    id: int("id").autoincrement().primaryKey(),
    publicId: varchar("publicId", { length: 32 }).notNull().unique(),
    registrationId: int("registrationId").notNull().references(() => registrations.id, { onDelete: "restrict" }),
    eventId: int("eventId").notNull().references(() => events.id, { onDelete: "restrict" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "restrict" }),
    categorySlug: varchar("categorySlug", { length: 90 }).notNull(),
    entryType: mysqlEnum("entryType", ["health", "education", "community", "experience"]).notNull(),
    entryDate: varchar("entryDate", { length: 10 }).notNull(),
    payload: json("payload").$type<Record<string, string | number | boolean | null>>().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("history_entry_daily_unique").on(table.registrationId, table.entryType, table.entryDate), index("history_entry_user_created_idx").on(table.userId, table.createdAt), index("history_entry_event_date_idx").on(table.eventId, table.entryDate)],
);

export const participantHistoryCorrections = mysqlTable(
  "participantHistoryCorrections",
  {
    id: int("id").autoincrement().primaryKey(),
    publicId: varchar("publicId", { length: 32 }).notNull().unique(),
    originalEntryId: int("originalEntryId").notNull().references(() => participantHistoryEntries.id, { onDelete: "restrict" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "restrict" }),
    reason: text("reason").notNull(),
    correctedPayload: json("correctedPayload").$type<Record<string, string | number | boolean | null>>().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("history_correction_entry_idx").on(table.originalEntryId, table.createdAt), index("history_correction_user_idx").on(table.userId, table.createdAt)],
);

export const participantHistoryAuditRecords = mysqlTable(
  "participantHistoryAuditRecords",
  {
    id: int("id").autoincrement().primaryKey(),
    entryId: int("entryId").references(() => participantHistoryEntries.id, { onDelete: "set null" }),
    correctionId: int("correctionId").references(() => participantHistoryCorrections.id, { onDelete: "set null" }),
    grantId: int("grantId").references(() => capabilityGrants.id, { onDelete: "set null" }),
    actorUserId: int("actorUserId").notNull().references(() => users.id, { onDelete: "restrict" }),
    action: varchar("action", { length: 100 }).notNull(),
    context: json("context").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("history_audit_entry_idx").on(table.entryId, table.createdAt), index("history_audit_grant_idx").on(table.grantId, table.createdAt), index("history_audit_actor_idx").on(table.actorUserId, table.createdAt)],
);

export const capabilityGrantReminderDeliveries = mysqlTable(
  "capabilityGrantReminderDeliveries",
  {
    id: int("id").autoincrement().primaryKey(),
    grantId: int("grantId").notNull().references(() => capabilityGrants.id, { onDelete: "cascade" }),
    recipientUserId: int("recipientUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    reminderWindow: varchar("reminderWindow", { length: 16 }).notNull(),
    notificationId: int("notificationId").references(() => capabilityDecisionNotifications.id, { onDelete: "set null" }),
    deliveredAt: timestamp("deliveredAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("grant_reminder_delivery_unique").on(table.grantId, table.recipientUserId, table.reminderWindow), index("grant_reminder_delivery_recipient_idx").on(table.recipientUserId, table.deliveredAt)],
);

export const eventFollows = mysqlTable(
  "eventFollows",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    attendeeId: int("attendeeId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("follows_event_attendee_unique_idx").on(table.eventId, table.attendeeId),
  ],
);

export const promotions = mysqlTable(
  "promotions",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 140 }).notNull(),
    channel: mysqlEnum("channel", ["social", "email", "partner", "featured"])
      .default("social")
      .notNull(),
    status: mysqlEnum("status", ["draft", "scheduled", "active", "completed"])
      .default("draft")
      .notNull(),
    budgetPaise: int("budgetPaise").default(0).notNull(),
    scheduledAt: timestamp("scheduledAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("promotions_event_idx").on(table.eventId)],
);

export const adminAuditLogs = mysqlTable(
  "adminAuditLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    adminId: int("adminId").notNull().references(() => users.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 80 }).notNull(),
    entityType: varchar("entityType", { length: 48 }).notNull(),
    entityId: int("entityId").notNull(),
    beforeState: json("beforeState").$type<Record<string, unknown> | null>(),
    afterState: json("afterState").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("admin_audit_admin_idx").on(table.adminId), index("admin_audit_entity_idx").on(table.entityType, table.entityId)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Event = typeof events.$inferSelect;
