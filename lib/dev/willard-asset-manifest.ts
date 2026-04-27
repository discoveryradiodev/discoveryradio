import { promises as fs } from "node:fs";
import path from "node:path";
import type { WillardAssetCategory, WillardAssetDominantKind, WillardAssetStatus } from "@/lib/dev/willard-assets";

export const WILLARD_ASSET_MANIFEST_VERSION = 3;
export const WILLARD_ASSET_ROOT = path.join(process.cwd(), "public", "willard-assets");
export const WILLARD_ASSET_MANIFEST_PATH = path.join(WILLARD_ASSET_ROOT, "willard-asset-manifest.json");

export type WillardManifestAsset = {
  sourceUrl?: string;
  provider?: string;
  license?: string;
  licenseUrl?: string;
  author?: string;
  localPath: string;
  filename: string;
  originalFilename?: string;
  importedAt?: string;
  createdAt?: string;
  approvedAt?: string;
  deniedAt?: string;
  approvedBy?: string;
  deniedBy?: string;
  category?: string;
  suggestedCategory?: string;
  status?: string;
  reviewRequired?: boolean;
  curatorNotes?: string;
  rejectionReason?: string;
  query?: string;
  width?: number;
  height?: number;
  hasAlpha?: boolean;
  dominantKind?: string;
  qualityScore?: number;
};

export type WillardManifest = {
  version: number;
  assets: WillardManifestAsset[];
};

export type NormalizedManifestAsset = Omit<WillardManifestAsset, "status" | "dominantKind" | "category" | "suggestedCategory"> & {
  status: WillardAssetStatus;
  dominantKind: WillardAssetDominantKind;
  category: WillardAssetCategory;
  suggestedCategory?: WillardAssetCategory;
};

