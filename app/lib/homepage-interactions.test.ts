import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("homepage discovery and carousel interaction contracts", () => {
  it("uses URL-backed standard discovery navigation without client transition loading", () => {
    const discovery = source("app/components/DiscoveryExperience.tsx");
    expect(discovery).toContain('method="get" action="/"');
    expect(discovery).toContain('const query = new URLSearchParams()');
    expect(discovery).toContain('query.set("filter", filter)');
    expect(discovery).toContain('query.set("sort", sort || "soonest")');
    expect(discovery).not.toContain("router.push(");
    expect(discovery).not.toContain("event.preventDefault()");
  });

  it("renders a distinct, keyboard-reachable carousel slide state with standard banner links", () => {
    const carousel = source("app/components/HeroCarousel.tsx"); const styles = source("app/globals.css");
    expect(carousel).toContain("data-slide={index + 1}");
    expect(carousel).toContain('query.set("banner", String((next + slides.length) % slides.length))');
    expect(carousel).toContain('aria-label="Next banner"');
    expect(carousel).toContain("href={href(index + 1)}");
    expect(carousel).not.toContain("router.push(");
    expect(carousel).toContain("Banner {index + 1} of {slides.length}");
    expect(styles).toContain(".hero-art.sun");
    expect(styles).toContain(".hero-art.coral");
    expect(styles).toContain(".carousel-controls>a");
  });
});
