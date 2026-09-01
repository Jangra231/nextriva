import { ArrowLeft, CalendarClock, MapPinned, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardShell from "../../../components/DashboardShell";
import AuthorityCapabilityWorkspace from "../../../components/AuthorityCapabilityWorkspace";
import CsrCapabilityWorkspace from "../../../components/CsrCapabilityWorkspace";
import { currentUser } from "../../../lib/auth";
import { isAuthorityCapabilityWorkspaceEnabled, isCapabilityWorkspaceSwitcherEnabled, isStage10AuthorityAnalyticsEnabled } from "../../../lib/capability-feature";
import { getActiveCapabilityWorkspaceContext, getAuthorityCapabilityWorkspaceData, getAuthorityHealthAnalytics, getCapabilityWorkspaceActivitySummary, getCsrCapabilityWorkspaceData, type ActiveCapabilityWorkspace } from "../../../lib/db";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const readable = (value: string) => value.replaceAll("_", " ");
const territory = (workspace: ActiveCapabilityWorkspace) => [workspace.grant.scopeState, workspace.grant.scopeDistrict, workspace.grant.scopeCity, workspace.grant.scopeZone, workspace.grant.scopeWard].filter(Boolean).join(" · ") || "National / all supported territory";
const formatUTCDate = (value: Date | string) => {
  const d = new Date(value);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const formatUTCDateTime = (value: Date | string) => {
  const d = new Date(value);
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${ampm}`;
};

export default async function CapabilityWorkspacePage({ params, searchParams }: { params: Promise<{ capabilityCode: string }>; searchParams: Promise<{ grant?: string }> }) {
  const user = await currentUser(); if (!user) return null;
  if (!isCapabilityWorkspaceSwitcherEnabled()) redirect("/dashboard/my-bookings");
	const { capabilityCode } = await params; const { grant } = await searchParams; const grantId = Number(grant); if ((capabilityCode === "LOCAL_AUTHORITY" || capabilityCode === "DISTRICT_LEVEL" || capabilityCode === "STATE_LEVEL") && !isAuthorityCapabilityWorkspaceEnabled()) redirect("/dashboard/workspaces");
  const context = await getActiveCapabilityWorkspaceContext(user.id, capabilityCode, grantId); if (!context) redirect("/dashboard/workspaces");
		const isAuthority = capabilityCode === "LOCAL_AUTHORITY" || capabilityCode === "DISTRICT_LEVEL" || capabilityCode === "STATE_LEVEL"; const { workspace } = context; const healthFunction = capabilityCode === "LOCAL_AUTHORITY" ? "LA_HEALTH_AGGREGATE_VIEW" : capabilityCode === "DISTRICT_LEVEL" ? "DISTRICT_HEALTH_AGGREGATE_VIEW" : capabilityCode === "STATE_LEVEL" ? "STATE_HEALTH_AGGREGATE_VIEW" : undefined; const canViewHealthAnalytics = Boolean(isAuthority && isStage10AuthorityAnalyticsEnabled() && healthFunction && workspace.functions.some(item => item.code === healthFunction)); const [summary, csrData, authorityData, healthAnalytics] = await Promise.all([getCapabilityWorkspaceActivitySummary(user.id, capabilityCode, grantId), capabilityCode === "CSR_SPONSORSHIP" ? getCsrCapabilityWorkspaceData(user.id, grantId) : Promise.resolve(undefined), isAuthority ? getAuthorityCapabilityWorkspaceData(user.id, capabilityCode as "LOCAL_AUTHORITY" | "DISTRICT_LEVEL" | "STATE_LEVEL", grantId) : Promise.resolve(undefined), canViewHealthAnalytics ? getAuthorityHealthAnalytics(user.id, capabilityCode as "LOCAL_AUTHORITY" | "DISTRICT_LEVEL" | "STATE_LEVEL", grantId) : Promise.resolve(undefined)]);
		return <DashboardShell active="Workspaces" mode="participant"><div className="dash-page-head"><div><span className="eyebrow"><ShieldCheck size={13} /> Active capability workspace</span><h1 className="page-title">{workspace.capability.displayName}</h1><p>This workspace is bound to the selected functions, territory, and validity window below. It does not replace retained role-based workspaces or expose another capability’s data.</p></div><Link className="btn btn-outline" href="/dashboard/workspaces"><ArrowLeft size={15} /> All workspaces</Link></div><section className="panel"><div className="section-head"><div><h2>Approved operating context</h2><p>Server validation rechecks this grant on every direct workspace request.</p></div><ShieldCheck size={22} aria-hidden="true" /></div><div className="form-grid"><div className="summary-box"><b>Selected functions</b><p>{workspace.functions.map(fn => fn.displayName).join(" · ")}</p></div><div className="summary-box"><b><MapPinned size={14} /> Territory</b><p>{readable(workspace.grant.scopeType)} · {territory(workspace)}</p></div><div className="summary-box"><b><CalendarClock size={14} /> Validity</b><p>{formatUTCDate(workspace.grant.startsAt)} to {formatUTCDate(workspace.grant.endsAt)}</p></div></div></section><section className="panel"><div className="section-head"><div><h2>Recent workspace activity</h2><p>Read-only evidence for this exact grant only. Activity from another workspace is never carried over.</p></div></div>{summary?.activity.length ? <div className="overview-queue">{summary.activity.map(item => <div key={item.id}><span><b>{readable(item.action)}</b><small>Grant #{workspace.grant.id}</small></span><small>{formatUTCDateTime(item.createdAt)}</small></div>)}</div> : <p className="empty-inline">No recorded capability activity exists for this workspace yet.</p>}</section>{csrData ? <CsrCapabilityWorkspace data={csrData} /> : authorityData ? <AuthorityCapabilityWorkspace data={authorityData} healthAnalytics={healthAnalytics} /> : <section className="panel"><h2>Selected-function workspace boundary</h2><p>This page exposes only the approved capability context and its own audit summary. Operational actions appear only after their capability stage adds server-side scope, data-isolation, audit, and regression controls.</p><div className="capability-function-list">{workspace.functions.map(fn => <div key={fn.id}><b>{fn.displayName}</b><small>{fn.description}</small></div>)}</div></section>}</DashboardShell>;
}
