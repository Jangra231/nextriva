import { NextResponse } from "next/server";
import { currentUser } from "../../lib/auth";
import { getPaymentBooking } from "../../lib/db";
import { storagePut } from "../../../server/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please log in to upload payment proof." }, { status: 401 });
  const form = await request.formData(); const file = form.get("file"); const orderNumber = typeof form.get("orderNumber") === "string" ? String(form.get("orderNumber")).trim() : "";
  if (!(file instanceof File) || !orderNumber) return NextResponse.json({ error: "Choose an image and confirm your booking." }, { status: 400 });
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type) || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Use a JPEG, PNG, or WebP image up to 5MB." }, { status: 400 });
  const booking = await getPaymentBooking(orderNumber, user.id);
  if (!booking || (booking.registration.paymentStatus !== "pending" && booking.registration.paymentStatus !== "failed")) return NextResponse.json({ error: "This booking cannot accept a proof image." }, { status: 403 });
  try {
    const bytes = Buffer.from(await file.arrayBuffer()); const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const { url } = await storagePut(`payments/proofs/${user.id}/${orderNumber}_${Date.now()}.${extension}`, bytes, file.type);
    return NextResponse.json({ url });
  } catch { return NextResponse.json({ error: "Payment proof upload did not complete. Please try again." }, { status: 500 }); }
}
