import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isStyleLabEnabled } from "@/lib/dev/is-style-lab-enabled";
import { isWillardLocalMutableEnvironment } from "@/lib/dev/is-willard-local-mutable";
import { isWillardAuthenticated } from "@/lib/dev/style-lab-auth";
import { pullTrustedTextures } from "@/scripts/willard/ingest-shared.mjs";

export const runtime = "nodejs";

const TRUSTED_PROVIDERS = new Set(["ambientcg", "polyhaven", "all-trusted"]);

type PullTexturesRequest = {
  provider?: string;
  category?: string;
  count?: number;
};

export async function POST(request: Request) {
  if (!isStyleLabEnabled()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const cookieStore = await cookies();
  if (!isWillardAuthenticated(cookieStore)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isWillardLocalMutableEnvironment()) {
    return NextResponse.json({ error: "Texture pull is local-only." }, { status: 403 });
  }

  let body: PullTexturesRequest = {};
  try {
    body = (await request.json()) as PullTexturesRequest;
  } catch {
    body = {};
  }

  const provider = String(body.provider || "all-trusted").trim().toLowerCase();
  if (!TRUSTED_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: "Provider must be ambientcg, polyhaven, or all-trusted." }, { status: 400 });
  }

  const count = Math.max(1, Math.min(50, Number(body.count || 10) || 10));
  const category = String(body.category || "texture").trim().toLowerCase();

  try {
    const summary = await pullTrustedTextures({ provider, category, count });
    return NextResponse.json({ ok: true, summary });
  } catch {
    return NextResponse.json({ error: "Texture pull failed." }, { status: 500 });
  }
}