export async function readWillardManifest(): Promise<WillardManifest> {
  try {
    const raw = await fs.readFile(WILLARD_ASSET_MANIFEST_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<WillardManifest>;
    const assets = Array.isArray(parsed.assets) ? parsed.assets.map(migrateManifestAsset) : [];
    return {
      version: WILLARD_ASSET_MANIFEST_VERSION,
      assets,
    };
  } catch {
    return {
      version: WILLARD_ASSET_MANIFEST_VERSION,
      assets: [],
    };
  }
}

export async function writeWillardManifest(manifest: WillardManifest): Promise<void> {
  await fs.mkdir(WILLARD_ASSET_ROOT, { recursive: true });
  const normalized = {
    version: WILLARD_ASSET_MANIFEST_VERSION,
    assets: dedupeManifestAssetsByPath(manifest.assets.map(migrateManifestAsset)),
  };
  await fs.writeFile(WILLARD_ASSET_MANIFEST_PATH, JSON.stringify(normalized, null, 2) + "\n", "utf8");
}

export function migrateManifestAsset(asset: WillardManifestAsset): NormalizedManifestAsset {
  const localPath = normalizePublicAssetPath(asset.localPath);
  const filename = (asset.filename || path.basename(localPath)).trim();
  const importedAt = sanitizeIsoTimestamp(asset.importedAt);
  const createdAt = sanitizeIsoTimestamp(asset.createdAt) ?? importedAt;

  const status = normalizeStatus(asset.status, asset.reviewRequired ? "staging" : "staging");
  const reviewRequired = typeof asset.reviewRequired === "boolean" ? asset.reviewRequired : status !== "approved";

  return {
    ...asset,
    localPath,
    filename,
    originalFilename: (asset.originalFilename || filename).trim(),
    importedAt: importedAt ?? undefined,
    createdAt: createdAt ?? undefined,
    approvedAt: sanitizeIsoTimestamp(asset.approvedAt) ?? undefined,
    deniedAt: sanitizeIsoTimestamp(asset.deniedAt) ?? undefined,
    approvedBy: sanitizeActor(asset.approvedBy),
    deniedBy: sanitizeActor(asset.deniedBy),
    category: normalizeCategory(asset.category),
    suggestedCategory: asset.suggestedCategory ? normalizeCategory(asset.suggestedCategory) : undefined,
    status,
    reviewRequired,
    dominantKind: normalizeDominantKind(asset.dominantKind),
    width: normalizeFiniteNumber(asset.width),
    height: normalizeFiniteNumber(asset.height),
    hasAlpha: typeof asset.hasAlpha === "boolean" ? asset.hasAlpha : undefined,
    qualityScore: normalizeFiniteNumber(asset.qualityScore),
  };
}

export function normalizePublicAssetPath(value: string | undefined): string {
  const input = String(value || "").trim().replace(/\\/g, "/");
  if (!input) {
    return "";
  }
  const normalized = input.startsWith("/") ? input : `/${input}`;
  if (!normalized.startsWith("/willard-assets/")) {
    return "";
  }
  return normalized;
}

export function resolveAssetAbsolutePath(localPath: string): string | null {
  const normalized = normalizePublicAssetPath(localPath);
  if (!normalized) {
    return null;
  }

  const relFromPublic = normalized.slice(1);
  const absolute = path.resolve(process.cwd(), "public", relFromPublic);
  const assetRoot = path.resolve(WILLARD_ASSET_ROOT);

  if (!absolute.toLowerCase().startsWith(assetRoot.toLowerCase() + path.sep.toLowerCase()) && absolute.toLowerCase() !== assetRoot.toLowerCase()) {
    return null;
  }

  return absolute;
}

export function folderForCategory(category: WillardAssetCategory): string {
  switch (category) {
    case "texture":
      return "textures";
    case "paper":
      return "paper";
    case "tape":
      return "tape";
    case "sticker":
      return "stickers";
    case "frame":
    case "module-frame":
      return "frames";
    case "overlay":
    case "mask":
    case "edge":
    case "callout":
      return "overlays";
    case "shape":
      return "shapes";
    case "background":
    case "image":
    case "article-cover":
    case "blog-cover":
    case "spotlight-headshot":
    case "homepage-image":
      return "staging";
    default:
      return "staging";
  }
}

export function categoryFromFolder(folder: string): WillardAssetCategory {
  const normalized = String(folder || "").trim().toLowerCase();
  switch (normalized) {
    case "textures":
      return "texture";
    case "paper":
      return "paper";
    case "tape":
      return "tape";
    case "stickers":
      return "sticker";
    case "frames":
    case "module-frames":
      return "frame";
    case "shapes":
      return "shape";
    case "masks":
      return "mask";
    case "edges":
      return "edge";
    case "callouts":
      return "callout";
    case "overlays":
      return "overlay";
    default:
      return "image";
  }
}

function dedupeManifestAssetsByPath(assets: NormalizedManifestAsset[]): NormalizedManifestAsset[] {
  const seen = new Set<string>();
  const deduped: NormalizedManifestAsset[] = [];

  for (const asset of assets) {
    const key = normalizePublicAssetPath(asset.localPath).toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(asset);
  }

  return deduped;
}

function normalizeStatus(value: string | undefined, fallback: WillardAssetStatus): WillardAssetStatus {
  const normalized = String(value || "").trim().toLowerCase();
  if (
    normalized === "approved" ||
    normalized === "staging" ||
    normalized === "denied" ||
    normalized === "rejected" ||
    normalized === "demo"
  ) {
    return normalized;
  }
  return fallback;
}

function normalizeDominantKind(value: string | undefined): WillardAssetDominantKind {
  const normalized = String(value || "").trim().toLowerCase();
  if (
    normalized === "texture" ||
    normalized === "transparent-overlay" ||
    normalized === "photo" ||
    normalized === "illustration" ||
    normalized === "shape"
  ) {
    return normalized;
  }
  return "unknown";
}

function normalizeCategory(value: string | undefined): WillardAssetCategory {
  const normalized = String(value || "").trim().toLowerCase();
  switch (normalized) {
    case "image":
    case "article-cover":
    case "blog-cover":
    case "spotlight-headshot":
    case "homepage-image":
    case "background":
    case "texture":
    case "paper":
    case "sticker":
    case "tape":
    case "frame":
    case "overlay":
    case "shape":
    case "mask":
    case "edge":
    case "callout":
    case "module-frame":
      return normalized;
    case "paper":
      return "texture";
    default:
      return "image";
  }
}

function sanitizeIsoTimestamp(value: string | undefined): string | null {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function sanitizeActor(value: string | undefined): string | undefined {
  const raw = String(value || "").trim();
  if (!raw) {
    return undefined;
  }
  return raw.slice(0, 120);
}

function normalizeFiniteNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
}
