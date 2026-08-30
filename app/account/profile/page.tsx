import { redirect } from "next/navigation";
import AccountProfileWorkspace from "../../components/AccountProfileWorkspace";
import { ACCOUNT_PROFILE_ROUTE_MIGRATION_ENABLED } from "../../lib/admin";

export default function CanonicalAccountProfilePage({ searchParams }: { searchParams: Promise<{ updated?: string; error?: string }> }) {
  if (!ACCOUNT_PROFILE_ROUTE_MIGRATION_ENABLED) redirect("/dashboard/profile");
  return <AccountProfileWorkspace searchParams={searchParams} />;
}
