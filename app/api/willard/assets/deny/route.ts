import { promises as fs } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isStyleLabEnabled } from "@/lib/dev/is-style-lab-enabled";
import { isWillardLocalMutableEnvironment } from "@/lib/dev/is-willard-local-mutable";
import { isWillardAuthenticated } from "@/lib/dev/style-lab-auth";
import { normalizePublicAssetPath, readWillardManifest, resolveAssetAbsolutePath, writeWillardManifest } from "@/lib/dev/willard-asset-manifest";

export const runtime = "nodejs";

const PUBLIC_ROOT = path.resolve(process.cwd(), "public");
const INBOX_PREFIX = "/willard-assets-inbox/";

type DenyAssetRequest = {
  localPath?: string;
  pathname?: string;
  url?: string;
  optimizedPath?: string;
  thumbnailPath?: string;
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
  const index = manifest.assets.findIndex(
    (item) => normalizeWillardPath(item.localPath).toLowerCase() === localPath.toLowerCase()
  );
  const existing = index >= 0 ? manifest.assets[index] : null;

  const candidatePaths = collectCandidatePaths(body, existing, localPath);
  const deletedPaths: string[] = [];
  const failedDeletes: Array<{ path: string; error: string }> = [];

  for (const candidatePath of candidatePaths) {
    const absolutePath = resolveWillardMutableAbsolutePath(candidatePath);
    if (!absolutePath) {
      failedDeletes.push({ path: candidatePath, error: "Path is outside allowed directories." });
      continue;
    }

    try {
      await fs.unlink(absolutePath);
      deletedPaths.push(candidatePath);
    } catch (error) {
      failedDeletes.push({ path: candidatePath, error: toErrorMessage(error) });
    }
  }

  const removedFromManifest = index >= 0;
  if (removedFromManifest) {
    manifest.assets.splice(index, 1);
    await writeWillardManifest(manifest);
  }

  return NextResponse.json({
    ok: true,
    deleted: {
      localPath,
      deletedPaths,
      failedDeletes,
      removedFromManifest,
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

function collectCandidatePaths(
  body: DenyAssetRequest,
  existing: {
    localPath?: string;
    optimizedPath?: string;
    thumbnailPath?: string;
    sourceUrl?: string;
    originalStorage?: string;
    originalFilename?: string;
  } | null,
  requestedLocalPath: string
): string[] {
  const rawCandidates = [
    requestedLocalPath,
    normalizeWillardPath(body.localPath),
    normalizeWillardPath(body.pathname),
    parseLocalPathFromUrl(body.url),
    normalizeWillardPath(body.optimizedPath),
    normalizeWillardPath(body.thumbnailPath),
    normalizeWillardPath(existing?.localPath),
    normalizeWillardPath(existing?.optimizedPath),
    normalizeWillardPath(existing?.thumbnailPath),
    extractInboxPathFromSourceUrl(existing?.sourceUrl),
    existing?.originalStorage === "local-inbox"
      ? normalizeWillardPath(`${INBOX_PREFIX}${String(existing.originalFilename || "").trim()}`)
      : "",
  ];

  const deduped: string[] = [];
  const seen = new Set<string>();

  for (const candidate of rawCandidates) {
    if (!candidate) {
      continue;
    }
    const key = candidate.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(candidate);
  }

  return deduped;
}

function parseLocalPathFromUrl(value: string | undefined): string {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  try {
    const parsed = new URL(raw);
    return normalizeWillardPath(parsed.pathname);
  } catch {
    return normalizeWillardPath(raw);
  }
}

function extractInboxPathFromSourceUrl(value: string | undefined): string {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  const inboxUrlPrefix = "inbox://local/";
  if (raw.toLowerCase().startsWith(inboxUrlPrefix)) {
    const relativePath = raw.slice(inboxUrlPrefix.length).trim();
    if (!relativePath) {
      return "";
    }
    return normalizeWillardPath(`${INBOX_PREFIX}${relativePath}`);
  }

  return normalizeWillardPath(raw);
}

function resolveWillardMutableAbsolutePath(localPath: string): string | null {
  const normalizedPath = normalizeWillardPath(localPath);
  if (!normalizedPath) {
    return null;
  }

  const normalAssetPath = normalizePublicAssetPath(normalizedPath);
  if (normalAssetPath) {
    const assetAbsolutePath = resolveAssetAbsolutePath(normalAssetPath);
    if (assetAbsolutePath && isWithinAllowedRoot(assetAbsolutePath, path.resolve(PUBLIC_ROOT, "willard-assets"))) {
      return assetAbsolutePath;
    }
    return null;
  }

  const resolved = path.resolve(PUBLIC_ROOT, normalizedPath.slice(1));
  if (
    !isWithinAllowedRoot(resolved, path.resolve(PUBLIC_ROOT, "willard-assets")) &&
    !isWithinAllowedRoot(resolved, path.resolve(PUBLIC_ROOT, "willard-assets-inbox"))
  ) {
    return null;
  }

  return resolved;
}

function isWithinAllowedRoot(value: string, root: string): boolean {
  const normalizedValue = value.toLowerCase();
  const normalizedRoot = root.toLowerCase();
  return normalizedValue === normalizedRoot || normalizedValue.startsWith(`${normalizedRoot}${path.sep.toLowerCase()}`);
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Unable to delete file.";
}
