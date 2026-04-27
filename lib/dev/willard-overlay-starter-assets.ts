import type { WillardAsset } from "@/lib/dev/willard-assets";

const STARTER_TIMESTAMP = "2026-04-27T00:00:00.000Z";

type StarterOverlaySpec = {
  id: string;
  filename: string;
  path: string;
  tags: string[];
};

const STARTER_OVERLAY_SPECS: readonly StarterOverlaySpec[] = [
  {
    id: "starter-overlay-tape-strip",
    filename: "tape-strip.svg",
    path: "/willard-overlays/tape-strip.svg",
    tags: ["starter", "overlay", "tape"],
  },
  {
    id: "starter-overlay-sticker-star-dot",
    filename: "sticker-star-dot.svg",
    path: "/willard-overlays/sticker-star-dot.svg",
    tags: ["starter", "overlay", "sticker"],
  },
  {
    id: "starter-overlay-torn-paper",
    filename: "torn-paper.svg",
    path: "/willard-overlays/torn-paper.svg",
    tags: ["starter", "overlay", "paper"],
  },
  {
    id: "starter-overlay-frame-line",
    filename: "frame-line.svg",
    path: "/willard-overlays/frame-line.svg",
    tags: ["starter", "overlay", "frame"],
  },
  {
    id: "starter-overlay-scribble",
    filename: "scribble.svg",
    path: "/willard-overlays/scribble.svg",
    tags: ["starter", "overlay", "scribble"],
  },
  {
    id: "starter-overlay-halftone-texture",
    filename: "halftone-texture.svg",
    path: "/willard-overlays/halftone-texture.svg",
    tags: ["starter", "overlay", "halftone", "texture"],
  },
] as const;

export const WILLARD_STARTER_OVERLAY_ASSETS: readonly WillardAsset[] = STARTER_OVERLAY_SPECS.map(
  (spec) => ({
    id: spec.id,
    sourceKind: "project-public",
    storageProvider: "public-folder",
    url: spec.path,
    pathname: spec.path,
    filename: spec.filename,
    originalFilename: spec.filename,
    mimeType: "image/svg+xml",
    size: 0,
    category: "overlay",
    tags: [...spec.tags],
    readonly: true,
    createdAt: STARTER_TIMESTAMP,
    updatedAt: STARTER_TIMESTAMP,
  })
);

export function seedStarterOverlayAssets(assets: WillardAsset[]): WillardAsset[] {
  const existingById = new Set<string>();
  const existingByPath = new Set<string>();

  for (const asset of assets) {
    existingById.add(asset.id);
    const normalized = normalizeAssetPath(asset.pathname ?? asset.url);
    if (normalized) {
      existingByPath.add(normalized);
    }
  }

  const missingStarters = WILLARD_STARTER_OVERLAY_ASSETS.filter((starter) => {
    if (existingById.has(starter.id)) {
      return false;
    }
    const starterPath = normalizeAssetPath(starter.pathname ?? starter.url);
    return starterPath ? !existingByPath.has(starterPath) : true;
  });

  if (missingStarters.length === 0) {
    return assets;
  }

  return [...missingStarters, ...assets];
}

function normalizeAssetPath(value: string | undefined): string {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = new URL(trimmed);
    return normalizeSlashes(parsed.pathname).toLowerCase();
  } catch {
    return normalizeSlashes(trimmed.split(/[?#]/)[0] ?? "").toLowerCase();
  }
}

function normalizeSlashes(value: string): string {
  if (!value) {
    return "";
  }
  return value.startsWith("/") ? value : `/${value}`;
}
