import { Blocks, Settings2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardShell from "../../components/DashboardShell";
import { currentUser } from "../../lib/auth";
import { isCapabilityWorkspaceSwitcherEnabled } from "../../lib/capability-feature";
import { getActiveCapabilityWorkspaces } from "../../lib/db";

export default async function CapabilityWorkspacesPage() {
  const user = await currentUser(); if (!user) return null;
  if (!isCapabilityWorkspaceSwitcherEnabled()) redirect("/dashboard/my-bookings");
  const workspaces = await getActiveCapabilityWorkspaces(user.id);
	return <DashboardShell active="Workspaces" mode="participant"><div className="dash-page-head"><div><span className="eyebrow"><Blocks size={13} /> Approved capability workspaces</span><h1 className="page-title">Choose an active workspace</h1><p>Only current, selected-function capability grants are shown. A suspended, expired, future-dated, or out-of-scope grant does not create a workspace.</p></div><Link className="btn btn-outline" href="/dashboard/workspaces/preferences"><Settings2 size={15} /> Default on login</Link></div>{workspaces.length ? <section className="capability-catalog-grid">{workspaces.map(workspace => <article className="panel capability-card" key={workspace.grant.id}><div className="section-head"><div><span className="status-pill live">Active approved workspace</span><h2>{workspace.capability.displayName}</h2><p>{workspace.capability.description}</p></div><ShieldCheck size={22} aria-hidden="true" /></div><p className="capability-audience">{workspace.functions.length} selected function{workspace.functions.length === 1 ? "" : "s"} · {workspace.grant.scopeType} scope</p><div className="capability-function-list">{workspace.functions.map(fn => <div key={fn.id}><b>{fn.displayName}</b><small>{fn.description}</small></div>)}</div><Link className="btn btn-coral" href={`/dashboard/workspaces/${workspace.capability.code}?grant=${workspace.grant.id}`}>Open workspace</Link></article>)}</section> : <section className="panel"><h2>No active approved workspaces</h2><p>Your capability applications and grant history remain available, but no current selected-function grant qualifies for a workspace.</p><Link className="btn btn-outline" href="/dashboard/capabilities">Review capability applications</Link></section>}</DashboardShell>;
}
