import { NextResponse } from "next/server";
import { isStyleLabEnabled } from "@/lib/dev/is-style-lab-enabled";
import {
  getWillardAuthCookieValue,
  isValidWillardPassword,
  WILLARD_AUTH_COOKIE,
} from "@/lib/dev/style-lab-auth";

function getCookieBaseOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export async function POST(request: Request) {
  if (!isStyleLabEnabled()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "login");

  if (intent === "logout") {
    const response = NextResponse.redirect(new URL("/willard", request.url));
    response.cookies.set(WILLARD_AUTH_COOKIE, "", {
      ...getCookieBaseOptions(),
      maxAge: 0,
    });
    return response;
  }

  const password = String(formData.get("password") ?? "");
  if (!isValidWillardPassword(password)) {
    return NextResponse.redirect(new URL("/willard?error=invalid", request.url));
  }

  const response = NextResponse.redirect(new URL("/willard", request.url));
  response.cookies.set(WILLARD_AUTH_COOKIE, getWillardAuthCookieValue(), {
    ...getCookieBaseOptions(),
    maxAge: 60 * 60 * 24 * 14,
  });
  return response;
}
