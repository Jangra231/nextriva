"use client";

import Link from "next/link";
import { Compass, PlusCircle, RotateCcw, Sparkles } from "lucide-react";

interface EventsEmptyStateProps {
  search?: string;
  city?: string;
  category?: string;
  filter?: string;
  accessible?: string;
}

const POPULAR_EXPLORE_CITIES = ["Delhi", "Mumbai", "Bengaluru", "Pune", "Goa", "Hyderabad"];

export default function EventsEmptyState({ search, city, category, filter, accessible }: EventsEmptyStateProps) {
  const hasFilters = Boolean(search || city || category || filter || accessible === "1");

  return (
    <div className="events-empty-state-card" role="status" aria-live="polite">
      <div className="events-empty-icon-wrap">
        <Compass size={36} className="events-empty-compass" aria-hidden="true" />
      </div>

      <div className="events-empty-content">
        <h3>
          {hasFilters ? "No live events match these filters" : "No live events found at the moment"}
        </h3>
        <p>
          {hasFilters ? (
            <>
              We couldn&rsquo;t find active events
              {search ? <> matching &ldquo;<strong>{search}</strong>&rdquo;</> : null}
              {city ? <> in <strong>{city}</strong></> : null}
              {category ? <> under <strong>{category}</strong></> : null}
              {filter ? <> for <strong>{filter}</strong></> : null}
              . Try broadening your criteria or reset your filters.
            </>
          ) : (
            "Be the first to list an exciting sports tournament, workshop, run, or meetup in your city."
          )}
        </p>

        <div className="events-empty-actions">
          {hasFilters && (
            <Link href="/events" className="btn btn-coral empty-action-btn">
              <RotateCcw size={15} aria-hidden="true" />
              <span>Reset all filters</span>
            </Link>
          )}

          <Link href="/dashboard/manage-events/create-event/new" className="btn btn-outline empty-action-btn">
            <PlusCircle size={15} aria-hidden="true" />
            <span>Host an event</span>
          </Link>
        </div>

        <div className="events-empty-suggestions">
          <span className="suggestions-label">
            <Sparkles size={13} aria-hidden="true" />
            <span>Explore top cities:</span>
          </span>
          <div className="suggestions-pills">
            {POPULAR_EXPLORE_CITIES.map((c) => (
              <Link key={c} href={`/events?city=${encodeURIComponent(c)}`} className="suggestion-city-chip">
                {c}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
