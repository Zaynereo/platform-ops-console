import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import type Database from "better-sqlite3";
import { DEMO_CREDENTIALS, DEMO_SESSION_SECRET } from "./config.js";
import type { SessionUser } from "@platform-ops/shared";

const SESSION_COOKIE = "ops_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export function verifyDemoPassword(email: string, password: string): boolean {
  const emailOk = timingSafeEqualStr(email, DEMO_CREDENTIALS.email);
  const passOk = timingSafeEqualStr(password, DEMO_CREDENTIALS.password);
  return emailOk && passOk;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function createSessionToken(): string {
  return randomBytes(24).toString("hex");
}

export function persistSession(db: Database.Database, token: string, user: SessionUser): void {
  const created = new Date().toISOString();
  const expires = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare(
    `INSERT OR REPLACE INTO sessions (token, email, display_name, created_at, expires_at) VALUES (?, ?, ?, ?, ?)`
  ).run(token, user.email, user.displayName, created, expires);
}

export function clearSession(db: Database.Database, token: string): void {
  db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
}

export function getSessionUser(db: Database.Database, token: string | undefined): SessionUser | null {
  if (!token) return null;
  const row = db
    .prepare(`SELECT email, display_name, expires_at FROM sessions WHERE token = ?`)
    .get(token) as { email: string; display_name: string; expires_at: string } | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
    return null;
  }
  return { email: row.email, displayName: row.display_name };
}

export function setSessionCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    signed: true,
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function readSessionToken(request: FastifyRequest): string | undefined {
  const signed = request.cookies[SESSION_COOKIE];
  if (!signed) return undefined;
  const unsigned = request.unsignCookie(signed);
  if (!unsigned.valid) return undefined;
  return unsigned.value;
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { getDb } = await import("./db.js");
  const user = getSessionUser(getDb(), readSessionToken(request));
  if (!user) {
    return reply.code(401).send({ error: "Unauthorized", message: "Valid demo session required." });
  }
  request.user = user;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: SessionUser;
  }
}

export function signPayload(payload: string): string {
  return createHmac("sha256", DEMO_SESSION_SECRET).update(payload).digest("hex");
}
