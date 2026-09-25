"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Briefcase,
  Zap,
  Car,
  Trophy,
  BookOpen,
  Heart,
  Sparkles,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  SlidersHorizontal,
  Flame,
  Users,
} from "lucide-react";

interface CategoryConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  subcategories: { id: string; label: string }[];
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: "business",
    label: "Business",
    icon: Briefcase,
    subcategories: [
      { id: "conference", label: "Conferences" },
      { id: "networking", label: "Networking" },
      { id: "workshop", label: "Workshops" },
      { id: "expo", label: "Expos" },
      { id: "seminar", label: "Seminars" },
    ],
  },
  {
    id: "energy",
    label: "Green Energy",
    icon: Zap,
    subcategories: [
      { id: "solar", label: "Solar" },
      { id: "wind", label: "Wind" },
      { id: "sustainability", label: "Sustainability" },
      { id: "ev", label: "EV & Mobility" },
      { id: "green-tech", label: "Green Tech" },
    ],
  },
  {
    id: "automobile",
    label: "Automobile",
    icon: Car,
    subcategories: [
      { id: "car-show", label: "Car Shows" },
      { id: "race", label: "Racing" },
      { id: "exhibition", label: "Exhibitions" },
      { id: "meetup", label: "Enthusiast Meetups" },
      { id: "tech-auto", label: "Auto Tech" },
    ],
  },
  {
    id: "sports",
    label: "Sports",
    icon: Trophy,
    subcategories: [
      { id: "running", label: "Running" },
      { id: "football", label: "Football" },
      { id: "cricket", label: "Cricket" },
      { id: "fitness", label: "Fitness" },
      { id: "yoga", label: "Yoga" },
    ],
  },
  {
    id: "education",
    label: "Education",
    icon: BookOpen,
    subcategories: [
      { id: "workshop-edu", label: "Workshops" },
      { id: "webinar", label: "Webinars" },
      { id: "course", label: "Courses" },
      { id: "conference-edu", label: "Academic Conferences" },
      { id: "tutoring", label: "Tutoring" },
    ],
  },
  {
    id: "health",
    label: "Health",
    icon: Heart,
    subcategories: [
      { id: "wellness", label: "Wellness" },
      { id: "medical", label: "Medical" },
      { id: "mental-health", label: "Mental Health" },
      { id: "fitness-health", label: "Fitness Classes" },
      { id: "nutrition", label: "Nutrition" },
    ],
  },
  {
    id: "music",
    label: "Music",
    icon: Sparkles,
    subcategories: [
      { id: "concert", label: "Concerts" },
      { id: "festival", label: "Festivals" },
      { id: "dj-night", label: "DJ Nights" },
      { id: "classical", label: "Classical" },
      { id: "indie", label: "Indie" },
    ],
  },
  {
    id: "community",
    label: "Community",
    icon: Users,
    subcategories: [
      { id: "charity", label: "Charity" },
      { id: "meetup", label: "Meetups" },
      { id: "cultural", label: "Cultural" },
      { id: "volunteer", label: "Volunteer" },
      { id: "social", label: "Social" },
    ],
  },
];

const POPULAR_DISCOVERY_TAGS = [
  { mainId: "music", subId: "festival", label: "Festivals", emoji: "🎵" },
  { mainId: "business", subId: "conference", label: "Tech Summits", emoji: "💼" },
  { mainId: "energy", subId: "green-tech", label: "Green Tech", emoji: "⚡" },
  { mainId: "sports", subId: "running", label: "Marathons", emoji: "🏃" },
  { mainId: "automobile", subId: "car-show", label: "Auto Expos", emoji: "🏎️" },
  { mainId: "health", subId: "wellness", label: "Wellness", emoji: "🧘" },
];

