"use client";

import Link from "next/link";
import { Globe, RotateCcw, Search, Sparkles } from "lucide-react";

interface WorldwideEmptyStateProps {
  search?: string;
  city?: string;
  category?: string;
  date?: string;
  provider?: string;
}

const EXPLORE_CATEGORIES = [
  { label: "🎵 Music", query: "music" },
  { label: "💡 Tech", query: "tech" },
  { label: "🍕 Food", query: "food" },
  { label: "🧘 Wellness", query: "wellness" },
  { label: "🏃 Fitness", query: "fitness" },
  { label: "🎨 Arts", query: "arts" },
];

export default function WorldwideEmptyState({ search, city, category, date, provider }: WorldwideEmptyStateProps) {
  const hasFilters = Boolean(search || city || category || date || provider);

  return (
    <div className="worldwide-empty-state" role="status" aria-live="polite">
      <div className="events-empty-icon-wrap">
        <Globe size={36} className="events-empty-compass" aria-hidden="true" />
      </div>
      <div className="events-empty-content">
        <h3>
          {hasFilters
            ? "No worldwide events match these filters"
            : "No worldwide events available right now"}
        </h3>
        <p>
          {hasFilters ? (
            <>
              We couldn&rsquo;t find events
              {search ? <> matching &ldquo;<strong>{search}</strong>&rdquo;</> : null}
              {city ? <> in <strong>{city}</strong></> : null}
              {category ? <> under <strong>{category}</strong></> : null}
              {date ? <> for <strong>{date}</strong></> : null}
              . Try broadening your search or reset the filters.
            </>
          ) : (
            "Add an API key in your environment to discover events from providers like Eventbrite, Fever, and Ticketmaster."
          )}
        </p>
        <div className="events-empty-actions">
          {hasFilters && (
            <Link href="/worldwide-events" className="btn btn-coral empty-action-btn">
              <RotateCcw size={15} aria-hidden="true" />
              <span>Reset all filters</span>
            </Link>
          )}
        </div>
        <div className="events-empty-suggestions">
          <span className="suggestions-label">
            <Sparkles size={13} aria-hidden="true" />
            <span>Explore categories:</span>
          </span>
          <div className="suggestions-pills">
            {EXPLORE_CATEGORIES.map((c) => (
              <Link key={c.query} href={`/worldwide-events?category=${encodeURIComponent(c.query)}`} className="suggestion-city-chip">
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}