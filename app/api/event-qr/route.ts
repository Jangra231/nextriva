import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { eventSlugFromRegistrationPath, isEventRegistrationPath } from "../../lib/event-qr-image";
import { getPublicEvent } from "../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("target") || "";
  if (!isEventRegistrationPath(target)) return new NextResponse("Invalid QR target", { status: 400 });
  const event = await getPublicEvent(eventSlugFromRegistrationPath(target) || "");
  if (!event) return new NextResponse("Registration QR is available after administrator approval.", { status: 404 });
  const url = `${request.nextUrl.origin}${target}`;
  const image = await QRCode.toBuffer(url, { width: 1100, margin: 1, errorCorrectionLevel: "M", color: { dark: "#153f33", light: "#ffffff" } });
  return new NextResponse(new Uint8Array(image), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" } });
}
