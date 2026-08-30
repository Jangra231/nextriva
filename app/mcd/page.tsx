import { redirect } from "next/navigation";
import LocalAuthorityWorkspace from "../components/LocalAuthorityWorkspace";
import { LOCAL_AUTHORITY_TERMINOLOGY_ENABLED } from "../lib/admin";

export default async function LegacyMcdPage({ searchParams }: { searchParams: Promise<{ view?: string; error?: string; updated?: string }> }) {
  if (!LOCAL_AUTHORITY_TERMINOLOGY_ENABLED) return <LocalAuthorityWorkspace searchParams={searchParams} />;
  const query = await searchParams;
  const params = new URLSearchParams(); if (query.view) params.set("view", query.view); if (query.error) params.set("error", query.error); if (query.updated) params.set("updated", query.updated);
  redirect(`/local-authority${params.size ? `?${params.toString()}` : ""}`);
}
