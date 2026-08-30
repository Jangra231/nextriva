const slides = [
  { eyebrow: "Featured this week", title: "Move. Meet. Make memories.", footer: "Events across India", theme: "forest" },
  { eyebrow: "Find your pace", title: "Run into your next crew.", footer: "Races and wellness", theme: "sun" },
  { eyebrow: "Make a plan", title: "Small rooms. Big energy.", footer: "Community experiences", theme: "coral" },
];

export default function HeroCarousel({ active = 0, params = {} }: { active?: number; params?: Record<string, string | undefined> }) {
  const index = Number.isInteger(active) && active >= 0 && active < slides.length ? active : 0; const slide = slides[index];
  const href = (next: number) => { const query = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value && key !== "banner") query.set(key, value); }); query.set("banner", String((next + slides.length) % slides.length)); return `/?${query.toString()}`; };
  return <div className={`hero-art ${slide.theme}`} data-slide={index + 1} aria-roledescription="carousel" aria-label="Featured Nexriva experiences. Use the previous and next banner links to change the feature."><div className={`hero-slide-orb ${slide.theme}`} aria-hidden="true" /><div className="art-card"><span>{slide.eyebrow}</span><h3>{slide.title}</h3><div className="art-date"><i /> {slide.footer}</div><p className="carousel-position">Banner {index + 1} of {slides.length}</p></div><nav className="carousel-controls" aria-label="Featured banners"><a href={href(index - 1)} aria-label="Previous banner">‹</a><div className="carousel-dots">{slides.map((item, itemIndex) => <a key={item.title} href={href(itemIndex)} aria-label={`Show banner ${itemIndex + 1}: ${item.footer}`} aria-current={index === itemIndex ? "page" : undefined} className={index === itemIndex ? "active" : ""} />)}</div><a href={href(index + 1)} aria-label="Next banner">›</a></nav></div>;
}
