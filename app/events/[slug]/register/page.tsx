import { notFound, redirect } from "next/navigation";
import { currentUser } from "../../../lib/auth";
import { getActiveRegistrationForEvent, getPublicEvent } from "../../../lib/db";

export const dynamic = "force-dynamic";

export default async function EventRegistrationLanding({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicEvent(slug);
  if (!data) notFound();
  const returnTo = `/events/${slug}/register`;
  const user = await currentUser();
  if (!user) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  const existing = await getActiveRegistrationForEvent(data.event.id, user.id);
  if (existing) redirect(`/events/${slug}?qr=registered&booking=${existing.orderNumber}`);
  redirect(`/events/${slug}?qr=register`);
}
