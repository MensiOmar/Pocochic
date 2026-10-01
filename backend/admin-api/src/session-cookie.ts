import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Context } from "hono";
import { SESSION_COOKIE } from "./env.js";

function safeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  const len = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let i = 0; i < len; i += 1) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}

function b64url(bytes: ArrayBuffer): string {
  const text = btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return text.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function sign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${b64url(sig)}`;
}

export async function readSession(secret: string, token: string | undefined): Promise<boolean> {
  if (!secret || !token) return false;
  const split = token.lastIndexOf(".");
  if (split <= 0) return false;
  const exp = Number(token.slice(0, split));
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = await sign(secret, String(exp));
  return safeEqual(token, expected);
}

export async function issueSession(c: Context, secret: string): Promise<void> {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const token = await sign(secret, String(exp));
  const secure = new URL(c.req.url).protocol === "https:";
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: secure ? "None" : "Lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export function clearSession(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

export function sessionToken(c: Context): string | undefined {
  return getCookie(c, SESSION_COOKIE);
}

export { safeEqual };
