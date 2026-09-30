"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Sparkles, ShieldCheck } from "lucide-react";

interface Interactive3DHeroProps {
  eventCount: number;
  initialSearch?: string;
}

const QUICK_TAGS = [
  { label: "🎵 Live Music", query: "Music" },
  { label: "🏃 Fitness & Runs", query: "Fitness" },
  { label: "🎨 Art & Culture", query: "Art" },
  { label: "🍕 Food & Drink", query: "Food" },
  { label: "⚡ Tech & Startups", query: "Tech" },
  { label: "🌿 Wellness", query: "Wellness" },
];

export default function Interactive3DHero({
  eventCount,
  initialSearch = "",
}: Interactive3DHeroProps) {
  const illustrationRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [tagBounce, setTagBounce] = useState<string | null>(null);

  useEffect(() => {
    setSearchQuery(initialSearch);
  }, [initialSearch]);

  const executeSearch = (overrideQuery?: string) => {
    const q = overrideQuery !== undefined ? overrideQuery : searchQuery;

    const params = new URLSearchParams();
    if (q && q.trim()) params.set("search", q.trim());

    const queryString = params.toString();
    router.push(queryString ? `/events?${queryString}` : "/events");
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      executeSearch();
    }, 350);
  };

  const handleQuickTagClick = (tagQuery: string) => {
    setActiveTag(tagQuery);
    setTagBounce(tagQuery);
    setSearchQuery(tagQuery);
    searchInputRef.current?.focus();
    setTimeout(() => setTagBounce(null), 400);
    setTimeout(() => executeSearch(tagQuery), 350);
  };

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const node = illustrationRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMousePos({ x, y });
  }, []);

  const onPointerEnter = useCallback(() => setIsHovered(true), []);
  const onPointerLeave = useCallback(() => {
    setIsHovered(false);
    setMousePos({ x: 0, y: 0 });
  }, []);

  const illustrationStyle: React.CSSProperties = {
    transform: isHovered
      ? `perspective(1000px) rotateY(${mousePos.x * 8}deg) rotateX(${-mousePos.y * 8}deg) scale3d(1.02, 1.02, 1.02)`
      : `perspective(1000px) rotateY(0deg) rotateX(0deg) scale3d(1, 1, 1)`,
    transition: isHovered
      ? "transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)"
      : "transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)",
    willChange: "transform",
    transformStyle: "preserve-3d",
  };

  return (
    <section className="interactive-hero-root" aria-label="Explore events hero section">
      {/* Left column: text + multi-segment search + quick pills */}
      <div className="interactive-hero-left">
        {/* Live counter badge */}
        <div className="interactive-hero-badge">
          <span className="interactive-hero-badge-dot" aria-hidden="true" />
          <span>{eventCount > 0 ? `${eventCount} live events in India` : "Discover live events"}</span>
        </div>

        {/* Heading */}
        <h1>
          Find the right <span className="interactive-hero-highlight">room.</span>
        </h1>

        {/* Subtitle */}
        <p className="interactive-hero-subtitle">
          Search by interest — discover verified community gatherings, workshops, and experiences across India.
        </p>

        {/* Search Form */}
        <form
          onSubmit={handleFormSubmit}
          className="interactive-hero-search-card"
          role="search"
          aria-label="Search events"
        >
          <Search size={18} className="hero-search-icon" aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search events, artists, activities…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search events by title, keyword, or activity"
            autoComplete="off"
            spellCheck={false}
            className="interactive-hero-input"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveTag(null);
              }}
              aria-label="Clear search input"
              className="hero-clear-btn"
            >
              <X size={13} aria-hidden="true" />
            </button>
          ) : null}
          <button type="submit" className="hero-search-btn" aria-label="Search live events" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="hero-btn-spinner" aria-hidden="true" />
            ) : (
              <Search size={15} className="hero-search-submit-icon" aria-hidden="true" />
            )}
            <span>{isSubmitting ? "Searching…" : "Search"}</span>
          </button>
        </form>

        {/* Popular Quick Filter Tags */}
        <div className="interactive-hero-quick-tags" aria-label="Popular search suggestions">
          <span className="hero-popular-label">
            <Sparkles size={13} className="hero-popular-icon" aria-hidden="true" />
            <span>Popular:</span>
          </span>
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag.query}
              type="button"
              onClick={() => handleQuickTagClick(tag.query)}
              className={`hero-tag-btn${activeTag === tag.query ? " is-active" : ""}${tagBounce === tag.query ? " is-bouncing" : ""}`}
              aria-label={`Search for ${tag.label}`}
              aria-pressed={activeTag === tag.query}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right column: 3D interactive showcase card */}
      <div className="interactive-hero-showcase">
        <div
          ref={illustrationRef}
          onPointerMove={onPointerMove}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          style={illustrationStyle}
          className="interactive-hero-3d-card"
          role="img"
          aria-label="Interactive 3D illustration showcasing vibrant community spaces"
        >
          {/* Floating interactive badges */}
          <div className="interactive-hero-floating-badge badge-top">
            <Sparkles size={13} color="#f65f4a" aria-hidden="true" />
            <span>Live in India</span>
          </div>

          <div className="interactive-hero-floating-badge badge-bottom-left">
            <ShieldCheck size={13} color="rgb(34, 197, 94)" aria-hidden="true" />
            <span>100% Verified Venues</span>
          </div>

          <svg
            viewBox="0 0 440 360"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: "100%", height: "auto", display: "block", borderRadius: "20px" }}
          >
            <defs>
              <linearGradient id="heroSkyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#bce7d6" />
                <stop offset="50%" stopColor="#d5f0e3" />
                <stop offset="100%" stopColor="#fdfcf7" />
              </linearGradient>
              <linearGradient id="heroArchGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#e8513d" />
                <stop offset="100%" stopColor="#c23927" />
              </linearGradient>
              <linearGradient id="heroSunGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffe994" />
                <stop offset="100%" stopColor="#ffc55a" />
              </linearGradient>
              <radialGradient id="heroBgGlow" cx="50%" cy="45%" r="60%">
                <stop offset="0%" stopColor="#eaf5e6" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#f7faf5" stopOpacity="0.2" />
              </radialGradient>
            </defs>

            <ellipse cx="220" cy="180" rx="205" ry="165" fill="url(#heroBgGlow)" />

            <g opacity="0.45">
              {Array.from({ length: 6 }).map((_, ring) =>
                Array.from({ length: ring * 6 + 4 }).map((_, dot) => {
                  const angle = (dot / (ring * 6 + 4)) * Math.PI * 2;
                  const r = ring * 14 + 10;
                  const cx = 110 + Math.cos(angle) * r;
                  const cy = 60 + Math.sin(angle) * r;
                  return <circle key={`${ring}-${dot}`} cx={cx} cy={cy} r={1.3} fill="#193a32" opacity={0.3 + ring * 0.08} />;
                })
              )}
            </g>

            <ellipse cx="220" cy="328" rx="140" ry="15" fill="#d9c7b2" opacity="0.7" />
            <rect x="110" y="302" width="220" height="26" rx="8" fill="#f0e2d0" stroke="#e0cfbb" strokeWidth="1.5" />

            <path
              d="M130 304 V145 A90 90 0 0 1 310 145 V304 Z"
              fill="url(#heroArchGrad)"
              stroke="#a82f20"
              strokeWidth="2.5"
            />

            <path
              d="M136 304 V148 A84 84 0 0 1 220 64"
              fill="none"
              stroke="#ff8675"
              strokeWidth="3.5"
              opacity="0.6"
              strokeLinecap="round"
            />

            <path d="M152 304 V160 A68 68 0 0 1 288 160 V304 Z" fill="url(#heroSkyGrad)" />
            <circle cx="220" cy="155" r="30" fill="url(#heroSunGrad)" opacity="0.85" />
            <circle cx="220" cy="155" r="42" fill="#fff5d0" opacity="0.3" />

            <g opacity="0.9">
              <ellipse cx="195" cy="190" rx="20" ry="8" fill="#ffffff" />
              <ellipse cx="182" cy="188" rx="12" ry="6" fill="#ffffff" />
              <ellipse cx="208" cy="188" rx="13" ry="6" fill="#ffffff" />
              <ellipse cx="245" cy="205" rx="24" ry="9" fill="#ffffff" />
              <ellipse cx="230" cy="203" rx="14" ry="7" fill="#ffffff" />
              <ellipse cx="258" cy="203" rx="15" ry="7" fill="#ffffff" />
            </g>

            <ellipse cx="180" cy="315" rx="75" ry="40" fill="#4d994d" />
            <ellipse cx="260" cy="315" rx="65" ry="36" fill="#3b7d3b" />
            <ellipse cx="220" cy="318" rx="50" ry="25" fill="#2d682d" />
            <path d="M220 318 Q226 278 220 255 Q214 278 220 318" fill="#f7ede1" />

            <g>
              <path
                d="M302 160 Q302 150 312 145 L340 135 Q352 133 355 145 V298 L312 304 Z"
                fill="#bf3927"
                stroke="#9c2717"
                strokeWidth="1.5"
              />
              <line x1="318" y1="175" x2="344" y2="165" stroke="#9c2717" strokeWidth="1" opacity="0.6" />
              <line x1="318" y1="218" x2="345" y2="208" stroke="#9c2717" strokeWidth="1" opacity="0.6" />
              <line x1="318" y1="262" x2="346" y2="252" stroke="#9c2717" strokeWidth="1" opacity="0.6" />
              <circle cx="325" cy="230" r="3.5" fill="#16211d" />
            </g>

            <g>
              <path d="M112 302 Q100 262 112 242 Q120 262 112 302 Z" fill="#2e6d2e" />
              <path d="M124 302 Q110 255 122 235 Q130 258 124 302 Z" fill="#3f8f3f" />
              <path d="M136 302 Q124 265 134 246 Q140 268 136 302 Z" fill="#225422" />
            </g>

            <g>
              <path d="M325 300 Q338 258 326 238 Q322 260 325 300 Z" fill="#2e6d2e" />
              <path d="M338 300 Q354 250 342 228 Q335 256 338 300 Z" fill="#3f8f3f" />
              <path d="M352 300 Q366 264 356 248 Q348 270 352 300 Z" fill="#225422" />
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}