function getMainAndSubFromSearch(
  searchParams: ReturnType<typeof useSearchParams>
): { mainCat: string; subCat: string } {
  const c = searchParams.get("category");
  if (!c) return { mainCat: "", subCat: "" };
  if (c.includes(",")) {
    const [m, s] = c.split(",");
    return { mainCat: m, subCat: s || "" };
  }
  const byMain = CATEGORIES.find(cat => cat.id === c);
  if (byMain) return { mainCat: byMain.id, subCat: "" };
  for (const cat of CATEGORIES) {
    const sub = cat.subcategories.find(s => s.id === c);
    if (sub) return { mainCat: cat.id, subCat: sub.id };
  }
  return { mainCat: "", subCat: "" };
}

export default function WorldwideCategoryFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const { mainCat, subCat } = getMainAndSubFromSearch(searchParams);
  const hasFilters = Boolean(mainCat || subCat);

  const checkScroll = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const scrollRail = (direction: "left" | "right") => {
    const el = railRef.current;
    if (!el) return;
    const offset = direction === "left" ? -280 : 280;
    el.scrollBy({ left: offset, behavior: "smooth" });
  };

  const updateCategory = useCallback(
    (newMain: string | null, newSub?: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!newMain || newMain === "all") {
        params.delete("category");
      } else if (newSub) {
        params.set("category", `${newMain},${newSub}`);
      } else {
        params.set("category", newMain);
      }
      const query = params.toString();
      startTransition(() => {
        router.push(
          query ? `/worldwide-events?${query}` : "/worldwide-events",
          { scroll: false }
        );
      });
    },
    [searchParams, router, startTransition]
  );

  const clearAll = useCallback(() => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("category");
      const query = params.toString();
      router.push(
        query ? `/worldwide-events?${query}` : "/worldwide-events",
        { scroll: false }
      );
    });
  }, [searchParams, router, startTransition]);

  const activeMain = mainCat
    ? CATEGORIES.find(c => c.id === mainCat)
    : undefined;

  const activeSubLabel = activeMain && subCat
    ? activeMain.subcategories.find(s => s.id === subCat)?.label
    : undefined;
  return (
    <div className="ww-categories">
      {/* Header bar */}
      <div className="ww-categories-head">
        <div className="ww-categories-head-text">
          <span className="ww-categories-eyebrow">
            <Sparkles size={13} aria-hidden="true" /> Explore by Category
          </span>
          <h2 className="ww-categories-title">
            {activeMain ? (
              <span className="ww-categories-title-active">
                {activeMain.label}
                {activeSubLabel && (
                  <span className="ww-title-sub-tag"> / {activeSubLabel}</span>
                )}
              </span>
            ) : (
              "Discover Experiences Across Industries"
            )}
          </h2>
        </div>

        <div className="ww-categories-head-actions">
          {hasFilters && (
            <button
              type="button"
              className="clear-all-filters-btn ww-categories-clear"
              onClick={clearAll}
              aria-label="Clear category selection"
            >
              <RotateCcw size={12} aria-hidden="true" />
              <span>Reset</span>
            </button>
          )}

          <div className="ww-categories-nav-arrows" aria-hidden="true">
            <button
              type="button"
              className="ww-nav-arrow"
              onClick={() => scrollRail("left")}
              disabled={!canScrollLeft}
              aria-label="Previous categories"
              tabIndex={-1}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="ww-nav-arrow"
              onClick={() => scrollRail("right")}
              disabled={!canScrollRight}
              aria-label="Next categories"
              tabIndex={-1}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Categories Rail & Interactive Subcategories */}
      <div
        className="ww-categories-filter-strip"
        aria-label="Worldwide category and subtype filters"
      >
        <div className="ww-categories-rail-wrapper">
          <div
            ref={railRef}
            className="ww-categories-line-1"
            role="tablist"
            aria-label="Main categories"
          >
            {/* All Categories Button */}
            <button
              type="button"
              className={`ww-cat-pill ${!mainCat ? "active" : ""}`}
              onClick={() => updateCategory(null)}
              aria-pressed={!mainCat}
              role="tab"
              aria-selected={!mainCat}
            >
              <span className="ww-cat-icon-bubble">
                <LayoutGrid size={15} aria-hidden="true" />
              </span>
              <span className="ww-cat-label-wrap">
                <span className="ww-cat-label">All Categories</span>
                <span className="ww-cat-count-sub">Worldwide</span>
              </span>
            </button>

            {/* Category Buttons */}
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const isActive = mainCat === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`ww-cat-pill ${isActive ? "active" : ""}`}
                  onClick={() => {
                    if (isActive && !subCat) {
                      updateCategory(null);
                    } else {
                      updateCategory(cat.id);
                    }
                  }}
                  aria-pressed={isActive}
                  role="tab"
                  aria-selected={isActive}
                >
                  <span className="ww-cat-icon-bubble">
                    <Icon size={15} aria-hidden="true" />
                  </span>
                  <span className="ww-cat-label-wrap">
                    <span className="ww-cat-label">{cat.label}</span>
                    <span className="ww-cat-count-sub">
                      {cat.subcategories.length} sub-types
                    </span>
                  </span>
                  {isActive && (
                    <span className="ww-cat-active-dot" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {/* Subcategories Ribbon */}
        <div className="ww-categories-line-2">
          {activeMain ? (
            <div className="ww-subcat-panel">
              <div className="ww-subcat-header">
                <div className="ww-subcat-label">
                  <SlidersHorizontal size={13} aria-hidden="true" />
                  <span className="ww-filters-inline-label">
                    Filter <strong>{activeMain.label}</strong> by topic:
                  </span>
                </div>

                {/* Dropdown select for tests & mobile/alternate usage */}
                <div className="ww-subcat-select-wrapper">
                  <select
                    value={subCat || ""}
                    onChange={e => {
                      const val = e.target.value;
                      updateCategory(activeMain.id, val ? val : null);
                    }}
                    aria-label="Filter by sub-category"
                    className="worldwide-dropdown-select ww-categories-sub-select"
                  >
                    <option value="">All {activeMain.label} sub-categories</option>
                    {activeMain.subcategories.map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Interactive Subcategory Quick-Chips */}
              <div
                className="ww-subcat-chips-row"
                role="group"
                aria-label={`${activeMain.label} subcategories`}
              >
                <button
                  type="button"
                  className={`ww-subcat-chip ${!subCat ? "active" : ""}`}
                  onClick={() => updateCategory(activeMain.id, null)}
                  aria-pressed={!subCat}
                >
                  <span>All {activeMain.label}</span>
                </button>
                {activeMain.subcategories.map(sub => {
                  const isSubActive = subCat === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      className={`ww-subcat-chip ${isSubActive ? "active" : ""}`}
                      onClick={() =>
                        updateCategory(
                          activeMain.id,
                          isSubActive ? null : sub.id
                        )
                      }
                      aria-pressed={isSubActive}
                    >
                      <span>{sub.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="ww-popular-discovery-strip">
              <div className="ww-popular-discovery-label">
                <Flame size={13} aria-hidden="true" />
                <span className="ww-filters-inline-label">Popular Topics:</span>
              </div>
              <div className="ww-popular-discovery-chips">
                {POPULAR_DISCOVERY_TAGS.map(tag => (
                  <button
                    key={`${tag.mainId}-${tag.subId}`}
                    type="button"
                    className="ww-popular-chip"
                    onClick={() => updateCategory(tag.mainId, tag.subId)}
                  >
                    <span className="ww-popular-chip-emoji">{tag.emoji}</span>
                    <span>{tag.label}</span>
                  </button>
                ))}
              </div>
              {/* Preserving select component for headless tests when main is inactive */}
              <select
                aria-label="Filter by sub-category"
                className="worldwide-dropdown-select ww-categories-sub-select sr-only"
                disabled
                value=""
                onChange={() => {}}
              >
                <option value="">Choose a main category first</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
