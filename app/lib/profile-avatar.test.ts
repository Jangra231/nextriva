import { describe, expect, it } from "vitest";
import { hasProfileAvatarSignature, isProfileAvatarUrl, validateProfileAvatar } from "./profile-avatar";

describe("profile avatar validation", () => {
  it("accepts allowed image metadata within the avatar size limit", () => {
    expect(validateProfileAvatar("image/png", 200_000)).toBeUndefined();
  });

  it("rejects unsupported media types and oversized payloads", () => {
    expect(validateProfileAvatar("image/svg+xml", 200)).toMatch(/JPEG/);
    expect(validateProfileAvatar("image/jpeg", 3 * 1024 * 1024 + 1)).toMatch(/3MB/);
  });

  it("recognizes valid PNG image bytes and user-scoped stored avatar URLs", () => {
    expect(hasProfileAvatarSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png")).toBe(true);
    expect(isProfileAvatarUrl("/manus-storage/profiles/avatars/42/avatar.png", 42)).toBe(true);
    expect(isProfileAvatarUrl("/manus-storage/profiles/avatars/41/avatar.png", 42)).toBe(false);
  });

  it("accepts preset emoji avatar data URIs", () => {
    const dataUri = 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3C%2Fsvg%3E';
    expect(isProfileAvatarUrl(dataUri, 42)).toBe(true);
    expect(isProfileAvatarUrl("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=", 42)).toBe(true);
  });
});
