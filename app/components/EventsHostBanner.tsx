import Link from "next/link";
import { ArrowRight, CalendarPlus, ShieldCheck, Sparkles, Trophy, Users } from "lucide-react";

export default function EventsHostBanner() {
  return (
    <section className="events-host-banner" aria-label="Organizer showcase">
      <div className="host-banner-glow" aria-hidden="true" />
      <div className="host-banner-content">
        <div className="host-banner-badge">
          <Sparkles size={13} aria-hidden="true" />
          <span>For Creators & Organizers</span>
        </div>
        <h2>Host your next event with Fitizen & Nexriva</h2>
        <p>
          Publish sports events, runs, workshops, cultural gatherings, and conferences with automated ticketing, verified attendee QR check-ins, and zero payment headaches.
        </p>

        <div className="host-banner-features">
          <div className="host-feature-item">
            <ShieldCheck size={16} className="feature-icon" aria-hidden="true" />
            <span>MCD & Local Authority Ready</span>
          </div>
          <div className="host-feature-item">
            <Users size={16} className="feature-icon" aria-hidden="true" />
            <span>Engaged Community Across India</span>
          </div>
          <div className="host-feature-item">
            <Trophy size={16} className="feature-icon" aria-hidden="true" />
            <span>Verified Venue Approvals</span>
          </div>
        </div>

        <div className="host-banner-actions">
          <Link href="/dashboard/manage-events/create-event/new" className="btn btn-coral host-primary-btn">
            <CalendarPlus size={16} aria-hidden="true" />
            <span>Create Your Event</span>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
          <Link href="/about" className="btn btn-outline host-secondary-btn">
            <span>Learn More</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
