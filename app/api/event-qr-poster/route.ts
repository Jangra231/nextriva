import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { eventQrPosterFilename, eventSlugFromRegistrationPath, isEventRegistrationPath } from "../../lib/event-qr-image";
import { getPublicEvent } from "../../lib/db";

export const dynamic = "force-dynamic";

const escapeXml = (value: string) => value.replace(/[<>&"']/g, character => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character] || character);

function posterLines(eventName: string) {
  const words = eventName.trim().split(/\s+/).filter(Boolean); const lines: string[] = []; let line = "";
  words.forEach(word => { const next = line ? `${line} ${word}` : word; if (next.length > 24 && line) { lines.push(line); line = word; } else line = next; });
  if (line) lines.push(line); return lines.slice(0, 3);
}

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("target") || "";
  if (!isEventRegistrationPath(target)) return new NextResponse("Invalid QR target", { status: 400 });
  const event = await getPublicEvent(eventSlugFromRegistrationPath(target) || "");
  if (!event) return new NextResponse("Registration QR is available after administrator approval.", { status: 404 });
  const eventName = event.event.displayName.trim().slice(0, 120) || "Fitizen event";
  const registrationUrl = `${request.nextUrl.origin}${target}`;
  const qrData = await QRCode.toDataURL(registrationUrl, { width: 1200, margin: 1, errorCorrectionLevel: "M", color: { dark: "#153f33", light: "#ffffff" } });
  const title = posterLines(eventName).map((line, index) => `<text x="120" y="${570 + index * 126}" fill="#153f33" font-family="Arial, sans-serif" font-size="104" font-weight="800">${escapeXml(line)}</text>`).join("");
  const poster = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="2400" viewBox="0 0 1800 2400"><rect width="1800" height="2400" fill="#f7f7f0"/><rect width="1800" height="74" fill="#153f33"/><circle cx="150" cy="210" r="54" fill="#ff684f"/><text x="230" y="232" fill="#153f33" font-family="Arial, sans-serif" font-size="66" font-weight="800">fitizen</text><text x="120" y="400" fill="#5b6d66" font-family="Arial, sans-serif" font-size="31" font-weight="700">EVENT REGISTRATION</text>${title}<text x="120" y="980" fill="#ff684f" font-family="Arial, sans-serif" font-size="58" font-weight="800">SCAN TO REGISTER</text><text x="120" y="1050" fill="#5b6d66" font-family="Arial, sans-serif" font-size="37">Use your camera to open the event registration page.</text><rect x="264" y="1164" width="1272" height="1272" rx="44" fill="#fff"/><image href="${qrData}" x="310" y="1210" width="1180" height="1180"/><text x="120" y="2240" fill="#153f33" font-family="Arial, sans-serif" font-size="32" font-weight="700">Registration is securely embedded in this QR code.</text><text x="120" y="2310" fill="#7c8d86" font-family="Arial, sans-serif" font-size="28">Powered by Fitizen</text></svg>`;
  return new NextResponse(poster, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Content-Disposition": `attachment; filename="${eventQrPosterFilename(eventName)}"`, "Cache-Control": "no-store" } });
}
