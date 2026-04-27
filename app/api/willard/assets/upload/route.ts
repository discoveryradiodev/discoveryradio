import { put } from "@vercel/blob";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isStyleLabEnabled } from "@/lib/dev/is-style-lab-enabled";
import { isWillardAuthenticated } from "@/lib/dev/style-lab-auth";
import {
  buildBlobUploadPath,
  getWillardStorageCapabilities,
  validateUploadFile,
} from "@/lib/dev/willard-asset-storage";
import {
  createAssetId,
  normalizeAssetCategory,
  type WillardAsset,
} from "@/lib/dev/willard-assets";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isStyleLabEnabled()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const cookieStore = await cookies();
  if (!isWillardAuthenticated(cookieStore)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const capabilities = getWillardStorageCapabilities();
  if (!capabilities.canUploadToBlob) {
    return NextResponse.json(
      {
        error: "Blob storage is not configured. Set BLOB_READ_WRITE_TOKEN to enable uploads.",
        capabilities,
      },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart upload payload." }, { status: 400 });
  }

  const fileResult = validateUploadFile(formData.get("file") as File | null);
  if (!fileResult.ok) {
    return NextResponse.json({ error: fileResult.error }, { status: 400 });
  }

  const file = fileResult.data;
  const blobPath = buildBlobUploadPath(file.name);

  try {
    const uploaded = await put(blobPath, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
    });

    const now = new Date().toISOString();
    const tags = String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const asset: WillardAsset = {
      id: createAssetId(),
      sourceKind: "uploaded",
      storageProvider: "vercel-blob",
      url: uploaded.url,
      pathname: uploaded.pathname,
      filename: blobPath.split("/").pop() ?? file.name,
      originalFilename: file.name,
      mimeType: file.type,
      size: file.size,
      category: normalizeAssetCategory(String(formData.get("category") ?? "image")),
      suggestedCategory: normalizeAssetCategory(String(formData.get("category") ?? "image")),
      status: "staging",
      reviewRequired: true,
      qualityScore: 0,
      dominantKind: "unknown",
      altText: String(formData.get("altText") ?? "") || undefined,
      caption: String(formData.get("caption") ?? "") || undefined,
      credit: String(formData.get("credit") ?? "") || undefined,
      sourceNotes: String(formData.get("sourceNotes") ?? "") || undefined,
      tags,
      readonly: false,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json({ asset, capabilities });
  } catch {
    return NextResponse.json(
      { error: "Upload failed. Please try again.", capabilities },
      { status: 500 }
    );
  }
}
