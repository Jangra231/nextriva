import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("site navigation small-screen controls", () => {
  it("renders a native mobile menu trigger that carries the account and primary actions", () => {
    const nav = source("app/components/SiteNav.tsx");
    expect(nav).toContain('className="nav-mobile-menu"');
    expect(nav).toContain('<summary className="nav-mobile-trigger"');
    expect(nav).toContain("Menu size={18}");
    expect(nav).toContain("nav-mobile-links");
    expect(nav).toContain("nav-mobile-account");
    expect(nav).toContain("nav-mobile-primary");
  });

  it("keeps login, account menu, and create-event actions reachable on small screens", () => {
    const nav = source("app/components/SiteNav.tsx");
    expect(nav).toContain('aria-label="Login or sign up"');
    expect(nav).toContain('aria-label="Open account menu"');
    expect(nav).toContain('ariaLabel: "Create a new event"');
    expect(nav).toContain("CalendarPlus size={15}");
  });

  it("no longer removes navigation icons or action buttons at the mobile breakpoint", () => {
    const styles = source("app/globals.css");
    expect(styles).not.toContain(".site-header .btn-outline");
    expect(styles).toMatch(/@media \(max-width: 560px\) \{[\s\S]*?\.nav-mobile-menu \{\s*display: block;/);
    expect(styles).toMatch(/@media \(max-width: 560px\) \{[\s\S]*?\.nav-links \{\s*display: none;/);
    expect(styles).toMatch(/@media \(max-width: 560px\) \{[\s\S]*?\.nav-actions \{\s*display: none;/);
  });

  it("styles the mobile panel and hides it on larger screens", () => {
    const styles = source("app/globals.css");
    expect(styles).toContain(".nav-mobile-trigger");
    expect(styles).toContain(".nav-mobile-panel");
    expect(styles).toMatch(/\.nav-mobile-menu \{\s*position: relative;\s*display: none;/);
  });
});
