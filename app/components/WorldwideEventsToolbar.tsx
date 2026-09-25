"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Globe,
  RotateCcw,
  Search,
  MapPin,
  CalendarDays,
  Tag,
  X,
} from "lucide-react";

interface Props {
  currentSearch?: string;
  currentCity?: string;
  currentCountry?: string;
  currentCategory?: string;
  currentDate?: string;
  currentSort?: string;
  totalEvents: number;
}

const DATE_FILTERS = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
];

const SORT_OPTIONS = [
  { id: "popularity", label: "Most Popular" },
  { id: "date", label: "Soonest Date" },
  { id: "relevance", label: "Relevance" },
];

const CATEGORIES = [
  { id: "business", label: "Business" },
  { id: "energy", label: "Green Energy" },
  { id: "automobile", label: "Automobile" },
  { id: "sports", label: "Sports" },
  { id: "education", label: "Education" },
  { id: "health", label: "Health & Wellness" },
  { id: "music", label: "Music" },
  { id: "community", label: "Community" },
];

export default function WorldwideEventsToolbar({
  currentSearch,
  currentCity,
  currentCountry,
  currentCategory,
  currentDate,
  currentSort,
  totalEvents,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `/worldwide-events?${query}` : "/worldwide-events", {
        scroll: false,
      });
    });
  };

  const removeFilter = (key: string) => updateParam(key, null);
  const clearAllFilters = () => {
    startTransition(() => router.push("/worldwide-events", { scroll: false }));
  };

  const hasActiveFilters = Boolean(
    currentSearch ||
      currentCity ||
      currentCountry ||
      currentCategory ||
      currentDate ||
      (currentSort && currentSort !== "popularity")
  );

  return (
    <div className="worldwide-toolbar">
      <div className="worldwide-toolbar-row">
        <div className="worldwide-search-group">
          <span className="worldwide-toolbar-label">Search the collection</span>
          <form
            onSubmit={e => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              updateParam("search", (fd.get("search") as string) || null);
            }}
            className="worldwide-search-form"
          >
            <Search
              size={18}
              aria-hidden="true"
              className="worldwide-search-icon"
            />
            <label htmlFor="worldwide-event-search" className="sr-only">
              Search worldwide events
            </label>
            <input
              id="worldwide-event-search"
              name="search"
              defaultValue={currentSearch || ""}
              placeholder="Search by event, city, or venue"
              className="worldwide-search-input"
            />
            <button
              type="submit"
              className="worldwide-search-btn"
              aria-label="Search events"
            >
              <Search size={17} aria-hidden="true" />
              <span>Search</span>
            </button>
          </form>
        </div>

        <div className="worldwide-filter-group">
          <label className="worldwide-control-label">
            <span>Category</span>
            <select
              value={currentCategory || ""}
              onChange={e => updateParam("category", e.target.value || null)}
              className="worldwide-dropdown-select"
            >
              <option value="">All categories</option>
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="worldwide-date-fieldset">
            <legend>When</legend>
            <div className="worldwide-date-presets">
              {DATE_FILTERS.map(d => (
                <button
                  key={d.id}
                  type="button"
                  className={`worldwide-date-pill ${currentDate === d.id ? "active" : ""}`}
                  onClick={() =>
                    updateParam("date", currentDate === d.id ? null : d.id)
                  }
                  aria-pressed={currentDate === d.id}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="worldwide-control-label">
            <span>Sort by</span>
            <select
              value={currentSort || "popularity"}
              onChange={e =>
                updateParam(
                  "sort",
                  e.target.value === "popularity" ? null : e.target.value
                )
              }
              className="worldwide-dropdown-select"
            >
              {SORT_OPTIONS.map(s => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="worldwide-active-filters" aria-label="Active filters">
          <span className="worldwide-active-label">Active filters</span>
          {currentSearch && (
            <span className="active-tag-chip">
              <Search size={12} aria-hidden="true" />
              <span>&ldquo;{currentSearch}&rdquo;</span>
              <button
                type="button"
                onClick={() => removeFilter("search")}
                aria-label="Remove search"
              >
                <X size={13} />
              </button>
            </span>
          )}
          {currentCity && (
            <span className="active-tag-chip">
              <MapPin size={12} aria-hidden="true" />
              <span>{currentCity}</span>
              <button
                type="button"
                onClick={() => removeFilter("city")}
                aria-label="Remove city"
              >
                <X size={13} />
              </button>
            </span>
          )}
          {currentCategory && (
            <span className="active-tag-chip">
              <Tag size={12} aria-hidden="true" />
              <span>
                {CATEGORIES.find(c => c.id === currentCategory)?.label ||
                  currentCategory}
              </span>
              <button
                type="button"
                onClick={() => removeFilter("category")}
                aria-label="Remove category"
              >
                <X size={13} />
              </button>
            </span>
          )}
          {currentDate && (
            <span className="active-tag-chip">
              <CalendarDays size={12} aria-hidden="true" />
              <span>
                {DATE_FILTERS.find(d => d.id === currentDate)?.label ||
                  currentDate}
              </span>
              <button
                type="button"
                onClick={() => removeFilter("date")}
                aria-label="Remove date filter"
              >
                <X size={13} />
              </button>
            </span>
          )}
          <button
            type="button"
            className="clear-all-filters-btn"
            onClick={clearAllFilters}
            aria-label="Clear all filters"
          >
            <RotateCcw size={13} aria-hidden="true" />
            <span>Clear all</span>
          </button>
        </div>
      )}

      <div className="worldwide-results-count" aria-live="polite">
        <Globe size={14} aria-hidden="true" />
        <span>
          <strong>{totalEvents}</strong> event{totalEvents === 1 ? "" : "s"}{" "}
          found
        </span>
      </div>
    </div>
  );
}
