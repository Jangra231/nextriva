import { NextResponse } from "next/server";
import { currentUser } from "../../lib/auth";
import { hasEventBannerSignature, validateEventBanner } from "../../lib/event-banner";
import { storagePut } from "../../../server/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please log in to upload an image." }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No image selected." }, { status: 400 });
  const validationError = validateEventBanner(file.type, file.size);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasEventBannerSignature(bytes, file.type)) return NextResponse.json({ error: "The selected file is not a valid image." }, { status: 400 });
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const { url } = await storagePut(`events/covers/${user.id}/${Date.now()}.${extension}`, bytes, file.type);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Image upload did not complete. Please try again." }, { status: 500 });
  }
}
