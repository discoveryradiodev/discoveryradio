"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useStyleLab } from "@/lib/dev/style-lab-context";
import {
  createUsageId,
  type WillardAsset,
  type WillardBackgroundPosition,
  type WillardBackgroundRepeat,
  type WillardBackgroundSize,
} from "@/lib/dev/willard-assets";
import {
  STYLE_TARGET_REGISTRY,
  TARGET_TO_KIND,
  type StyleTargetId,
} from "@/lib/dev/style-lab-inspect";
import styles from "./styleLab.module.css";

type AssetLibraryPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  activeStyleTarget: StyleTargetId | null;
  activeSurface: "feed-homepage" | "live-spotlight" | "live-blog";
};

type AssetFilterId =
  | "all"
  | "images"
  | "article-covers"
  | "blog-covers"
  | "spotlight-headshots"
  | "homepage-images"
  | "backgrounds"
  | "textures"
  | "stickers"
  | "tape"
  | "frames"
  | "overlays"
  | "project-public"
  | "uploaded"
  | "unused";

type StorageCapabilities = {
  hasBlobToken: boolean;
  canUploadToBlob: boolean;
  canListBlobAssets: boolean;
  canRegisterPublicAssets: boolean;
};

const FILTER_OPTIONS: Array<{ id: AssetFilterId; label: string }> = [
  { id: "all", label: "All" },
  { id: "images", label: "Images" },
  { id: "article-covers", label: "Article Covers" },
  { id: "blog-covers", label: "Blog Covers" },
  { id: "spotlight-headshots", label: "Spotlight Headshots" },
  { id: "homepage-images", label: "Homepage Images" },
  { id: "backgrounds", label: "Backgrounds" },
  { id: "textures", label: "Textures" },
  { id: "stickers", label: "Stickers" },
  { id: "tape", label: "Tape" },
  { id: "frames", label: "Frames" },
  { id: "overlays", label: "Overlays" },
  { id: "project-public", label: "Project/Public" },
  { id: "uploaded", label: "Uploaded" },
  { id: "unused", label: "Unused" },
];

const CATEGORY_OPTIONS = [
  { value: "image", label: "Images" },
  { value: "article-cover", label: "Article Covers" },
  { value: "blog-cover", label: "Blog Covers" },
  { value: "spotlight-headshot", label: "Spotlight Headshots" },
  { value: "homepage-image", label: "Homepage Images" },
  { value: "background", label: "Backgrounds" },
  { value: "texture", label: "Textures" },
  { value: "sticker", label: "Stickers" },
  { value: "tape", label: "Tape" },
  { value: "frame", label: "Frames" },
  { value: "overlay", label: "Overlays" },
] as const;

