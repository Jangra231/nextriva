"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowUpRight, CalendarDays, MapPin, UsersRound, Heart } from "lucide-react";
import styles from "./WorldwideEventCard.module.css";


type WorldwideEventCardProps = {
  event: {
    id: string;
    provider: string;
    title: string;
    description?: string;
    url: string;
    imageUrl?: string;
    startDate: string; // ISO 8601
    endDate?: string;
    timezone: string;
    venueName?: string;
    venueAddress?: string;
    city: string;
    country: string;
    countryCode: string;
    latitude?: number;
    longitude?: number;
    category?: string;
    subCategory?: string;
    tags: string[];
    priceMin?: number;
    priceMax?: number;
    currency: string;
    isFree: boolean;
    popularity: number;
    sourceData: Record<string, unknown>;
  };
};

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

function dateText(value: string | null) {
  return value
    ? `${new Date(value).getUTCDate()} ${MONTHS[new Date(value).getUTCMonth()]} ${new Date(value).getUTCFullYear()}`
    : "Date to be confirmed";
}

function formatPrice(min: number, max: number | undefined, currency: string) {
  const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£" };
  const symbol = symbols[currency] || `${currency} `;
  const minText = (min / 100).toLocaleString();
  if (max === undefined || max === min) return `${symbol}${minText}`;
  return `${symbol}${minText} – ${symbol}${(max / 100).toLocaleString()}`;
}

export default function WorldwideEventCard({ event }: WorldwideEventCardProps) {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("nexriva_saved_events") || "[]");
      setIsSaved(saved.includes(event.id));
    } catch {}
  }, [event.id]);

  const toggleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const saved = JSON.parse(localStorage.getItem("nexriva_saved_events") || "[]");
      let next;
      if (saved.includes(event.id)) {
        next = saved.filter((id: string) => id !== event.id);
        setIsSaved(false);
      } else {
        next = [...saved, event.id];
        setIsSaved(true);
      }
      localStorage.setItem("nexriva_saved_events", JSON.stringify(next));
    } catch {}
  };

  const parsedDate = event.startDate ? new Date(event.startDate) : null;
  const day = parsedDate ? parsedDate.getUTCDate() : null;
  const month = parsedDate ? MONTHS[parsedDate.getUTCMonth()] : null;

  return (
    <article className={styles.worldwideEventCard}>
      <Link href={event.url} className={styles.cardLink} aria-label={`View details for ${event.title}`}>
        <div className={styles.eventCover}>
          {event.imageUrl ? (
            <img src={event.imageUrl} alt="" loading="lazy" />
          ) : (
            <div className={styles.coverPlaceholder}>
              <span>{event.title ? event.title[0] : "F"}</span>
            </div>
          )}
          <div className={styles.coverShade} aria-hidden="true" />
          {day !== null && month !== null && (
            <div className={styles.eventDateChip} aria-hidden="true">
              <span className={styles.eventDateDay}>{day}</span>
              <span className={styles.eventDateMonth}>{month}</span>
            </div>
          )}
          <span className={styles.imageLabel}>{event.category || "Experience"}</span>
        </div>
        <div className={styles.eventCardCopy}>
          <div className={styles.eventMeta}>
            <span className={styles.categoryPill}>{event.category || "Event"}</span>
            <span className={styles.eventSource}>{event.provider.replace(/_/g, " ")}</span>
          </div>
          <h3>{event.title}</h3>
          <div className={styles.eventDetails}>
            <span><CalendarDays size={14} aria-hidden="true" />{dateText(event.startDate)}</span>
            <span><MapPin size={14} aria-hidden="true" />{event.city}, {event.country}</span>
            {event.venueName && (
              <span><UsersRound size={14} aria-hidden="true" />{event.venueName}</span>
            )}
          </div>
          <div className={styles.cardFooter}>
            <span className={`${styles.priceInfo} ${event.isFree ? styles.free : ""}`}>
              {event.isFree
                ? "Free entry"
                : event.priceMin !== undefined
                  ? `${formatPrice(event.priceMin, event.priceMax, event.currency)}`
                  : "See ticket details"}
            </span>
            <span className={styles.cardAction}>
              View event <ArrowUpRight size={15} aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={toggleSave}
        className={`${styles.saveButton} ${isSaved ? styles.saved : ""}`}
        aria-label={isSaved ? `Remove ${event.title} from saved events` : `Save ${event.title}`}
        aria-pressed={isSaved}
      >
        <Heart size={18} fill={isSaved ? "currentColor" : "none"} aria-hidden="true" />
      </button>
    </article>
  );
}