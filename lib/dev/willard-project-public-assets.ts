import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  categoryFromFolder,
  migrateManifestAsset,
  readWillardManifest,
  type NormalizedManifestAsset,
} from "@/lib/dev/willard-asset-manifest";
import { normalizeAssetCategory, type WillardAsset, type WillardAssetCategory } from "@/lib/dev/willard-assets";

const WILLARD_ASSETS_PUBLIC_ROOT = path.join(process.cwd(), "public", "willard-assets");
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]);

const FOLDERS_TO_SCAN = [
  "overlays",
  "textures",
  "tape",
  "stickers",
  "frames",
  "paper",
  "shapes",
  "masks",
  "edges",
  "callouts",
  "module-frames",
  "staging",
] as const;

const MIME_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export async function discoverWillardProjectPublicAssets(): Promise<WillardAsset[]> {
  const manifest = await readWillardManifest();
  const manifestByLocalPath = new Map<string, NormalizedManifestAsset>();

  for (const asset of manifest.assets) {
    const migrated = migrateManifestAsset(asset);
    manifestByLocalPath.set(migrated.localPath.toLowerCase(), migrated);
  }

  const discovered: WillardAsset[] = [];
  const seenPaths = new Set<string>();

  for (const directory of FOLDERS_TO_SCAN) {
    const directoryPath = path.join(WILLARD_ASSETS_PUBLIC_ROOT, directory);
    const files = await listImageFiles(directoryPath);

    for (const filePath of files) {
      const publicPath = toPublicRelativePath(filePath);
      if (!publicPath) {
        continue;
      }

      const pathKey = publicPath.toLowerCase();
      if (seenPaths.has(pathKey)) {
        continue;
      }
      seenPaths.add(pathKey);

      const stat = await fs.stat(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const filename = path.basename(filePath);
      const manifestItem = manifestByLocalPath.get(pathKey);
      const fallbackCategory = fallbackCategoryByFolder(directory);
      const createdAt =
        safeIsoString(manifestItem?.approvedAt) ??
        safeIsoString(manifestItem?.createdAt) ??
        safeIsoString(manifestItem?.importedAt) ??
        stat.mtime.toISOString();

      discovered.push({
        id: buildProjectPublicAssetId(publicPath),
        sourceKind: "project-public",
        storageProvider: "public-folder",
        url: publicPath,
        pathname: publicPath,
        filename,
        originalFilename: manifestItem?.originalFilename?.trim() || filename,
        mimeType: MIME_BY_EXTENSION[ext] ?? "application/octet-stream",
        size: stat.size,
        width: manifestItem?.width,
        height: manifestItem?.height,
        hasAlpha: typeof manifestItem?.hasAlpha === "boolean" ? manifestItem.hasAlpha : inferHasAlphaByExtension(ext),
        category: normalizeAssetCategory(manifestItem?.category ?? fallbackCategory),
        suggestedCategory: manifestItem?.suggestedCategory,
        status: manifestItem?.status ?? "staging",
        reviewRequired: typeof manifestItem?.reviewRequired === "boolean" ? manifestItem.reviewRequired : true,
        qualityScore: manifestItem?.qualityScore,
        rejectionReason: manifestItem?.rejectionReason,
        dominantKind: manifestItem?.dominantKind,
        curatorNotes: manifestItem?.curatorNotes,
        approvedAt: manifestItem?.approvedAt,
        deniedAt: manifestItem?.deniedAt,
        approvedBy: manifestItem?.approvedBy,
        deniedBy: manifestItem?.deniedBy,
        credit: manifestItem?.author,
        sourceNotes: buildSourceNotes(manifestItem),
        tags: buildTags(directory, manifestItem),
        readonly: true,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  discovered.sort((a, b) => timestampValue(b.createdAt) - timestampValue(a.createdAt));
  return discovered;
}

function fallbackCategoryByFolder(folder: string): WillardAssetCategory {
  if (folder === "paper") {
    return "texture";
  }
  if (folder === "module-frames") {
    return "module-frame";
  }
  return categoryFromFolder(folder);
}

function buildProjectPublicAssetId(publicPath: string): string {
  const digest = createHash("sha1").update(publicPath.toLowerCase()).digest("hex").slice(0, 16);
  return `project_public_${digest}`;
}

async function listImageFiles(directoryPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }
      const extension = path.extname(entry.name).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(extension)) {
        continue;
      }
      files.push(path.join(directoryPath, entry.name));
    }
    return files;
  } catch {
    return [];
  }
}

function toPublicRelativePath(absolutePath: string): string {
  const rel = path.relative(path.join(process.cwd(), "public"), absolutePath);
  if (!rel || rel.startsWith("..")) {
    return "";
  }
  return `/${rel.replace(/\\/g, "/")}`;
}

function safeIsoString(value: string | undefined): string | null {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function buildSourceNotes(record: NormalizedManifestAsset | undefined): string | undefined {
  if (!record) {
    return undefined;
  }

  const parts: string[] = [];
  if (record.provider) {
    parts.push(`provider: ${record.provider}`);
  }
  if (record.license) {
    parts.push(`license: ${record.license}`);
  }
  if (record.licenseUrl) {
    parts.push(`licenseUrl: ${record.licenseUrl}`);
  }
  if (record.sourceUrl) {
    parts.push(`source: ${record.sourceUrl}`);
  }
  return parts.length > 0 ? parts.join(" | ") : undefined;
}

function buildTags(folder: string, record: NormalizedManifestAsset | undefined): string[] {
  const tags = new Set<string>(["project-public", folder]);
  if (record?.provider) {
    tags.add(record.provider.toLowerCase());
  }
  if (record?.status) {
    tags.add(`status:${record.status}`);
  }
  if (record?.reviewRequired) {
    tags.add("review-required");
  }
  return [...tags];
}

function inferHasAlphaByExtension(ext: string): boolean {
  return ext === ".png" || ext === ".webp" || ext === ".gif" || ext === ".svg";
}

function timestampValue(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}
