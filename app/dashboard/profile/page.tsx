import { redirect } from "next/navigation";
import AccountProfileWorkspace from "../../components/AccountProfileWorkspace";
import { ACCOUNT_PROFILE_ROUTE_MIGRATION_ENABLED } from "../../lib/admin";

export const dynamic = "force-dynamic";

export default function LegacyAccountProfilePage({ searchParams }: { searchParams: Promise<{ updated?: string; error?: string }> }) {
  if (ACCOUNT_PROFILE_ROUTE_MIGRATION_ENABLED) redirect("/account/profile");
  return <AccountProfileWorkspace searchParams={searchParams} />;
}
