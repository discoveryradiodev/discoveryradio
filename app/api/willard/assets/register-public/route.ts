import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isStyleLabEnabled } from "@/lib/dev/is-style-lab-enabled";
import { isWillardAuthenticated } from "@/lib/dev/style-lab-auth";
import {
  getWillardStorageCapabilities,
  validatePublicAssetPath,
} from "@/lib/dev/willard-asset-storage";
import {
  createAssetId,
  normalizeAssetCategory,
  type WillardAsset,
} from "@/lib/dev/willard-assets";

export const runtime = "nodejs";

type RegisterPublicRequest = {
  path?: string;
  category?: string;
  altText?: string;
  caption?: string;
  credit?: string;
  sourceNotes?: string;
  tags?: string[];
};

export async function POST(request: Request) {
  if (!isStyleLabEnabled()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const cookieStore = await cookies();
  if (!isWillardAuthenticated(cookieStore)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: RegisterPublicRequest;
  try {
    body = (await request.json()) as RegisterPublicRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const pathResult = validatePublicAssetPath(String(body.path ?? ""));
  if (!pathResult.ok) {
    return NextResponse.json({ error: pathResult.error }, { status: 400 });
  }

  const now = new Date().toISOString();
  const parsedTags = Array.isArray(body.tags)
    ? body.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : [];

  const asset: WillardAsset = {
    id: createAssetId(),
    sourceKind: "project-public",
    storageProvider: "public-folder",
    url: pathResult.data.publicPath,
    pathname: pathResult.data.publicPath,
    filename: pathResult.data.filename,
    originalFilename: pathResult.data.filename,
    mimeType: pathResult.data.mimeType,
    size: 0,
    category: normalizeAssetCategory(body.category),
    suggestedCategory: normalizeAssetCategory(body.category),
    status: "staging",
    qualityScore: 0,
    reviewRequired: true,
    dominantKind: "unknown",
    altText: body.altText?.trim() || undefined,
    caption: body.caption?.trim() || undefined,
    credit: body.credit?.trim() || undefined,
    sourceNotes: body.sourceNotes?.trim() || undefined,
    tags: parsedTags,
    readonly: true,
    createdAt: now,
    updatedAt: now,
  };

  return NextResponse.json({
    asset,
    capabilities: getWillardStorageCapabilities(),
    message: "Public asset registered as read-only metadata.",
  });
}
