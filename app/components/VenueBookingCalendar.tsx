"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import styles from "./VenueBookingCalendar.module.css";

export type VenueReservation = { venueId: number; eventId: number; displayName: string; startsAt: string | Date | null; endsAt: string | Date | null };
const slots = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function endOf(reservation: VenueReservation) {
  const start = new Date(reservation.startsAt as Date | string);
  return reservation.endsAt ? new Date(reservation.endsAt) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
}

function reservationForDay(day: Date, reservations: VenueReservation[]) {
  const key = dayKey(day);
  return reservations.find(item => item.startsAt && key >= dayKey(new Date(item.startsAt)) && key <= dayKey(endOf(item)));
}

function reservationForSlot(day: Date, time: string, reservations: VenueReservation[]) {
  const [hours, minutes] = time.split(":").map(Number); const slotStart = new Date(day); slotStart.setHours(hours, minutes, 0, 0); const slotEnd = new Date(slotStart.getTime() + 2 * 60 * 60 * 1000);
  return reservations.find(item => item.startsAt && slotStart < endOf(item) && slotEnd > new Date(item.startsAt));
}

function reservationRange(reservation: VenueReservation) {
  if (!reservation.startsAt) return "Reserved time";
  const format = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
  return `${format.format(new Date(reservation.startsAt))} – ${format.format(endOf(reservation))}`;
}

function nextAvailableSlot(selectedDay: Date, reservations: VenueReservation[]) {
  for (let offset = 1; offset <= 90; offset += 1) {
    const day = new Date(selectedDay); day.setDate(day.getDate() + offset);
    const time = slots.find(slot => !reservationForSlot(day, slot, reservations));
    if (time) return { day, time };
  }
  return undefined;
}

export default function VenueBookingCalendar({ venueName, reservations }: { venueName: string; reservations: VenueReservation[] }) {
  const today = new Date(); const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1)); const [selectedDay, setSelectedDay] = useState(() => new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const reservationKey = reservations.map(item => `${item.eventId}:${item.startsAt ? new Date(item.startsAt).toISOString() : ""}`).sort().join("|");
  useEffect(() => { const first = reservations.filter(item => item.startsAt).sort((left, right) => new Date(left.startsAt as Date | string).getTime() - new Date(right.startsAt as Date | string).getTime())[0]; if (!first?.startsAt) return; const start = new Date(first.startsAt); setMonth(new Date(start.getFullYear(), start.getMonth(), 1)); setSelectedDay(new Date(start.getFullYear(), start.getMonth(), start.getDate())); }, [venueName, reservationKey]);
  const days = useMemo(() => { const start = new Date(month); start.setDate(1 - start.getDay()); return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; }); }, [month]);
  const selectedReservations = slots.map(time => ({ time, reservation: reservationForSlot(selectedDay, time, reservations) })); const fullDay = selectedReservations.every(({ reservation }) => Boolean(reservation)); const suggested = fullDay ? nextAvailableSlot(selectedDay, reservations) : undefined;
  const selectedReservation = reservationForDay(selectedDay, reservations); const selectedLabel = selectedDay.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" }); const upcoming = reservations.filter(item => item.startsAt && endOf(item).getTime() >= Date.now()).sort((left, right) => new Date(left.startsAt as Date | string).getTime() - new Date(right.startsAt as Date | string).getTime()).slice(0, 3);
  return <section className={styles.calendar} aria-label={`${venueName} availability calendar`}><div className={styles.head}><div><span><CalendarDays size={14} /> Venue booking calendar</span><b>{venueName}</b><small>Choose a date to see availability slots. Reserved dates cannot be selected for another event.</small></div><div className={styles.controls}><button type="button" aria-label="Previous month" onClick={() => setMonth(value => new Date(value.getFullYear(), value.getMonth() - 1, 1))}><ChevronLeft size={15} /></button><b>{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</b><button type="button" aria-label="Next month" onClick={() => setMonth(value => new Date(value.getFullYear(), value.getMonth() + 1, 1))}><ChevronRight size={15} /></button></div></div><div className={styles.weekdays}>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => <span key={day}>{day}</span>)}</div><div className={styles.days}>{days.map(day => { const reservation = reservationForDay(day, reservations); const outside = day.getMonth() !== month.getMonth(); const selected = dayKey(day) === dayKey(selectedDay); return <button type="button" key={day.toISOString()} onClick={() => { setSelectedDay(day); if (outside) setMonth(new Date(day.getFullYear(), day.getMonth(), 1)); }} className={`${styles.day} ${outside ? styles.outside : ""} ${reservation ? styles.reserved : styles.available} ${selected ? styles.selected : ""}`} title={reservation ? `Reserved by ${reservation.displayName} · ${reservationRange(reservation)}` : "Available — view time slots"}><b>{day.getDate()}</b><small>{reservation ? "Reserved" : "Available"}</small>{reservation ? <em>{reservation.displayName}</em> : null}</button>; })}</div><section className={styles.slots} aria-live="polite"><div><span><Clock3 size={14} /> {selectedLabel} time slots</span><small>{fullDay && suggested ? `Fully reserved. Next available: ${suggested.day.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} at ${suggested.time}.` : selectedReservation ? `Reserved timeline is shown in red. ${reservationRange(selectedReservation)}.` : "Green timeline slots are available; red timeline slots are reserved."}</small></div><div className={styles.slotGrid}>{selectedReservations.map(({ time, reservation }) => <span key={time} className={reservation ? styles.slotReserved : styles.slotAvailable} title={reservation ? `Reserved by ${reservation.displayName} · ${reservationRange(reservation)}` : "Available"}>{time}<small>{reservation ? "Reserved" : "Available"}</small></span>)}</div></section><div className={styles.legend}><span><i className={styles.availableDot} /> Available</span><span><i className={styles.reservedDot} /> Reserved</span></div>{upcoming.length ? <div className={styles.upcoming} aria-label="Upcoming venue reservations"><b>Upcoming:</b>{upcoming.map(reservation => <span key={`${reservation.eventId}-${String(reservation.startsAt)}`}>{reservation.displayName} · {reservationRange(reservation)}</span>)}</div> : null}</section>;
}
