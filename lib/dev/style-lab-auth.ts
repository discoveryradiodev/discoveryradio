import { createHash } from "node:crypto";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

export const WILLARD_AUTH_COOKIE = "willard_auth";

const AUTH_COOKIE_SALT = "willard-style-lab-auth-v1";

function getWillardPassword(): string {
  return process.env.WILLARD_PASSWORD ?? "";
}

function createAuthToken(password: string): string {
  return createHash("sha256")
    .update(`${AUTH_COOKIE_SALT}:${password}`)
    .digest("hex");
}

export function isValidWillardPassword(input: string): boolean {
  const configured = getWillardPassword();
  if (!configured) return false;
  return input === configured;
}

export function getWillardAuthCookieValue(): string {
  const configured = getWillardPassword();
  if (!configured) return "";
  return createAuthToken(configured);
}

export function isWillardAuthenticated(cookieStore: ReadonlyRequestCookies): boolean {
  const expected = getWillardAuthCookieValue();
  if (!expected) return false;
  const cookie = cookieStore.get(WILLARD_AUTH_COOKIE)?.value;
  return cookie === expected;
}
