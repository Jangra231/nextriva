import { ArrowLeft, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardShell from "../../../../../components/DashboardShell";
import { currentUser } from "../../../../../lib/auth";
import { getCsrCapabilityAssignedParticipants } from "../../../../../lib/db";

export default async function CsrAssignedParticipantsPage({ params, searchParams }: { params: Promise<{ assignmentPublicId: string }>; searchParams: Promise<{ grant?: string }> }) {
  const user = await currentUser(); if (!user) return null; const { assignmentPublicId } = await params; const { grant } = await searchParams; const grantId = Number(grant);
  if (!Number.isInteger(grantId) || grantId < 1) redirect("/dashboard/workspaces");
  let data; try { data = await getCsrCapabilityAssignedParticipants(user.id, grantId, assignmentPublicId); } catch { redirect(`/dashboard/workspaces/CSR_SPONSORSHIP?grant=${grantId}`); }
  if (!data?.assignment) redirect(`/dashboard/workspaces/CSR_SPONSORSHIP?grant=${grantId}`);
  return <DashboardShell active="Workspaces" mode="participant" activeWorkspaceGrantId={grantId}><div className="dash-page-head"><div><span className="eyebrow"><ShieldCheck size={13} /> Approved assigned-event fields</span><h1 className="page-title">Assigned-event participants</h1><p>Only fields explicitly approved on this administrator assignment are queried. Profile, address, identity, health, and unrelated event data are never included.</p></div><Link className="btn btn-outline" href={`/dashboard/workspaces/CSR_SPONSORSHIP?grant=${grantId}`}><ArrowLeft size={15} /> CSR workspace</Link></div><section className="panel"><div className="section-head"><div><h2><UsersRound size={18} /> Approved participant data</h2><p>Assignment {data.assignment.publicId}</p></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Registration</th><th>Attendance</th><th>Participation date</th></tr></thead><tbody>{data.participants.length ? data.participants.map((row, index) => <tr key={index}><td>{row.name || "Not approved"}</td><td>{row.email || "Not approved"}</td><td>{row.registrationStatus || "Not approved"}</td><td>{row.attendanceStatus || "Not approved"}</td><td>{row.participationDate ? new Date(row.participationDate).toLocaleDateString("en-IN") : "Not approved"}</td></tr>) : <tr><td colSpan={5}>No assigned-event participant records are available, or this assignment points to a future-event concept.</td></tr>}</tbody></table></div></section></DashboardShell>;
}
