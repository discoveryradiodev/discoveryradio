import { list } from "@vercel/blob";
import path from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isStyleLabEnabled } from "@/lib/dev/is-style-lab-enabled";
import { isWillardAuthenticated } from "@/lib/dev/style-lab-auth";
import { readWillardManifest } from "@/lib/dev/willard-asset-manifest";
import { getWillardStorageCapabilities } from "@/lib/dev/willard-asset-storage";
import { normalizeAssetCategory, type WillardAsset } from "@/lib/dev/willard-assets";
import { discoverWillardProjectPublicAssets } from "@/lib/dev/willard-project-public-assets";

export const runtime = "nodejs";

function inferMimeTypeFromPathname(pathname: string): string {
  const extension = path.extname(pathname).toLowerCase();
  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

export async function GET() {
  if (!isStyleLabEnabled()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const cookieStore = await cookies();
  if (!isWillardAuthenticated(cookieStore)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const capabilities = getWillardStorageCapabilities();
  const projectPublicAssets = await discoverWillardProjectPublicAssets();
  const manifest = await readWillardManifest();
  const manifestByPath = new Map(
    manifest.assets
      .filter((item) => item.localPath)
      .map((item) => [String(item.localPath).toLowerCase(), item] as const)
  );

  if (!capabilities.canListBlobAssets) {
    return NextResponse.json({ assets: projectPublicAssets, capabilities });
  }

  try {
    const response = await list({
      prefix: "willard-assets/",
      limit: 200,
    });

    const assets: WillardAsset[] = response.blobs.map((blob) => {
      const now = new Date(blob.uploadedAt ?? Date.now()).toISOString();
      const pathname = `/${blob.pathname.replace(/^\/+/, "")}`;
      const manifestEntry = manifestByPath.get(pathname.toLowerCase());
      return {
        id: createBlobAssetId(pathname),
        sourceKind: "uploaded",
        storageProvider: "vercel-blob",
        url: blob.url,
        pathname,
        filename: pathname.split("/").pop() ?? pathname,
        originalFilename: manifestEntry?.originalFilename ?? pathname.split("/").pop() ?? pathname,
        mimeType: inferMimeTypeFromPathname(blob.pathname),
        size: blob.size,
        category: normalizeAssetCategory(manifestEntry?.category ?? "image"),
        suggestedCategory: normalizeAssetCategory(manifestEntry?.suggestedCategory ?? "image"),
        status: normalizeBlobStatus(manifestEntry?.status),
        qualityScore: typeof manifestEntry?.qualityScore === "number" ? manifestEntry.qualityScore : 0,
        reviewRequired:
          typeof manifestEntry?.reviewRequired === "boolean"
            ? manifestEntry.reviewRequired
            : normalizeBlobStatus(manifestEntry?.status) !== "approved",
        rejectionReason: manifestEntry?.rejectionReason,
        dominantKind: normalizeDominantKind(manifestEntry?.dominantKind),
        curatorNotes: manifestEntry?.curatorNotes,
        approvedAt: manifestEntry?.approvedAt,
        deniedAt: manifestEntry?.deniedAt,
        approvedBy: manifestEntry?.approvedBy,
        deniedBy: manifestEntry?.deniedBy,
        tags: [],
        readonly: false,
        createdAt: manifestEntry?.createdAt ?? manifestEntry?.importedAt ?? now,
        updatedAt: now,
      };
    });

    return NextResponse.json({
      assets: dedupeAssetsByPath([...projectPublicAssets, ...assets]),
      capabilities,
      hasMore: response.hasMore,
      cursor: response.cursor ?? null,
    });
  } catch {
    return NextResponse.json({
      assets: projectPublicAssets,
      capabilities,
      warning: "Blob listing is unavailable in this environment.",
    });
  }
}

function createBlobAssetId(pathname: string): string {
  const safe = pathname.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 64);
  return `blob_${safe}`;
}

function normalizeBlobStatus(value: string | undefined): WillardAsset["status"] {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (
    normalized === "approved" ||
    normalized === "staging" ||
    normalized === "denied" ||
    normalized === "rejected" ||
    normalized === "demo"
  ) {
    return normalized;
  }
  return "staging";
}

function normalizeDominantKind(value: string | undefined): WillardAsset["dominantKind"] {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (
    normalized === "texture" ||
    normalized === "paper-texture" ||
    normalized === "transparent-overlay" ||
    normalized === "torn-edge" ||
    normalized === "frame" ||
    normalized === "tape" ||
    normalized === "sticker" ||
    normalized === "pattern" ||
    normalized === "vector-shape" ||
    normalized === "callout" ||
    normalized === "mask" ||
    normalized === "module-frame"
  ) {
    return normalized;
  }
  return "unknown";
}

function dedupeAssetsByPath(assets: WillardAsset[]): WillardAsset[] {
  const seen = new Set<string>();
  const deduped: WillardAsset[] = [];

  for (const asset of assets) {
    const key = (asset.pathname ?? asset.url).trim().toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(asset);
  }

  return deduped;
}
