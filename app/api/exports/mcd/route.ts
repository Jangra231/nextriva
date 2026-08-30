import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const target = new URL("/api/exports/local-authority", request.url);
  target.search = request.nextUrl.search;
  return NextResponse.redirect(target, 307);
}
