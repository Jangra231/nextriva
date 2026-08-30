import LocalAuthorityWorkspace from "../components/LocalAuthorityWorkspace";
import { LOCAL_AUTHORITY_TERMINOLOGY_ENABLED } from "../lib/admin";
import { redirect } from "next/navigation";

export default function LocalAuthorityPage({ searchParams }: { searchParams: Promise<{ view?: string; error?: string; updated?: string }> }) {
  if (!LOCAL_AUTHORITY_TERMINOLOGY_ENABLED) redirect("/mcd");
  return <LocalAuthorityWorkspace searchParams={searchParams} />;
}
