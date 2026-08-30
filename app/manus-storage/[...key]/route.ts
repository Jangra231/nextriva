import { NextRequest, NextResponse } from "next/server";
import { storageGetSignedUrl } from "../../../server/storage";

export const runtime = "nodejs";

/**
 * The event records store stable /manus-storage/{key} URLs. The previous
 * Express runtime proxied these paths, but the current application runs on
 * Next.js, so this route restores that contract by issuing a short-lived
 * signed redirect for each stored object.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const storageKey = key.join("/");

  if (!storageKey) {
    return new NextResponse("Missing storage key", { status: 400 });
  }

  try {
    const signedUrl = await storageGetSignedUrl(storageKey);
    return NextResponse.redirect(signedUrl, { status: 307 });
  } catch (error) {
    console.error("[StorageDelivery] Could not resolve stored asset", { storageKey, error });
    return new NextResponse("Stored asset is currently unavailable", { status: 502 });
  }
}
