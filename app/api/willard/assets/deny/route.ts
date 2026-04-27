import { promises as fs } from "node:fs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isStyleLabEnabled } from "@/lib/dev/is-style-lab-enabled";
import { isWillardLocalMutableEnvironment } from "@/lib/dev/is-willard-local-mutable";
import { isWillardAuthenticated } from "@/lib/dev/style-lab-auth";
import { normalizePublicAssetPath, readWillardManifest, resolveAssetAbsolutePath, writeWillardManifest } from "@/lib/dev/willard-asset-manifest";

export const runtime = "nodejs";

type DenyAssetRequest = {
  localPath?: string;
  pathname?: string;
  url?: string;
  sourceKind?: string;
  actor?: string;
  reason?: string;
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
    return NextResponse.json({ error: "Deny is local-only." }, { status: 403 });
  }

  let body: DenyAssetRequest;
  try {
    body = (await request.json()) as DenyAssetRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const localPath = pickLocalPath(body);
  if (!localPath) {
    return NextResponse.json({ error: "Valid localPath/pathname is required." }, { status: 400 });
  }

  const manifest = await readWillardManifest();
  const now = new Date().toISOString();
  const actor = sanitizeActor(body.actor) ?? "local-user";
  const reason = String(body.reason || "").trim() || "Denied by curator";

  const index = manifest.assets.findIndex(
    (item) => normalizePublicAssetPath(item.localPath).toLowerCase() === localPath.toLowerCase()
  );
  const existing = index >= 0 ? manifest.assets[index] : null;

  const absolutePath = resolveAssetAbsolutePath(localPath);
  const isLocalProjectAsset = body.sourceKind === "project-public" || localPath.startsWith("/willard-assets/");

  if (isLocalProjectAsset && absolutePath) {
    try {
      await fs.unlink(absolutePath);
    } catch {
      // Keep tombstone even when local file removal fails.
    }
  }

  const tombstone = {
    ...(existing ?? {}),
    localPath,
    filename: existing?.filename ?? localPath.split("/").pop() ?? "asset",
    originalFilename: existing?.originalFilename ?? existing?.filename ?? localPath.split("/").pop() ?? "asset",
    status: "denied",
    reviewRequired: false,
    deniedAt: now,
    deniedBy: actor,
    rejectionReason: reason,
    createdAt: existing?.createdAt ?? existing?.importedAt ?? now,
    importedAt: existing?.importedAt ?? now,
  };

  if (index >= 0) {
    manifest.assets[index] = tombstone;
  } else {
    manifest.assets.push(tombstone);
  }

  await writeWillardManifest(manifest);

  return NextResponse.json({
    ok: true,
    denied: {
      localPath,
      status: "denied",
      deniedAt: now,
      deniedBy: actor,
      rejectionReason: reason,
    },
  });
}

function pickLocalPath(body: DenyAssetRequest): string {
  const direct = normalizePublicAssetPath(body.localPath || body.pathname);
  if (direct) {
    return direct;
  }

  const url = String(body.url || "").trim();
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    return normalizePublicAssetPath(parsed.pathname);
  } catch {
    return normalizePublicAssetPath(url);
  }
}

function sanitizeActor(value: string | undefined): string | undefined {
  const raw = String(value || "").trim();
  if (!raw) {
    return undefined;
  }
  return raw.slice(0, 120);
}
