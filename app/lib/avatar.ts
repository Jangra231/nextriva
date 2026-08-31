/**
 * Deterministic generated avatars (SVG data URIs).
 *
 * When a user has no uploaded photo, we render a vibrant gradient monogram
 * derived from their name. The gradient palette is chosen deterministically
 * from a hash of the name, so the same person always gets the same avatar.
 * No server calls, storage, or DB schema changes are needed – the avatar is
 * computed on-the-fly from the `name` field.
 */

/** 8 curated forest/mint/coral gradient palettes (two-stop) tuned to the app theme. */
const PALETTES: ReadonlyArray<readonly [string, string]> = [
  ["#2f6b4f", "#7fbf8c"], // forest -> sage
  ["#bf3d2b", "#f2a65a"], // coral -> apricot
  ["#1f3c4f", "#4f8fb0"], // deep teal -> sky
  ["#5b3fa0", "#a98bdd"], // violet -> lilac
  ["#7a4a2b", "#d9a05b"], // bronze -> amber
  ["#1f5f5b", "#62c4b8"], // pine -> aqua
  ["#a63a5f", "#e08abe"], // berry -> blush
  ["#3a4a63", "#8496b8"], // slate -> steel
];

/** Simple deterministic string hash (djb2). */
function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0; // hash * 33 + c
  }
  return Math.abs(hash);
}

/** Extract up to two leading initials from a name, falling back to a brand mark. */
export function getInitials(name: string | null | undefined): string {
  const cleaned = (name || "").trim();
  if (!cleaned) return "N";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "";
  const second = parts.length > 1 ? parts[1]?.[0] || "" : "";
  return (first + second).toUpperCase() || "N";
}

/**
 * Build an SVG data URI monogram avatar for the given name.
 * Deterministic and dependency-free – safe to use in both Server and Client
 * components (returns a plain string).
 */
export function generateInitialsAvatar(name: string | null | undefined): string {
  const initials = getInitials(name);
  const hash = hashString((name || "").trim().toLowerCase() || "anonymous");
  const [from, to] = PALETTES[hash % PALETTES.length];

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">`,
    `<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">`,
    `<stop offset="0%" stop-color="${from}"/>`,
    `<stop offset="100%" stop-color="${to}"/>`,
    `</linearGradient></defs>`,
    `<rect width="256" height="256" fill="url(#g)"/>`,
    `<text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="104" font-weight="700" fill="rgba(255,255,255,.92)">${escapeXml(initials)}</text>`,
    `</svg>`,
  ].join("");

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Escape XML-sensitive characters that could appear in initials. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
