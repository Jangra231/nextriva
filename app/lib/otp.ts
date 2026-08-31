import { and, desc, eq, isNull } from "drizzle-orm";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { otpVerifications } from "../../drizzle/schema";
import { db } from "./db";

const OTP_TTL_MINUTES = 15;

function hashCode(code: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(code, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyCode(code: string, stored: string): boolean {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(code, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
}

export async function createOtp(phone: string, purpose: "signup" | "login" | "password_reset"): Promise<string> {
  // Delete any existing OTP for this phone/purpose
  await db().delete(otpVerifications).where(and(eq(otpVerifications.phone, phone), eq(otpVerifications.purpose, purpose)));

  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit code
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await db().insert(otpVerifications).values({ phone, codeHash, purpose, expiresAt });

  return code;
}

export async function verifyOtp(
  phone: string,
  code: string,
  purpose: "signup" | "login" | "password_reset"
): Promise<boolean> {
  const rows = await db()
    .select()
    .from(otpVerifications)
    .where(and(eq(otpVerifications.phone, phone), eq(otpVerifications.purpose, purpose), isNull(otpVerifications.consumedAt)))
    .orderBy(desc(otpVerifications.createdAt))
    .limit(1);

  const record = rows[0];
  if (!record) return false;
  if (new Date(record.expiresAt) < new Date()) return false;

  const valid = verifyCode(code, record.codeHash);
  if (valid) {
    await db().update(otpVerifications).set({ consumedAt: new Date() }).where(eq(otpVerifications.id, record.id));
  }
  return valid;
}