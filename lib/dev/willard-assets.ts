export type WillardAssetSourceKind = "uploaded" | "project-public" | "remote-url";

export type WillardStorageProvider =
  | "vercel-blob"
  | "public-folder"
  | "remote-url"
  | "unknown";

export type WillardAssetCategory =
  | "image"
  | "article-cover"
  | "blog-cover"
  | "spotlight-headshot"
  | "homepage-image"
  | "background"
  | "texture"
  | "paper"
  | "sticker"
  | "tape"
  | "frame"
  | "overlay"
  | "shape"
  | "mask"
  | "edge"
  | "callout"
  | "module-frame";

export type WillardAssetStatus = "approved" | "staging" | "denied" | "rejected" | "demo";

export type WillardAssetDominantKind =
  | "texture"
  | "transparent-overlay"
  | "photo"
  | "illustration"
  | "shape"
  | "unknown";

export type WillardAsset = {
  id: string;
  sourceKind: WillardAssetSourceKind;
  storageProvider: WillardStorageProvider;
  url: string;
  pathname?: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  hasAlpha?: boolean;
  category: WillardAssetCategory;
  suggestedCategory?: WillardAssetCategory;
  status?: WillardAssetStatus;
  qualityScore?: number;
  reviewRequired?: boolean;
  rejectionReason?: string;
  dominantKind?: WillardAssetDominantKind;
  curatorNotes?: string;
  approvedAt?: string;
  deniedAt?: string;
  approvedBy?: string;
  deniedBy?: string;
  altText?: string;
  caption?: string;
  credit?: string;
  sourceNotes?: string;
  tags: string[];
  readonly: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WillardAssetUsageType =
  | "article-cover"
  | "blog-cover"
  | "spotlight-headshot"
  | "homepage-override"
  | "selected-target-override"
  | "overlay"
  | "background"
  | "texture";

export type WillardAssetUsageSurface =
  | "feed-homepage"
  | "live-spotlight"
  | "live-blog"
  | "archive"
  | "proposal";

export type WillardAssetUsage = {
  id: string;
  assetId: string;
  usageType: WillardAssetUsageType;
  surface: WillardAssetUsageSurface;
  targetId?: string;
  contentType?: string;
  contentSlug?: string;
  contentId?: string;
  proposalId?: string;
  isArchivedProtected: boolean;
};

export type WillardImageOverride = {
  targetId: string;
  assetId: string;
  url: string;
  altText?: string;
  objectFit: WillardImageObjectFit;
  objectPositionX: number;
  objectPositionY: number;
  width: number;
  maxWidth: number;
  opacity: number;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  xOffset: number;
  yOffset: number;
  rotation: number;
  zIndex: number;
};

export type WillardImageObjectFit =
  | "cover"
  | "contain"
  | "fill"
  | "none"
  | "scale-down";

export type WillardBackgroundSize = "cover" | "contain" | "auto";
export type WillardBackgroundPosition = "center" | "top" | "bottom" | "left" | "right";
export type WillardBackgroundRepeat = "no-repeat" | "repeat";
export type WillardBackgroundBlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "soft-light"
  | "hard-light";

export type WillardBackgroundOverride = {
  targetId: string;
  assetId: string;
  url: string;
  size: WillardBackgroundSize;
  position: WillardBackgroundPosition;
  repeat: WillardBackgroundRepeat;
  blendMode?: WillardBackgroundBlendMode;
};

export type WillardOverlayPlacementMode = "anchor" | "free";

export type WillardOverlayDraft = {
  id: string;
  assetId: string;
  url: string;
  name: string;
  surface: WillardAssetUsageSurface;
  anchorTargetId?: string;
  placementMode: WillardOverlayPlacementMode;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  blendMode: string;
  visible: boolean;
  locked: boolean;
};

const CATEGORY_SET: ReadonlySet<WillardAssetCategory> = new Set([
  "image",
  "article-cover",
  "blog-cover",
  "spotlight-headshot",
  "homepage-image",
  "background",
  "texture",
  "paper",
  "sticker",
  "tape",
  "frame",
  "overlay",
  "shape",
  "mask",
  "edge",
  "callout",
  "module-frame",
]);

function createId(prefix: string): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${time}_${random}`;
}

export function createAssetId(): string {
  return createId("asset");
}

export function createUsageId(): string {
  return createId("usage");
}

export function createOverlayId(): string {
  return createId("overlay");
}

export function isProtectedUsage(usage: Pick<WillardAssetUsage, "isArchivedProtected" | "surface">): boolean {
  return usage.isArchivedProtected || usage.surface === "archive";
}

export function isUploadedAsset(asset: Pick<WillardAsset, "sourceKind">): boolean {
  return asset.sourceKind === "uploaded";
}

export function isProjectPublicAsset(asset: Pick<WillardAsset, "sourceKind">): boolean {
  return asset.sourceKind === "project-public";
}

export function normalizeAssetCategory(value: string | null | undefined): WillardAssetCategory {
  const normalized = (value ?? "").trim().toLowerCase();
  if (CATEGORY_SET.has(normalized as WillardAssetCategory)) {
    return normalized as WillardAssetCategory;
  }
  return "image";
}
