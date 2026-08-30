import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { findUserById } from "./db";

const COOKIE_NAME = "fitizen_session";
const secret = new TextEncoder().encode(process.env.JWT_SECRET || "development-only-secret-change-me");
const sessionCookieOptions = { httpOnly: true, sameSite: "none" as const, secure: true, partitioned: true, path: "/" };

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
}

export async function setSession(userId: number) {
  const token = await new SignJWT({ scope: "fitizen" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret);
  (await cookies()).set(COOKIE_NAME, token, { ...sessionCookieOptions, maxAge: 60 * 60 * 24 * 14 });
}

export async function clearSession() {
  (await cookies()).set(COOKIE_NAME, "", { ...sessionCookieOptions, maxAge: 0, expires: new Date(0) });
}

export async function currentUser() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const userId = Number(payload.sub);
    return Number.isInteger(userId) ? await findUserById(userId) : null;
  } catch {
    return null;
  }
}

export function initials(name: string | null) {
  return (name || "F").split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
}
