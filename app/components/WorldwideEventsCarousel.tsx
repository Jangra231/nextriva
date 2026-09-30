"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Play, Pause, Sparkles, LayoutGrid, SlidersHorizontal } from "lucide-react";
import WorldwideEventCard from "./WorldwideEventCard";
import type { WorldwideEvent } from "../lib/worldwide-events";

interface WorldwideEventsCarouselProps {
  events: WorldwideEvent[];
  hideViewToggle?: boolean;
}

export default function WorldwideEventsCarousel({ events, hideViewToggle }: WorldwideEventsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"carousel" | "grid">("carousel");

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const total = events.length;
  const displayEvents = total > 3 ? [...events, ...events, ...events] : events;

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (total > 3) {
      const oneThird = el.scrollWidth / 3;
      if (el.scrollLeft >= oneThird * 2) {
        el.scrollLeft -= oneThird;
      } else if (el.scrollLeft <= 5) {
        el.scrollLeft += oneThird;
      }
    }

    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);

    const cardWidth = 340;
    const effectiveIndex = Math.floor((el.scrollLeft % (total * cardWidth)) / cardWidth);
    setCurrentIndex(((effectiveIndex % total) + total) % total);
  }, [total]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (total > 3 && el.scrollLeft === 0) {
      el.scrollLeft = el.scrollWidth / 3;
    }

    el.addEventListener("scroll", updateScrollState, { passive: true });
    updateScrollState();
    return () => el.removeEventListener("scroll", updateScrollState);
  }, [updateScrollState, total]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setIsPaused(true);
      }
    }
  }, []);

  useEffect(() => {
    if (isPaused || isHovered || isFocused || total <= 1 || viewMode === "grid") return;

    const interval = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollBy({ left: 340, behavior: "smooth" });
    }, 3600);

    return () => clearInterval(interval);
  }, [isPaused, isHovered, isFocused, total, viewMode]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -340 : 340, behavior: "smooth" });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    el.scrollLeft = scrollLeftRef.current - (x - startXRef.current) * 1.5;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  if (total === 0) return null;

  return (
    <div className="worldwide-carousel-section" role="region" aria-roledescription="carousel" aria-label="Worldwide events carousel">
      <div className="worldwide-carousel-header">
        <div className="worldwide-carousel-title-group">
          <div className="worldwide-carousel-badge">
            <span className="worldwide-carousel-pulse" aria-hidden="true" />
            <Sparkles size={13} aria-hidden="true" />
            <span>Moving Discovery</span>
          </div>
          <span className="worldwide-carousel-counter" aria-live="polite">
            <strong>{currentIndex + 1}</strong> of <strong>{total}</strong> live events
          </span>
        </div>

        <div className="worldwide-carousel-controls-bar">
          {!hideViewToggle && (
            <div className="worldwide-carousel-view-toggle">
              <button
                type="button"
                className={`worldwide-view-btn ${viewMode === "carousel" ? "active" : ""}`}
                onClick={() => setViewMode("carousel")}
                aria-label="Carousel view"
              >
                <SlidersHorizontal size={14} />
                <span>Carousel</span>
              </button>
              <button
                type="button"
                className={`worldwide-view-btn ${viewMode === "grid" ? "active" : ""}`}
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
              >
                <LayoutGrid size={14} />
                <span>Grid</span>
              </button>
            </div>
          )}

          {viewMode === "carousel" && (
            <div className="worldwide-carousel-nav-group">
              <button
                type="button"
                className={`worldwide-carousel-btn worldwide-carousel-btn-playpause ${isPaused ? "paused" : ""}`}
                onClick={() => setIsPaused((prev) => !prev)}
                aria-label={isPaused ? "Play moving carousel" : "Pause moving carousel"}
              >
                {isPaused ? <Play size={15} /> : <Pause size={15} />}
              </button>
              <button
                type="button"
                className="worldwide-carousel-btn worldwide-carousel-btn-nav"
                onClick={() => scroll("left")}
                aria-label="Previous events"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="worldwide-carousel-btn worldwide-carousel-btn-nav"
                onClick={() => scroll("right")}
                aria-label="Next events"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {viewMode === "carousel" ? (
        <div
          className="worldwide-carousel-wrapper"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => { setIsHovered(false); handleMouseUpOrLeave(); }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        >
          {canScrollLeft && (
            <button
              type="button"
              className="worldwide-carousel-floating-btn worldwide-carousel-btn-left"
              onClick={() => scroll("left")}
              aria-label="Scroll left"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          <div
            className="worldwide-carousel-track"
            ref={scrollRef}
            tabIndex={0}
            role="list"
            aria-label="Worldwide events list"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
          >
            {displayEvents.map((event, idx) => (
              <div className="worldwide-carousel-item" key={`${event.id}-${idx}`} role="listitem">
                <WorldwideEventCard event={event} />
              </div>
            ))}
          </div>

          {canScrollRight && (
            <button
              type="button"
              className="worldwide-carousel-floating-btn worldwide-carousel-btn-right"
              onClick={() => scroll("right")}
              aria-label="Scroll right"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      ) : (
        <div className="event-grid worldwide-event-grid" role="feed" aria-label="Worldwide events">
          {events.map((event) => (
            <WorldwideEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}