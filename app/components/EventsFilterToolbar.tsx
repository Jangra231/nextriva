"use client";

import { useTransition, useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Accessibility,
  Filter,
  MapPin,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Clock,
  X,
  Check,
  ChevronDown,
} from "lucide-react";

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface EventsFilterToolbarProps {
  categories: Category[];
  totalEvents: number;
  currentCategory?: string;
  currentFilter?: string;
  currentCity?: string;
  currentState?: string;
  currentSearch?: string;
  currentSort?: string;
  currentAccessible?: string;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  music: "🎵",
  running: "🏃",
  fitness: "🏃",
  food: "🍕",
  learning: "💼",
  wellness: "🧘",
  community: "🤝",
  arts: "🎨",
  tech: "⚡",
  sports: "⚽",
};

const QUICK_DATE_FILTERS = [
  { id: "This Weekend", label: "This Weekend" },
  { id: "This Week", label: "This Week" },
  { id: "Today", label: "Today" },
  { id: "Tomorrow", label: "Tomorrow" },
  { id: "This Month", label: "This Month" },
  { id: "Free", label: "Free Events", isSpecial: true },
  { id: "Paid", label: "Paid Events" },
];

const SORT_OPTIONS = [
  { id: "soonest", label: "Soonest Date" },
  { id: "popular", label: "Most Popular" },
  { id: "recent", label: "Recently Added" },
  { id: "latest", label: "Latest Date" },
];

function getCategoryEmoji(slug: string): string {
  const norm = slug.toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
    if (norm.includes(key)) return emoji;
  }
  return "🏷️";
}

