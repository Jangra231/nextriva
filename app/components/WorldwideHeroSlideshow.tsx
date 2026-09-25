"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  CalendarDays,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";
import type { WorldwideEvent } from "../lib/worldwide-events";

interface WorldwideHeroSlideshowProps {
  events: WorldwideEvent[];
  heroTitle?: string;
  heroSubtitle?: string;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const CATEGORY_COLORS: Record<string, string> = {
  tech: "#193a32",
  music: "#2d1b69",
  fitness: "#b45309",
  food: "#9a3412",
  wellness: "#164e63",
  arts: "#6b21a8",
  community: "#166534",
  business: "#1e3a5f",
  energy: "#166534",
  automobile: "#7c2d12",
  sports: "#be123c",
  education: "#4338ca",
  health: "#0d9488",
};

function slideDate(value: string) {
  const d = new Date(value);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatPrice(event: WorldwideEvent): string | null {
  if (event.isFree) return "Free";
  if (event.priceMin == null) return null;
  const divisor = event.priceMin > 10000 ? 100 : 1;
  const sym =
    event.currency === "USD"
      ? "$"
      : event.currency === "EUR"
        ? "€"
        : event.currency === "GBP"
          ? "£"
          : event.currency === "INR"
            ? "₹"
            : event.currency === "JPY"
              ? "¥"
              : event.currency === "AUD"
                ? "A$"
                : "";
  const min = (event.priceMin / divisor).toLocaleString();
  const max =
    event.priceMax != null ? (event.priceMax / divisor).toLocaleString() : null;
  return max && max !== min ? `${sym}${min} – ${sym}${max}` : `${sym}${min}`;
}

export default function WorldwideHeroSlideshow({
  events,
  heroTitle,
  heroSubtitle,
}: WorldwideHeroSlideshowProps) {
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const total = events.length;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) setIsPaused(true);
  }, []);

  useEffect(() => {
    setActive(0);
    setImgErrors({});
  }, [events]);

  useEffect(() => {
    if (isPaused || isInteracting || total <= 1) return;
    const interval = window.setInterval(() => {
      setActive(current => (current + 1) % total);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [isInteracting, isPaused, total]);

  const goTo = useCallback(
    (index: number) => {
      if (total > 0) setActive((index + total) % total);
    },
    [total]
  );

  const previousSlide = useCallback(() => {
    setActive(current => (current === 0 ? total - 1 : current - 1));
  }, [total]);

  const nextSlide = useCallback(() => {
    setActive(current => (current + 1) % total);
  }, [total]);

  const markImgError = useCallback((id: string) => {
    setImgErrors(previous => ({ ...previous, [id]: true }));
  }, []);

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget))
      setIsInteracting(false);
  };

  if (total === 0) return null;

  const currentIndex = active % total;
  const slide = events[currentIndex];
  const priceText = formatPrice(slide);
  const categoryColor = CATEGORY_COLORS[slide.category || ""] || "#193a32";

  return (
    <div
      className="ww-slideshow"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured worldwide events"
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
      onFocus={() => setIsInteracting(true)}
      onBlur={handleBlur}
    >
      {(heroTitle || heroSubtitle) && (
        <div className="ww-hero-head">
          <span className="ww-hero-eyebrow">
            <Sparkles size={13} aria-hidden="true" /> Featured
          </span>
          {heroTitle && <h2 className="ww-hero-title">{heroTitle}</h2>}
          {heroSubtitle && <p className="ww-hero-subtitle">{heroSubtitle}</p>}
        </div>
      )}

      <div className="ww-slideshow-viewport">
        <article
          id="ww-slideshow-panel"
          className="ww-slideshow-slide ww-slideshow-slide--active"
          aria-roledescription="slide"
          aria-label={`${currentIndex + 1} of ${total}: ${slide.title}`}
          aria-live="off"
        >
          {slide.imageUrl && !imgErrors[slide.id] ? (
            <img
              className="ww-slideshow-image"
              src={slide.imageUrl}
              alt=""
              loading="eager"
              onError={() => markImgError(slide.id)}
            />
          ) : (
            <div
              className="ww-slideshow-fallback"
              style={{
                background: `linear-gradient(135deg, ${categoryColor} 0%, ${categoryColor}cc 100%)`,
              }}
              aria-hidden="true"
            >
              <span>{slide.title[0] || "W"}</span>
            </div>
          )}
          <div className="ww-slideshow-overlay" />
          <div className="ww-slideshow-content">
            <span className="ww-slideshow-kicker">
              {slide.category || "Worldwide event"}
            </span>
            <h3>{slide.title}</h3>
            <div className="ww-slideshow-event-meta">
              <CalendarDays size={15} aria-hidden="true" />{" "}
              {slideDate(slide.startDate)}
            </div>
            <div className="ww-slideshow-event-meta">
              <MapPin size={15} aria-hidden="true" /> {slide.city},{" "}
              {slide.country}
            </div>
            {priceText && (
              <span className="ww-slideshow-price">{priceText}</span>
            )}
            <a className="ww-slideshow-link" href={slide.url}>
              View event <ChevronRight size={15} aria-hidden="true" />
            </a>
          </div>
        </article>

        {total > 1 && (
          <>
            <div className="ww-slideshow-controls">
              <button
                type="button"
                className="ww-slideshow-btn"
                onClick={previousSlide}
                aria-label="Previous slide"
              >
                <ChevronLeft size={20} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="ww-slideshow-btn ww-slideshow-btn--playpause"
                onClick={() => setIsPaused(paused => !paused)}
                aria-label={
                  isPaused ? "Play moving carousel" : "Pause moving carousel"
                }
                aria-pressed={isPaused}
              >
                {isPaused ? (
                  <Play size={16} aria-hidden="true" />
                ) : (
                  <Pause size={16} aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                className="ww-slideshow-btn"
                onClick={nextSlide}
                aria-label="Next slide"
              >
                <ChevronRight size={20} aria-hidden="true" />
              </button>
            </div>

            <div
              className="ww-slideshow-dots"
              role="tablist"
              aria-label="Slide navigation"
            >
              {events.map((event, index) => (
                <button
                  key={event.id}
                  type="button"
                  className={`ww-slideshow-dot ${index === currentIndex ? "ww-slideshow-dot--active" : ""}`}
                  onClick={() => goTo(index)}
                  role="tab"
                  aria-selected={index === currentIndex}
                  aria-controls="ww-slideshow-panel"
                  aria-label={`Go to slide ${index + 1}: ${event.title}`}
                />
              ))}
            </div>
          </>
        )}

        <span className="ww-slideshow-position" aria-live="polite">
          {currentIndex + 1} / {total}
        </span>
      </div>
    </div>
  );
}
