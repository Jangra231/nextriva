import { redirect } from "next/navigation";

export default async function McdLogin({ searchParams }: { searchParams: Promise<{ error?: string; returnTo?: string }> }) {
  const { error, returnTo } = await searchParams;
  const destination = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo.replace(/^\/mcd/, "/local-authority") : "/local-authority";
  const query = new URLSearchParams(); if (error) query.set("error", error); if (destination) query.set("returnTo", destination);
  redirect(`/local-authority/login?${query.toString()}`);
}
