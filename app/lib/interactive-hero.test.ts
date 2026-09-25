import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Interactive3DHero UI and styling contracts", () => {
  it("defines comprehensive hero styles and responsive rules in globals.css", () => {
    const styles = source("app/globals.css");
    expect(styles).toContain(".interactive-hero-root");
    expect(styles).toContain(".interactive-hero-search-card");
    expect(styles).toContain(".hero-search-icon");
    expect(styles).toContain(".interactive-hero-input");
    expect(styles).toContain(".hero-search-btn");
    expect(styles).toContain(".interactive-hero-quick-tags");
    expect(styles).toContain(".interactive-hero-3d-card");
    expect(styles).toContain(".interactive-hero-floating-badge");
    expect(styles).toContain("@media (max-width: 960px)");
    expect(styles).toContain("@media (max-width: 640px)");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("implements accessible search form and 3D tilt interactions in Interactive3DHero.tsx", () => {
    const heroCode = source("app/components/Interactive3DHero.tsx");
    expect(heroCode).toContain('role="search"');
    expect(heroCode).toContain('aria-label="Search events"');
    expect(heroCode).toContain("QUICK_TAGS");
    expect(heroCode).toContain("interactive-hero-3d-card");
    expect(heroCode).toContain("illustrationStyle");
    expect(heroCode).toContain("onPointerMove");
    expect(heroCode).toContain("onPointerLeave");
  });
});
