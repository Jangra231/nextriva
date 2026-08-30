import Link from "next/link";
import { Heart } from "lucide-react";
import { toggleFavoriteAction } from "../actions";

export default function EventFavoriteButton({ eventId, slug, isSignedIn, isFavorite }: { eventId: number; slug: string; isSignedIn: boolean; isFavorite: boolean }) {
  if (!isSignedIn) return <Link href={`/login?returnTo=${encodeURIComponent(`/events/${slug}`)}`} className="favorite-button" aria-label="Sign in to save this event to favorites"><Heart size={16} /> Save to Favorites</Link>;
  return <form action={toggleFavoriteAction}><input type="hidden" name="eventId" value={eventId} /><input type="hidden" name="slug" value={slug} /><button className={`favorite-button ${isFavorite ? "saved" : ""}`} type="submit" aria-pressed={isFavorite}><Heart size={16} fill={isFavorite ? "currentColor" : "none"} />{isFavorite ? "Saved to Favorites" : "Save to Favorites"}</button></form>;
}