export default function EventsFilterToolbar({
  categories,
  totalEvents,
  currentCategory,
  currentFilter,
  currentCity,
  currentState,
  currentSearch,
  currentSort = "soonest",
  currentAccessible,
}: EventsFilterToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const categoryRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const closeDropdowns = useCallback(() => {
    setCategoryOpen(false);
    setSortOpen(false);
  }, []);

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all" || (key === "sort" && value === "soonest")) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `/events?${query}` : "/events", { scroll: false });
    });
  };

  const removeFilter = (key: string) => updateParam(key, null);
  const clearAllFilters = () => {
    startTransition(() => {
      router.push("/events", { scroll: false });
    });
  };

  const hasActiveFilters = Boolean(
    currentCategory ||
      currentFilter ||
      currentCity ||
      currentState ||
      currentSearch ||
      currentAccessible === "1" ||
      (currentSort && currentSort !== "soonest")
  );

  const selectedCategory = categories.find((c) => c.slug === currentCategory);

  const [prevTotal, setPrevTotal] = useState(totalEvents);
  const [countBounce, setCountBounce] = useState(false);

  useEffect(() => {
    if (totalEvents !== prevTotal) {
      setCountBounce(true);
      setPrevTotal(totalEvents);
      const t = setTimeout(() => setCountBounce(false), 420);
      return () => clearTimeout(t);
    }
  }, [totalEvents, prevTotal]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDropdowns();
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [closeDropdowns]);

  return (
    <div
      className={`events-discovery-toolbar${isPending ? " is-loading" : ""}`}
      role="region"
      aria-label="Events discovery controls"
    >
      <div className="events-toolbar-single-line">
        {/* Category Dropdown */}
        <div className="category-dropdown-wrapper" ref={categoryRef}>
          <button
            type="button"
            className={`category-pill-trigger${categoryOpen ? " open" : ""}${currentCategory ? " has-value" : ""}`}
            onClick={() => { setCategoryOpen(!categoryOpen); setSortOpen(false); }}
            aria-haspopup="listbox"
            aria-expanded={categoryOpen}
            aria-label="Filter by category"
          >
            <Tag size={13} className="category-pill-icon" aria-hidden="true" />
            <span className="category-pill-label">
              {selectedCategory ? `${getCategoryEmoji(selectedCategory.slug)} ${selectedCategory.name}` : "All Categories"}
            </span>
            <ChevronDown size={13} className={`category-pill-chev${categoryOpen ? " rotated" : ""}`} aria-hidden="true" />
          </button>
          {categoryOpen && (
            <div className="events-dropdown-menu" role="listbox" aria-label="Categories">
              <button
                type="button"
                className={`events-dropdown-item${!currentCategory ? " active" : ""}`}
                role="option"
                aria-selected={!currentCategory}
                onClick={() => { updateParam("category", null); setCategoryOpen(false); }}
              >
                <span>🏷️</span><span>All Categories</span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`events-dropdown-item${currentCategory === cat.slug ? " active" : ""}`}
                  role="option"
                  aria-selected={currentCategory === cat.slug}
                  onClick={() => { updateParam("category", cat.slug); setCategoryOpen(false); }}
                >
                  <span>{getCategoryEmoji(cat.slug)}</span><span>{cat.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date Presets */}
        <div className="events-date-presets" role="group" aria-label="Date and Price Filters">
          {QUICK_DATE_FILTERS.map((df) => {
            const isActive = currentFilter === df.id;
            return (
              <button
                key={df.id}
                type="button"
                className={`date-preset-pill${isActive ? " active" : ""}${df.isSpecial ? " special" : ""}`}
                onClick={() => updateParam("filter", isActive ? null : df.id)}
                aria-pressed={isActive}
              >
                {df.isSpecial && <Sparkles size={13} className="sparkle-icon" aria-hidden="true" />}
                <span>{df.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sort & Accessible */}
        <div className="events-action-group">
          <div className="events-sort-wrapper" ref={sortRef}>
            <button
              type="button"
              className={`sort-pill-trigger${sortOpen ? " open" : ""}${currentSort && currentSort !== "soonest" ? " has-value" : ""}`}
              onClick={() => { setSortOpen(!sortOpen); setCategoryOpen(false); }}
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
              aria-label="Sort events"
            >
              <SlidersHorizontal size={13} className="sort-pill-icon" aria-hidden="true" />
              <span className="sort-pill-label">
                {SORT_OPTIONS.find((s) => s.id === (currentSort || "soonest"))?.label || "Soonest Date"}
              </span>
              <ChevronDown size={13} className={`sort-pill-chev${sortOpen ? " rotated" : ""}`} aria-hidden="true" />
            </button>
            {sortOpen && (
              <div className="events-dropdown-menu events-dropdown-menu--light" role="listbox" aria-label="Sort order">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`events-dropdown-item${(currentSort || "soonest") === opt.id ? " active" : ""}`}
                    role="option"
                    aria-selected={(currentSort || "soonest") === opt.id}
                    onClick={() => { updateParam("sort", opt.id); setSortOpen(false); }}
                  >
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            className={`accessible-toggle-btn ${currentAccessible === "1" ? "active" : ""}`}
            onClick={() => updateParam("accessible", currentAccessible === "1" ? null : "1")}
            aria-pressed={currentAccessible === "1"}
            title="Filter accessible venues"
          >
            <Accessibility size={14} className="accessibility-icon" aria-hidden="true" />
            <span>Accessible</span>
            {currentAccessible === "1" && <Check size={12} className="accessible-check-icon" aria-hidden="true" />}
          </button>
        </div>

        {/* Count Badge */}
        <div className={`events-count-badge${countBounce ? " count-bounce" : ""}`}>
          <span className={`count-live-dot${isPending ? " is-updating" : ""}`} />
          <span className="count-text">
            <strong>{totalEvents}</strong> {totalEvents === 1 ? "live event" : "live events"}
          </span>
          {isPending && <span className="events-filter-loading">Updating…</span>}
        </div>
      </div>
      {hasActiveFilters && (
        <div className="events-active-filters-bar" aria-label="Active filters">
          <div className="active-filters-label">
            <Filter size={12} aria-hidden="true" />
            <span>Applied:</span>
          </div>
          <div className="active-filters-list">
            {currentSearch && (
              <span className="active-tag-chip" data-stagger={0}>
                <span>&ldquo;{currentSearch}&rdquo;</span>
                <button type="button" onClick={() => removeFilter("search")} aria-label="Remove search">
                  <X size={12} />
                </button>
              </span>
            )}
            {currentCity && (
              <span className="active-tag-chip" data-stagger={1}>
                <MapPin size={11} aria-hidden="true" />
                <span>{currentCity}</span>
                <button type="button" onClick={() => removeFilter("city")} aria-label="Remove city">
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedCategory && (
              <span className="active-tag-chip" data-stagger={2}>
                <Tag size={11} aria-hidden="true" />
                <span>{selectedCategory.name}</span>
                <button type="button" onClick={() => removeFilter("category")} aria-label="Remove category">
                  <X size={12} />
                </button>
              </span>
            )}
            {currentFilter && (
              <span className="active-tag-chip" data-stagger={3}>
                <Clock size={11} aria-hidden="true" />
                <span>{currentFilter}</span>
                <button type="button" onClick={() => removeFilter("filter")} aria-label="Remove filter">
                  <X size={12} />
                </button>
              </span>
            )}
            {currentAccessible === "1" && (
              <span className="active-tag-chip" data-stagger={4}>
                <Accessibility size={11} aria-hidden="true" />
                <span>Accessible</span>
                <button type="button" onClick={() => removeFilter("accessible")} aria-label="Remove accessible">
                  <X size={12} />
                </button>
              </span>
            )}
            {currentSort && currentSort !== "soonest" && (
              <span className="active-tag-chip" data-stagger={5}>
                <SlidersHorizontal size={11} aria-hidden="true" />
                <span>{SORT_OPTIONS.find((s) => s.id === currentSort)?.label}</span>
                <button type="button" onClick={() => removeFilter("sort")} aria-label="Reset sort">
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
          <button
            type="button"
            className="clear-all-filters-btn"
            onClick={clearAllFilters}
            aria-label="Clear all applied filters"
          >
            <RotateCcw size={12} className="rotate-reset-icon" aria-hidden="true" />
            <span>Clear all</span>
          </button>
        </div>
      )}
    </div>
  );
}