export function AssetLibraryPanel({
  isOpen,
  onClose,
  activeStyleTarget,
  activeSurface,
}: AssetLibraryPanelProps) {
  const {
    assets,
    setAssets,
    addAsset,
    selectedAssetId,
    setSelectedAssetId,
    assetUsages,
    addAssetUsage,
    removeAssetUsage,
    imageOverrides,
    setImageOverride,
    removeImageOverride,
    backgroundOverrides,
    setBackgroundOverride,
    removeBackgroundOverride,
  } = useStyleLab();

  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<StorageCapabilities | null>(null);

  const [selectedFilter, setSelectedFilter] = useState<AssetFilterId>("all");
  const [backgroundSize, setBackgroundSize] = useState<WillardBackgroundSize>("cover");
  const [backgroundPosition, setBackgroundPosition] = useState<WillardBackgroundPosition>("center");
  const [backgroundRepeat, setBackgroundRepeat] = useState<WillardBackgroundRepeat>("no-repeat");

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("image");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [publicPath, setPublicPath] = useState("");
  const [publicCategory, setPublicCategory] = useState("image");
  const [isRegisteringPublic, setIsRegisteringPublic] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const selectedAsset = useMemo(() => {
    if (!selectedAssetId) {
      return null;
    }
    return assets.find((asset) => asset.id === selectedAssetId) ?? null;
  }, [assets, selectedAssetId]);

  const usedAssetIds = useMemo(() => new Set(assetUsages.map((usage) => usage.assetId)), [assetUsages]);

  const activeTargetKind = activeStyleTarget ? TARGET_TO_KIND[activeStyleTarget] : null;
  const activeTargetLabel = activeStyleTarget
    ? STYLE_TARGET_REGISTRY[activeStyleTarget].label
    : null;
  const selectedImageOverride = useMemo(() => {
    if (!activeStyleTarget) {
      return null;
    }
    return imageOverrides.find((item) => item.targetId === activeStyleTarget) ?? null;
  }, [activeStyleTarget, imageOverrides]);
  const selectedBackgroundOverride = useMemo(() => {
    if (!activeStyleTarget) {
      return null;
    }
    return backgroundOverrides.find((item) => item.targetId === activeStyleTarget) ?? null;
  }, [activeStyleTarget, backgroundOverrides]);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => matchesFilter(asset, selectedFilter, usedAssetIds));
  }, [assets, selectedFilter, usedAssetIds]);

  const canUpload = capabilities?.canUploadToBlob ?? false;

  const canApplyImage = activeTargetKind === "image" && !!selectedAsset && !!activeStyleTarget;
  const canApplyBackground = activeTargetKind === "container" && !!selectedAsset && !!activeStyleTarget;

  useEffect(() => {
    if (!selectedBackgroundOverride) {
      setBackgroundSize("cover");
      setBackgroundPosition("center");
      setBackgroundRepeat("no-repeat");
      return;
    }

    setBackgroundSize(selectedBackgroundOverride.size);
    setBackgroundPosition(selectedBackgroundOverride.position);
    setBackgroundRepeat(selectedBackgroundOverride.repeat);
  }, [selectedBackgroundOverride]);

  const loadAssets = async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const response = await fetch("/api/willard/assets/list", { method: "GET" });
      const payload = (await response.json().catch(() => null)) as {
        assets?: WillardAsset[];
        capabilities?: StorageCapabilities;
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to load assets.");
      }

      const nextAssets = Array.isArray(payload?.assets) ? payload.assets : [];
      setAssets(nextAssets);
      setCapabilities(payload?.capabilities ?? null);

      if (nextAssets.length > 0 && !selectedAssetId) {
        setSelectedAssetId(nextAssets[0].id);
      }

      if (selectedAssetId && !nextAssets.some((asset) => asset.id === selectedAssetId)) {
        setSelectedAssetId(nextAssets[0]?.id ?? null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load assets.";
      setFetchError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    loadAssets();
  }, [isOpen]);

  const clearUsagesForTarget = (usageType: "selected-target-override" | "background") => {
    if (!activeStyleTarget) {
      return;
    }

    const existing = assetUsages.filter(
      (usage) =>
        usage.usageType === usageType &&
        usage.surface === activeSurface &&
        usage.targetId === activeStyleTarget
    );

    for (const usage of existing) {
      removeAssetUsage(usage.id);
    }
  };

  const handleReplaceSelectedImage = () => {
    if (!activeStyleTarget || activeTargetKind !== "image" || !selectedAsset) {
      return;
    }

    clearUsagesForTarget("selected-target-override");
    setImageOverride({
      targetId: activeStyleTarget,
      assetId: selectedAsset.id,
      url: selectedAsset.url,
      altText: selectedAsset.altText,
      objectFit: "cover",
      objectPositionX: 50,
      objectPositionY: 50,
      width: 100,
      maxWidth: 100,
      opacity: 1,
      borderRadius: 0,
      borderWidth: 0,
      borderColor: "#475569",
      xOffset: 0,
      yOffset: 0,
      rotation: 0,
      zIndex: 1,
    });
    addAssetUsage({
      id: createUsageId(),
      assetId: selectedAsset.id,
      usageType: "selected-target-override",
      surface: activeSurface,
      targetId: activeStyleTarget,
      isArchivedProtected: false,
    });
  };

  const handleRemoveImageOverride = () => {
    if (!activeStyleTarget || activeTargetKind !== "image") {
      return;
    }

    removeImageOverride(activeStyleTarget);
    clearUsagesForTarget("selected-target-override");
  };

  const handleApplyBackground = () => {
    if (!activeStyleTarget || activeTargetKind !== "container" || !selectedAsset) {
      return;
    }

    clearUsagesForTarget("background");
    setBackgroundOverride({
      targetId: activeStyleTarget,
      assetId: selectedAsset.id,
      url: selectedAsset.url,
      size: backgroundSize,
      position: backgroundPosition,
      repeat: backgroundRepeat,
      blendMode: "normal",
    });
    addAssetUsage({
      id: createUsageId(),
      assetId: selectedAsset.id,
      usageType: "background",
      surface: activeSurface,
      targetId: activeStyleTarget,
      isArchivedProtected: false,
    });
  };

  const handleRemoveBackgroundOverride = () => {
    if (!activeStyleTarget || activeTargetKind !== "container") {
      return;
    }

    removeBackgroundOverride(activeStyleTarget);
    clearUsagesForTarget("background");
  };

  const handleUploadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!uploadFile || isUploading) {
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("category", uploadCategory);

      const response = await fetch("/api/willard/assets/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as {
        asset?: WillardAsset;
        capabilities?: StorageCapabilities;
        error?: string;
      } | null;

      if (!response.ok || !payload?.asset) {
        throw new Error(payload?.error ?? "Upload failed. Check file type, size, or storage configuration.");
      }

      addAsset(payload.asset);
      setCapabilities(payload?.capabilities ?? capabilities);
      setSelectedAssetId(payload.asset.id);
      setUploadFile(null);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Upload failed. Check file type, size, or storage configuration.";
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRegisterPublic = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!publicPath.trim() || isRegisteringPublic) {
      return;
    }

    setIsRegisteringPublic(true);
    setRegisterError(null);

    try {
      const response = await fetch("/api/willard/assets/register-public", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: publicPath.trim(),
          category: publicCategory,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        asset?: WillardAsset;
        capabilities?: StorageCapabilities;
        error?: string;
      } | null;

      if (!response.ok || !payload?.asset) {
        throw new Error(payload?.error ?? "Failed to register project/public image.");
      }

      addAsset(payload.asset);
      setCapabilities(payload?.capabilities ?? capabilities);
      setSelectedAssetId(payload.asset.id);
      setPublicPath("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to register project/public image.";
      setRegisterError(message);
    } finally {
      setIsRegisteringPublic(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.assetLibraryLayer} role="dialog" aria-modal="true" aria-label="Asset Library">
      <div className={styles.assetLibraryBackdrop} onClick={onClose} />

      <aside className={styles.assetLibraryPanel}>
        <header className={styles.assetLibraryHeader}>
          <h2 className={styles.assetLibraryTitle}>Asset Library</h2>
          <button type="button" className={styles.assetLibraryClose} onClick={onClose}>
            Close
          </button>
        </header>

        <div className={styles.assetLibraryContent}>
          <section className={styles.assetLibrarySection}>
            <h3 className={styles.assetLibrarySectionTitle}>Upload Image</h3>
            <form onSubmit={handleUploadSubmit} className={styles.assetLibraryForm}>
              <label className={styles.assetFieldLabel} htmlFor="willard-upload-file">
                Choose image
              </label>
              <input
                id="willard-upload-file"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className={styles.assetFileInput}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setUploadFile(file);
                }}
              />

              <label className={styles.assetFieldLabel} htmlFor="willard-upload-category">
                Category
              </label>
              <select
                id="willard-upload-category"
                className={styles.assetSelect}
                value={uploadCategory}
                onChange={(event) => setUploadCategory(event.target.value)}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {!canUpload ? (
                <p className={styles.assetLibraryMuted}>Image uploads are not configured for this environment.</p>
              ) : null}

              {uploadError ? <p className={styles.assetLibraryError}>{uploadError}</p> : null}

              <button
                type="submit"
                className={styles.assetPrimaryButton}
                disabled={!canUpload || !uploadFile || isUploading}
              >
                {isUploading ? "Uploading..." : "Upload Image"}
              </button>
            </form>
          </section>

          <section className={styles.assetLibrarySection}>
            <h3 className={styles.assetLibrarySectionTitle}>Use Project/Public Image</h3>
            <form onSubmit={handleRegisterPublic} className={styles.assetLibraryForm}>
              <label className={styles.assetFieldLabel} htmlFor="willard-public-path">
                Public path
              </label>
              <input
                id="willard-public-path"
                type="text"
                className={styles.assetTextInput}
                value={publicPath}
                placeholder="/YE.jpg"
                onChange={(event) => setPublicPath(event.target.value)}
              />

              <label className={styles.assetFieldLabel} htmlFor="willard-public-category">
                Category
              </label>
              <select
                id="willard-public-category"
                className={styles.assetSelect}
                value={publicCategory}
                onChange={(event) => setPublicCategory(event.target.value)}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {registerError ? <p className={styles.assetLibraryError}>{registerError}</p> : null}

              <button type="submit" className={styles.assetPrimaryButton} disabled={!publicPath.trim() || isRegisteringPublic}>
                {isRegisteringPublic ? "Registering..." : "Use Project Image"}
              </button>
            </form>
          </section>

          <section className={styles.assetLibrarySection}>
            <div className={styles.assetListHeader}>
              <h3 className={styles.assetLibrarySectionTitle}>Assets</h3>
              <button type="button" className={styles.assetSecondaryButton} onClick={loadAssets} disabled={isLoading}>
                {isLoading ? "Loading..." : "Refresh"}
              </button>
            </div>

            <label className={styles.assetFieldLabel} htmlFor="willard-asset-filter">
              Category filter
            </label>
            <select
              id="willard-asset-filter"
              className={styles.assetSelect}
              value={selectedFilter}
              onChange={(event) => setSelectedFilter(event.target.value as AssetFilterId)}
            >
              {FILTER_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>

            {fetchError ? <p className={styles.assetLibraryError}>{fetchError}</p> : null}

            {isLoading ? <p className={styles.assetLibraryMuted}>Loading assets...</p> : null}

            {!isLoading && !fetchError && filteredAssets.length === 0 ? (
              <p className={styles.assetLibraryEmpty}>
                Upload textures, images, stickers, tape, frames, or backgrounds.
              </p>
            ) : null}

            {!isLoading && filteredAssets.length > 0 ? (
              <div className={styles.assetGrid}>
                {filteredAssets.map((asset) => {
                  const isSelected = asset.id === selectedAssetId;
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      className={`${styles.assetCard} ${isSelected ? styles.assetCardActive : ""}`}
                      onClick={() => setSelectedAssetId(asset.id)}
                      title={asset.filename}
                    >
                      <img src={asset.url} alt={asset.altText ?? asset.filename} className={styles.assetThumb} />
                      <span className={styles.assetCardName}>{asset.filename}</span>
                      <span className={styles.assetCardMeta}>{asset.category}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </section>

          <section className={styles.assetLibrarySection}>
            <h3 className={styles.assetLibrarySectionTitle}>Target Actions</h3>

            <div className={styles.assetActionSummary}>
              <p className={styles.assetActionLine}>
                <span>Selected target:</span> {activeTargetLabel ?? "None"}
              </p>
              <p className={styles.assetActionLine}>
                <span>Target kind:</span> {activeTargetKind ?? "None"}
              </p>
              <p className={styles.assetActionLine}>
                <span>Selected asset:</span> {selectedAsset?.filename ?? "None"}
              </p>
            </div>

            {!selectedAsset ? (
              <p className={styles.assetLibraryMuted}>Select an asset first.</p>
            ) : null}

            {!activeStyleTarget ? (
              <p className={styles.assetLibraryMuted}>Select a target in the preview to use this asset.</p>
            ) : null}

            {activeStyleTarget && activeTargetKind === "image" ? (
              <div className={styles.assetActionStack}>
                <button
                  type="button"
                  className={styles.assetPrimaryButton}
                  disabled={!canApplyImage}
                  onClick={handleReplaceSelectedImage}
                >
                  Replace selected image
                </button>
                <button
                  type="button"
                  className={styles.assetSecondaryButton}
                  disabled={!selectedImageOverride}
                  onClick={handleRemoveImageOverride}
                >
                  Remove image override
                </button>
                <button
                  type="button"
                  className={styles.assetSecondaryButton}
                  disabled={!selectedImageOverride}
                  onClick={handleRemoveImageOverride}
                >
                  Restore original image
                </button>
              </div>
            ) : null}

            {activeStyleTarget && activeTargetKind === "container" ? (
              <div className={styles.assetActionStack}>
                <label className={styles.assetFieldLabel} htmlFor="willard-bg-size">
                  Background size
                </label>
                <select
                  id="willard-bg-size"
                  className={styles.assetSelect}
                  value={backgroundSize}
                  onChange={(event) => setBackgroundSize(event.target.value as WillardBackgroundSize)}
                >
                  <option value="cover">cover</option>
                  <option value="contain">contain</option>
                  <option value="auto">auto</option>
                </select>

                <label className={styles.assetFieldLabel} htmlFor="willard-bg-position">
                  Background position
                </label>
                <select
                  id="willard-bg-position"
                  className={styles.assetSelect}
                  value={backgroundPosition}
                  onChange={(event) => setBackgroundPosition(event.target.value as WillardBackgroundPosition)}
                >
                  <option value="center">center</option>
                  <option value="top">top</option>
                  <option value="bottom">bottom</option>
                  <option value="left">left</option>
                  <option value="right">right</option>
                </select>

                <label className={styles.assetFieldLabel} htmlFor="willard-bg-repeat">
                  Background repeat
                </label>
                <select
                  id="willard-bg-repeat"
                  className={styles.assetSelect}
                  value={backgroundRepeat}
                  onChange={(event) => setBackgroundRepeat(event.target.value as WillardBackgroundRepeat)}
                >
                  <option value="no-repeat">no-repeat</option>
                  <option value="repeat">repeat</option>
                </select>

                <button
                  type="button"
                  className={styles.assetPrimaryButton}
                  disabled={!canApplyBackground}
                  onClick={handleApplyBackground}
                >
                  Use as background for selected target
                </button>
                <button
                  type="button"
                  className={styles.assetSecondaryButton}
                  disabled={!selectedBackgroundOverride}
                  onClick={handleRemoveBackgroundOverride}
                >
                  Remove background override
                </button>
                <button
                  type="button"
                  className={styles.assetSecondaryButton}
                  disabled={!selectedBackgroundOverride}
                  onClick={handleRemoveBackgroundOverride}
                >
                  Restore original background
                </button>
              </div>
            ) : null}

            {activeStyleTarget && activeTargetKind !== "image" && activeTargetKind !== "container" ? (
              <p className={styles.assetLibraryMuted}>
                This target kind does not support asset replacement in Phase 3.
              </p>
            ) : null}
          </section>

          <section className={styles.assetLibrarySection}>
            <h3 className={styles.assetLibrarySectionTitle}>Selected Asset</h3>

            {!selectedAsset ? (
              <p className={styles.assetLibraryMuted}>Select an asset to view details.</p>
            ) : (
              <div className={styles.assetDetails}>
                <img
                  src={selectedAsset.url}
                  alt={selectedAsset.altText ?? selectedAsset.filename}
                  className={styles.assetDetailsThumb}
                />
                <dl className={styles.assetDetailsList}>
                  <div>
                    <dt>Filename</dt>
                    <dd>{selectedAsset.filename}</dd>
                  </div>
                  <div>
                    <dt>Original filename</dt>
                    <dd>{selectedAsset.originalFilename}</dd>
                  </div>
                  <div>
                    <dt>Category</dt>
                    <dd>{selectedAsset.category}</dd>
                  </div>
                  <div>
                    <dt>Source kind</dt>
                    <dd>{selectedAsset.sourceKind}</dd>
                  </div>
                  <div>
                    <dt>Storage provider</dt>
                    <dd>{selectedAsset.storageProvider}</dd>
                  </div>
                  <div>
                    <dt>Size</dt>
                    <dd>{selectedAsset.size > 0 ? formatBytes(selectedAsset.size) : "Not reported"}</dd>
                  </div>
                  <div>
                    <dt>Alt text</dt>
                    <dd>{selectedAsset.altText || "Not set"}</dd>
                  </div>
                  <div>
                    <dt>URL / path</dt>
                    <dd className={styles.assetDetailsPath}>{selectedAsset.pathname ?? selectedAsset.url}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{selectedAsset.readonly ? "Read-only" : "Editable"}</dd>
                  </div>
                </dl>
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

function matchesFilter(asset: WillardAsset, filterId: AssetFilterId, usedAssetIds: Set<string>): boolean {
  if (filterId === "all") {
    return true;
  }

  if (filterId === "project-public") {
    return asset.sourceKind === "project-public";
  }

  if (filterId === "uploaded") {
    return asset.sourceKind === "uploaded";
  }

  if (filterId === "unused") {
    return !usedAssetIds.has(asset.id);
  }

  if (filterId === "images") {
    return asset.category === "image";
  }

  if (filterId === "article-covers") {
    return asset.category === "article-cover";
  }

  if (filterId === "blog-covers") {
    return asset.category === "blog-cover";
  }

  if (filterId === "spotlight-headshots") {
    return asset.category === "spotlight-headshot";
  }

  if (filterId === "homepage-images") {
    return asset.category === "homepage-image";
  }

  if (filterId === "backgrounds") {
    return asset.category === "background";
  }

  if (filterId === "textures") {
    return asset.category === "texture";
  }

  if (filterId === "stickers") {
    return asset.category === "sticker";
  }

  if (filterId === "tape") {
    return asset.category === "tape";
  }

  if (filterId === "frames") {
    return asset.category === "frame";
  }

  if (filterId === "overlays") {
    return asset.category === "overlay";
  }

  return true;
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
}
