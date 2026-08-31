import { redirect } from "next/navigation";

export default async function LoginOtpRedirect({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  const qs = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
  redirect(`/login${qs}`);
}