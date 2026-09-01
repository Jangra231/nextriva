export const PROFILE_AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PROFILE_AVATAR_MAX_BYTES = 3 * 1024 * 1024;

export function validateProfileAvatar(type: string, size: number) {
  if (!PROFILE_AVATAR_MIME_TYPES.includes(type as (typeof PROFILE_AVATAR_MIME_TYPES)[number])) return "Use a JPEG, PNG, or WebP image.";
  if (!Number.isFinite(size) || size <= 0 || size > PROFILE_AVATAR_MAX_BYTES) return "Use an image up to 3MB.";
  return undefined;
}

export function hasProfileAvatarSignature(bytes: Uint8Array, type: string) {
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  if (type === "image/webp") return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

export function isProfileAvatarUrl(value: string, userId: number) {
  return value.startsWith(`/manus-storage/profiles/avatars/${userId}/`) 
    || value.startsWith('data:image/svg+xml');
}
