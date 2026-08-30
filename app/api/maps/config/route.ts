import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.VITE_FRONTEND_FORGE_API_KEY;
  const baseUrl = process.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.butterfly-effect.dev";
  if (!apiKey) return NextResponse.json({ error: "Map configuration is unavailable" }, { status: 503 });
  return NextResponse.json({ scriptUrl: `${baseUrl}/v1/maps/proxy/maps/api/js?key=${apiKey}&v=weekly&libraries=marker,places,geocoding,geometry` });
}
