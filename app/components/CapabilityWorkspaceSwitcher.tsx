import { Blocks, ChevronRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ActiveCapabilityWorkspace } from "../lib/db";
import styles from "./CapabilityWorkspaceSwitcher.module.css";

export default function CapabilityWorkspaceSwitcher({ workspaces, activeGrantId }: { workspaces: ActiveCapabilityWorkspace[]; activeGrantId?: number }) {
  if (!workspaces.length) return null;
  return <section className={styles.root} aria-label="Approved capability workspaces"><span className={styles.heading}><Blocks size={13} aria-hidden="true" /> Approved workspaces</span><div className={styles.list}>{workspaces.map(workspace => <Link key={workspace.grant.id} href={`/dashboard/workspaces/${workspace.capability.code}?grant=${workspace.grant.id}`} className={`${styles.item} ${activeGrantId === workspace.grant.id ? styles.active : ""}`} aria-current={activeGrantId === workspace.grant.id ? "page" : undefined}><span><ShieldCheck size={13} aria-hidden="true" /> {workspace.capability.displayName}</span><small>{workspace.functions.length} selected function{workspace.functions.length === 1 ? "" : "s"} · valid until {new Date(workspace.grant.endsAt).toLocaleDateString("en-IN")}</small><ChevronRight size={14} aria-hidden="true" /></Link>)}</div></section>;
}
