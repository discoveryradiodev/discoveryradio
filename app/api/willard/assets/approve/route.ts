import { promises as fs } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isStyleLabEnabled } from "@/lib/dev/is-style-lab-enabled";
import { isWillardLocalMutableEnvironment } from "@/lib/dev/is-willard-local-mutable";
import { isWillardAuthenticated } from "@/lib/dev/style-lab-auth";
import {
  folderForCategory,
  normalizePublicAssetPath,
  readWillardManifest,
  resolveAssetAbsolutePath,
  writeWillardManifest,
} from "@/lib/dev/willard-asset-manifest";
import { normalizeAssetCategory, type WillardAssetCategory } from "@/lib/dev/willard-assets";

export const runtime = "nodejs";

const PUBLIC_ROOT = path.resolve(process.cwd(), "public");
const INBOX_PREFIX = "/willard-assets-inbox/";

type ApproveAssetRequest = {
  localPath?: string;
  optimizedLocalPath?: string;
  pathname?: string;
  url?: string;
  sourceKind?: string;
  category?: string;
  actor?: string;
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
    return NextResponse.json({ error: "Approve is local-only." }, { status: 403 });
  }

  let body: ApproveAssetRequest;
  try {
    body = (await request.json()) as ApproveAssetRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const localPath = pickLocalPath(body);
  if (!localPath) {
    return NextResponse.json({ error: "Valid localPath/pathname is required." }, { status: 400 });
  }

  const selectedCategory = normalizeApprovalCategory(body.category);
  const targetFolder = folderForApprovedCategory(selectedCategory);

  const manifest = await readWillardManifest();
  const now = new Date().toISOString();
  const actor = sanitizeActor(body.actor) ?? "local-user";

  const index = manifest.assets.findIndex(
    (item) => normalizeWillardPath(item.localPath).toLowerCase() === localPath.toLowerCase()
  );

  const existing = index >= 0 ? manifest.assets[index] : null;

  let nextLocalPath = localPath;
  if (body.sourceKind === "project-public" || localPath.startsWith("/willard-assets/") || localPath.startsWith(INBOX_PREFIX)) {
    nextLocalPath = await maybeMoveLocalAsset(localPath, targetFolder);
  }

  const filename = path.basename(nextLocalPath);

  const nextRecord = {
    ...(existing ?? {}),
    localPath: nextLocalPath,
    filename,
    originalFilename: existing?.originalFilename ?? filename,
    category: selectedCategory,
    suggestedCategory: selectedCategory,
    status: "approved",
    reviewRequired: false,
    approvedAt: now,
    approvedBy: actor,
    deniedAt: undefined,
    deniedBy: undefined,
    rejectionReason: undefined,
    importedAt: existing?.importedAt ?? now,
    createdAt: existing?.createdAt ?? now,
  };

  if (index >= 0) {
    manifest.assets[index] = nextRecord;
  } else {
    manifest.assets.push(nextRecord);
  }

  await writeWillardManifest(manifest);

  return NextResponse.json({
    ok: true,
    asset: {
      localPath: nextRecord.localPath,
      category: nextRecord.category,
      status: nextRecord.status,
      reviewRequired: nextRecord.reviewRequired,
      approvedAt: nextRecord.approvedAt,
      approvedBy: nextRecord.approvedBy,
    },
  });
}

function pickLocalPath(body: ApproveAssetRequest): string {
  const optimized = normalizeWillardPath(body.optimizedLocalPath);
  if (optimized) {
    return optimized;
  }

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

function normalizeApprovalCategory(value: string | undefined): WillardAssetCategory {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "paper") {
    return "paper";
  }
  return normalizeAssetCategory(raw);
}

async function maybeMoveLocalAsset(localPath: string, folder: string): Promise<string> {
  const currentAbs = resolveWillardMutableAbsolutePath(localPath);
  if (!currentAbs) {
    return localPath;
  }

  try {
    await fs.access(currentAbs);
  } catch {
    return localPath;
  }

  const currentDir = path.basename(path.dirname(currentAbs)).toLowerCase();
  if (currentDir === folder.toLowerCase()) {
    return localPath;
  }

  const destinationDir = path.resolve(PUBLIC_ROOT, "willard-assets", folder);
  await fs.mkdir(destinationDir, { recursive: true });

  const extension = path.extname(currentAbs);
  const base = path.basename(currentAbs, extension);
  let attempt = 0;

  while (attempt < 500) {
    const name = attempt === 0 ? `${base}${extension}` : `${base}-${attempt}${extension}`;
    const destinationAbs = path.join(destinationDir, name);
    try {
      await fs.access(destinationAbs);
      attempt += 1;
      continue;
    } catch {
      await fs.rename(currentAbs, destinationAbs);
      const rel = path.relative(PUBLIC_ROOT, destinationAbs).replace(/\\/g, "/");
      return `/${rel}`;
    }
  }

  return localPath;
}

function resolveWillardMutableAbsolutePath(localPath: string): string | null {
  const assetPath = normalizePublicAssetPath(localPath);
  if (assetPath) {
    return resolveAssetAbsolutePath(assetPath);
  }

  const inboxPath = normalizeWillardPath(localPath);
  if (!inboxPath || !inboxPath.startsWith(INBOX_PREFIX)) {
    return null;
  }

  const resolved = path.resolve(PUBLIC_ROOT, inboxPath.slice(1));
  const inboxRoot = path.resolve(PUBLIC_ROOT, "willard-assets-inbox");
  if (!resolved.toLowerCase().startsWith((inboxRoot + path.sep).toLowerCase()) && resolved.toLowerCase() !== inboxRoot.toLowerCase()) {
    return null;
  }

  return resolved;
}

function folderForApprovedCategory(category: WillardAssetCategory): string {
  switch (category) {
    case "background":
      return "backgrounds";
    case "texture":
      return "textures";
    case "paper":
      return "paper";
    case "overlay":
      return "overlays";
    case "tape":
      return "tape";
    case "sticker":
      return "stickers";
    case "frame":
      return "frames";
    case "edge":
      return "edges";
    case "callout":
      return "callouts";
    case "shape":
      return "shapes";
    case "mask":
      return "masks";
    case "module-frame":
      return "module-frames";
    default:
      return folderForCategory(category);
  }
}

function sanitizeActor(value: string | undefined): string | undefined {
  const raw = String(value || "").trim();
  if (!raw) {
    return undefined;
  }
  return raw.slice(0, 120);
}
