import Link from "next/link";

export default function SiteFooter() {
  return <footer className="footer"><div className="shell footer-grid"><div><div className="brand"><span className="brand-mark">N</span><span>nexriva</span></div><p>Discover and join memorable events across India. Your next shared experience starts here.</p></div><div><h3>Quick Links</h3><Link href="/events">Events</Link><Link href="/about">About Us</Link></div><div><h3>Support</h3><Link href="/faq">FAQ</Link><Link href="/privacy-policy">Privacy Policy</Link></div><div><h3>Community</h3><p>Organizer and community links are shared on each event page when available.</p></div></div><div className="shell footer-bottom"><span>© 2026 Nexriva. All rights reserved.</span><span>Made for event lovers</span></div></footer>;
}
