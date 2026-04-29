import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isStyleLabEnabled } from "@/lib/dev/is-style-lab-enabled";
import { isWillardLocalMutableEnvironment } from "@/lib/dev/is-willard-local-mutable";
import { isWillardAuthenticated } from "@/lib/dev/style-lab-auth";
import { ingestInbox } from "@/scripts/willard/ingest-shared.mjs";

export const runtime = "nodejs";

type IngestInboxRequest = {
  limit?: number;
  category?: string;
  move?: boolean;
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
    return NextResponse.json({ error: "Inbox import is local-only." }, { status: 403 });
  }

  let body: IngestInboxRequest = {};
  try {
    body = (await request.json()) as IngestInboxRequest;
  } catch {
    body = {};
  }

  try {
    const summary = await ingestInbox({
      dryRun: false,
      move: Boolean(body.move),
      limit: Number(body.limit || 0) || 0,
      category: String(body.category || "").trim(),
    });

    return NextResponse.json({ ok: true, summary });
  } catch {
    return NextResponse.json({ error: "Inbox import failed." }, { status: 500 });
  }
}
