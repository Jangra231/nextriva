import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./env";

const COOKIE_NAME = "fitizen_session";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const CRON_OPEN_ID_PREFIX = "cron_";

export type AuthenticatedUser = { id: number; openId: string; name: string | null; email: string | null; loginMethod: string | null; role: "user"; createdAt: Date; updatedAt: Date; lastSignedIn: Date; taskUid?: string; isCron?: boolean };

class SchedulerSdk {
  private secret() { return new TextEncoder().encode(ENV.cookieSecret); }

  async createSessionToken(openId: string, options: { expiresInMs?: number; name?: string; taskUid?: string } = {}) {
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    return new SignJWT({ openId, appId: ENV.appId, name: options.name || "", taskUid: options.taskUid }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(Math.floor((Date.now() + expiresInMs) / 1000)).sign(this.secret());
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    const cookies = parseCookieHeader(req.headers.cookie || "");
    const authHeader = req.headers.authorization;
    const token = cookies[COOKIE_NAME] || (typeof authHeader === "string" && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined);
    if (!token) throw new Error("Scheduled request authentication is missing");
    const { payload } = await jwtVerify(token, this.secret(), { algorithms: ["HS256"] });
    const openId = typeof payload.openId === "string" ? payload.openId : "";
    if (!openId.startsWith(CRON_OPEN_ID_PREFIX)) throw new Error("Cron authentication required");
    const now = new Date();
    return { id: -1, openId, name: typeof payload.name === "string" ? payload.name : "Scheduled task", email: null, loginMethod: null, role: "user", createdAt: now, updatedAt: now, lastSignedIn: now, taskUid: typeof payload.taskUid === "string" ? payload.taskUid : undefined, isCron: true };
  }
}

export const sdk = new SchedulerSdk();
