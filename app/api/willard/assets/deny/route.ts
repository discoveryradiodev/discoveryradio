import { promises as fs } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isStyleLabEnabled } from "@/lib/dev/is-style-lab-enabled";
import { isWillardLocalMutableEnvironment } from "@/lib/dev/is-willard-local-mutable";
import { isWillardAuthenticated } from "@/lib/dev/style-lab-auth";
import { normalizePublicAssetPath, readWillardManifest, resolveAssetAbsolutePath, writeWillardManifest } from "@/lib/dev/willard-asset-manifest";

export const runtime = "nodejs";

const PUBLIC_ROOT = process.cwd();
const INBOX_PREFIX = "/willard-assets-inbox/";

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

  const absolutePath = resolveWillardMutableAbsolutePath(localPath);
  const isInboxAsset = localPath.startsWith(INBOX_PREFIX);
  const isLocalProjectAsset = body.sourceKind === "project-public" || localPath.startsWith("/willard-assets/") || isInboxAsset;

  if (isLocalProjectAsset && absolutePath) {
    try {
      await fs.unlink(absolutePath);
    } catch {
      // Keep tombstone even when local file removal fails.
    }
  }

  if (isInboxAsset) {
    if (index >= 0) {
      manifest.assets.splice(index, 1);
      await writeWillardManifest(manifest);
    }

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
  const direct = normalizeWillardPath(body.localPath || body.pathname);
  if (direct) {
    return direct;
  }

  const url = String(body.url || "").trim();
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    return normalizeWillardPath(parsed.pathname);
  } catch {
    return normalizeWillardPath(url);
  }
}

function normalizeWillardPath(value: string | undefined): string {
  const normalizedAssetPath = normalizePublicAssetPath(value);
  if (normalizedAssetPath) {
    return normalizedAssetPath;
  }

  const input = String(value || "").trim().replace(/\\/g, "/");
  if (!input) {
    return "";
  }
  const normalized = input.startsWith("/") ? input : `/${input}`;
  if (!normalized.startsWith(INBOX_PREFIX)) {
    return "";
  }
  return normalized;
}

function resolveWillardMutableAbsolutePath(localPath: string): string | null {
  const normalAssetPath = normalizePublicAssetPath(localPath);
  if (normalAssetPath) {
    return resolveAssetAbsolutePath(normalAssetPath);
  }

  const inboxPath = normalizeWillardPath(localPath);
  if (!inboxPath || !inboxPath.startsWith(INBOX_PREFIX)) {
    return null;
  }

  const publicRoot = path.resolve(PUBLIC_ROOT, "public");
  const inboxRoot = path.resolve(publicRoot, "willard-assets-inbox");
  const resolved = path.resolve(publicRoot, inboxPath.slice(1));
  if (!resolved.toLowerCase().startsWith((inboxRoot + path.sep).toLowerCase()) && resolved.toLowerCase() !== inboxRoot.toLowerCase()) {
    return null;
  }
  return resolved;
}

function sanitizeActor(value: string | undefined): string | undefined {
  const raw = String(value || "").trim();
  if (!raw) {
    return undefined;
  }
  return raw.slice(0, 120);
}
