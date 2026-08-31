import { desc, eq, isNull, and } from "drizzle-orm";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { passwordResets } from "../../drizzle/schema";
import { db } from "./db";
import { sendEmail } from "./email";

const TOKEN_TTL_HOURS = 1;

function hashCode(token: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(token, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyToken(token: string, stored: string): boolean {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(token, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
}

export async function createPasswordResetToken(userId: number): Promise<string> {
  // Delete any existing reset tokens for this user
  await db().delete(passwordResets).where(eq(passwordResets.userId, userId));

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashCode(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);

  await db().insert(passwordResets).values({ userId, tokenHash, expiresAt });

  return token;
}

export async function verifyPasswordResetToken(userId: number, token: string): Promise<boolean> {
  const rows = await db()
    .select()
    .from(passwordResets)
    .where(and(eq(passwordResets.userId, userId), isNull(passwordResets.consumedAt)))
    .orderBy(desc(passwordResets.createdAt))
    .limit(1);

  const record = rows[0];
  if (!record) return false;
  if (new Date(record.expiresAt) < new Date()) return false;

  const valid = verifyToken(token, record.tokenHash);
  if (valid) {
    await db().update(passwordResets).set({ consumedAt: new Date() }).where(eq(passwordResets.id, record.id));
  }
  return valid;
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  return sendEmail({
    to: email,
    subject: "Reset your Nexriva password",
    text: `Click the link below to reset your password. This link expires in 1 hour.\n\n${resetUrl}\n\nIf you didn't request this, please ignore this email.`,
    html: `
      <p>You requested a password reset for your Nexriva account.</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#f65f4a;color:white;border-radius:10px;text-decoration:none;font-weight:bold;">Reset Password</a></p>
      <p style="color:#666;font-size:13px;">Or copy this link: ${resetUrl}</p>
      <p style="color:#666;font-size:13px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
    `,
  });
}