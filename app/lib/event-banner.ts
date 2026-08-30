export const EVENT_BANNER_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const EVENT_BANNER_MAX_BYTES = 5 * 1024 * 1024;

export function validateEventBanner(type: string, size: number) {
  if (!EVENT_BANNER_MIME_TYPES.includes(type as (typeof EVENT_BANNER_MIME_TYPES)[number])) return "Use a JPEG, PNG, or WebP banner.";
  if (!Number.isFinite(size) || size <= 0 || size > EVENT_BANNER_MAX_BYTES) return "Use an event banner up to 5MB.";
  return undefined;
}

export function hasEventBannerSignature(bytes: Uint8Array, type: string) {
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  if (type === "image/webp") return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}
