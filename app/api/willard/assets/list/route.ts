import { list } from "@vercel/blob";
import path from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isStyleLabEnabled } from "@/lib/dev/is-style-lab-enabled";
import { isWillardAuthenticated } from "@/lib/dev/style-lab-auth";
import { getWillardStorageCapabilities } from "@/lib/dev/willard-asset-storage";
import { createAssetId, normalizeAssetCategory, type WillardAsset } from "@/lib/dev/willard-assets";

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
  if (!capabilities.canListBlobAssets) {
    return NextResponse.json({ assets: [] as WillardAsset[], capabilities });
  }

  try {
    const response = await list({
      prefix: "willard-assets/",
      limit: 200,
    });

    const assets: WillardAsset[] = response.blobs.map((blob) => {
      const now = new Date(blob.uploadedAt ?? Date.now()).toISOString();
      return {
        id: createAssetId(),
        sourceKind: "uploaded",
        storageProvider: "vercel-blob",
        url: blob.url,
        pathname: blob.pathname,
        filename: blob.pathname.split("/").pop() ?? blob.pathname,
        originalFilename: blob.pathname.split("/").pop() ?? blob.pathname,
        mimeType: inferMimeTypeFromPathname(blob.pathname),
        size: blob.size,
        category: normalizeAssetCategory("image"),
        tags: [],
        readonly: false,
        createdAt: now,
        updatedAt: now,
      };
    });

    return NextResponse.json({
      assets,
      capabilities,
      hasMore: response.hasMore,
      cursor: response.cursor ?? null,
    });
  } catch {
    return NextResponse.json({
      assets: [] as WillardAsset[],
      capabilities,
      warning: "Blob listing is unavailable in this environment.",
    });
  }
}
