import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { hasEventBannerSignature, validateEventBanner } from "./event-banner";
import { eventSlugFromRegistrationPath } from "./event-qr-image";

describe("event banner and approval-gated QR contracts", () => {
  it("validates supported banner images by MIME, size, and signature", () => {
    expect(validateEventBanner("image/png", 200)).toBeUndefined();
    expect(validateEventBanner("image/gif", 200)).toContain("JPEG");
    expect(validateEventBanner("image/png", 5 * 1024 * 1024 + 1)).toContain("5MB");
    expect(hasEventBannerSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png")).toBe(true);
    expect(hasEventBannerSignature(new Uint8Array([1, 2, 3]), "image/png")).toBe(false);
  });

  it("derives only a safe event slug from a registration QR path", () => {
    expect(eventSlugFromRegistrationPath("/events/community-run/register")).toBe("community-run");
    expect(eventSlugFromRegistrationPath("/events/unsafe%2Fpath/register")).toBeUndefined();
  });

  it("requires native banner submission and server-approved event lookup before QR output is exposed", async () => {
    const root = process.cwd();
    const [cover, actions, imageRoute, posterRoute, wizard, card, autosaveForm] = await Promise.all([
      readFile(path.join(root, "app/components/CoverUpload.tsx"), "utf8"),
      readFile(path.join(root, "app/actions.ts"), "utf8"),
      readFile(path.join(root, "app/api/event-qr/route.ts"), "utf8"),
      readFile(path.join(root, "app/api/event-qr-poster/route.ts"), "utf8"),
      readFile(path.join(root, "app/dashboard/manage-events/create-event/[eventId]/page.tsx"), "utf8"),
      readFile(path.join(root, "app/components/EventCard.tsx"), "utf8"),
      readFile(path.join(root, "app/components/AutoSaveForm.tsx"), "utf8"),
    ]);
    expect(cover).toContain('name="coverFile"');
    expect(autosaveForm).toContain('encType="multipart/form-data"');
    expect(cover).toContain("CoverCropper");
    expect(cover).toContain("onDrop");
    expect(cover).toContain("Cropped banner ready");
    expect(cover).not.toContain('fetch("/api/uploads"');
    expect(actions).toContain('const coverFile = formData.get("coverFile")');
    expect(actions).toContain("hasEventBannerSignature(bytes, coverFile.type)");
    expect(imageRoute).toContain("await getPublicEvent(eventSlugFromRegistrationPath(target) || \"\")");
    expect(posterRoute).toContain("await getPublicEvent(eventSlugFromRegistrationPath(target) || \"\")");
    expect(wizard).toContain("const qrAvailable = effectiveModerationStatus");
    expect(wizard).toContain("Registration QR pending approval");
    expect(card).toContain('registrationQrAvailable />');
  });
});
