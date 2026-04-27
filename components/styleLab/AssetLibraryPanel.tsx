"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useStyleLab } from "@/lib/dev/style-lab-context";
import {
  createUsageId,
  type WillardAsset,
  type WillardAssetStatus,
  type WillardBackgroundBlendMode,
  type WillardBackgroundPosition,
  type WillardBackgroundRepeat,
  type WillardBackgroundSize,
  type WillardImageObjectFit,
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
  | "approved"
  | "needs-review"
  | "denied"
  | "demo-hidden"
  | "rejected"
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
  { id: "approved", label: "Approved (Default)" },
  { id: "needs-review", label: "Review Queue" },
  { id: "denied", label: "Denied / Rejected" },
  { id: "demo-hidden", label: "Demo / Hidden" },
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
  { value: "paper", label: "Paper" },
  { value: "sticker", label: "Stickers" },
  { value: "tape", label: "Tape" },
  { value: "frame", label: "Frames" },
  { value: "overlay", label: "Overlays" },
  { value: "shape", label: "Shapes" },
  { value: "mask", label: "Masks" },
  { value: "edge", label: "Edges" },
  { value: "callout", label: "Callouts" },
  { value: "module-frame", label: "Module Frames" },
] as const;

const IMAGE_OBJECT_FIT_OPTIONS: WillardImageObjectFit[] = [
  "cover",
  "contain",
  "fill",
  "none",
  "scale-down",
];

const BACKGROUND_BLEND_MODE_OPTIONS: WillardBackgroundBlendMode[] = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "soft-light",
  "hard-light",
];

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
    clearAllImageOverrides,
    clearAllBackgroundOverrides,
  } = useStyleLab();

  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<StorageCapabilities | null>(null);

  const [selectedFilter, setSelectedFilter] = useState<AssetFilterId>("approved");
  const [backgroundSize, setBackgroundSize] = useState<WillardBackgroundSize>("cover");
  const [backgroundPosition, setBackgroundPosition] = useState<WillardBackgroundPosition>("center");
  const [backgroundRepeat, setBackgroundRepeat] = useState<WillardBackgroundRepeat>("no-repeat");
  const [backgroundBlendMode, setBackgroundBlendMode] = useState<WillardBackgroundBlendMode>("normal");

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("image");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [publicPath, setPublicPath] = useState("");
  const [publicCategory, setPublicCategory] = useState("image");
  const [isRegisteringPublic, setIsRegisteringPublic] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [actionAssetId, setActionAssetId] = useState<string | null>(null);

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
    return assets
      .filter((asset) => matchesFilter(asset, selectedFilter, usedAssetIds))
      .sort((a, b) => assetTimestamp(b) - assetTimestamp(a));
  }, [assets, selectedFilter, usedAssetIds]);

  const canUpload = capabilities?.canUploadToBlob ?? false;

  const canApplyImage = activeTargetKind === "image" && !!selectedAsset && !!activeStyleTarget;
  const canApplyBackground = activeTargetKind === "container" && !!selectedAsset && !!activeStyleTarget;

  useEffect(() => {
    if (!selectedBackgroundOverride) {
      setBackgroundSize("cover");
      setBackgroundPosition("center");
      setBackgroundRepeat("no-repeat");
      setBackgroundBlendMode("normal");
      return;
    }

    setBackgroundSize(selectedBackgroundOverride.size);
    setBackgroundPosition(selectedBackgroundOverride.position);
    setBackgroundRepeat(selectedBackgroundOverride.repeat);
    setBackgroundBlendMode(selectedBackgroundOverride.blendMode ?? "normal");
  }, [selectedBackgroundOverride]);

  useEffect(() => {
    if (!activeStyleTarget || activeTargetKind !== "container" || !selectedBackgroundOverride) {
      return;
    }

    if (
      selectedBackgroundOverride.size === backgroundSize &&
      selectedBackgroundOverride.position === backgroundPosition &&
      selectedBackgroundOverride.repeat === backgroundRepeat &&
      (selectedBackgroundOverride.blendMode ?? "normal") === backgroundBlendMode
    ) {
      return;
    }

    setBackgroundOverride({
      ...selectedBackgroundOverride,
      size: backgroundSize,
      position: backgroundPosition,
      repeat: backgroundRepeat,
      blendMode: backgroundBlendMode,
    });
  }, [
    activeStyleTarget,
    activeTargetKind,
    selectedBackgroundOverride,
    backgroundSize,
    backgroundPosition,
    backgroundRepeat,
    backgroundBlendMode,
    setBackgroundOverride,
  ]);

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
      maxWidth: 1200,
      opacity: 1,
      borderRadius: 0,
      borderWidth: 0,
      borderColor: "#475569",
      xOffset: 0,
      yOffset: 0,
      rotation: 0,
      zIndex: 0,
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
      blendMode: backgroundBlendMode,
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

  const updateSelectedImageOverride = (updates: {
    objectFit?: WillardImageObjectFit;
    objectPositionX?: number;
    objectPositionY?: number;
    width?: number;
    maxWidth?: number;
    opacity?: number;
    borderRadius?: number;
    borderWidth?: number;
    borderColor?: string;
    xOffset?: number;
    yOffset?: number;
    rotation?: number;
    zIndex?: number;
  }) => {
    if (!activeStyleTarget || activeTargetKind !== "image" || !selectedImageOverride) {
      return;
    }

    setImageOverride({
      ...selectedImageOverride,
      ...updates,
      targetId: activeStyleTarget,
    });
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

  const canCurateLocally = process.env.NODE_ENV === "development";

  const handleApproveAsset = async (asset: WillardAsset) => {
    if (!canCurateLocally) {
      window.alert("Approve is only available in local/dev mode.");
      return;
    }

    const suggested = asset.suggestedCategory || asset.category || "image";
    const input = window.prompt(
      "Approve asset category (image, background, texture, paper, overlay, tape, sticker, frame, shape, mask, edge, callout, module-frame)",
      suggested
    );
    if (!input) {
      return;
    }

    const category = normalizeReviewCategory(input);
    if (!category) {
      window.alert("Invalid category.");
      return;
    }

    setActionAssetId(asset.id);
    try {
      const response = await fetch("/api/willard/assets/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          localPath: asset.pathname ?? asset.url,
          sourceKind: asset.sourceKind,
          category,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Approve failed.");
      }

      await loadAssets();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Approve failed.");
    } finally {
      setActionAssetId(null);
    }
  };

  const handleDenyAsset = async (asset: WillardAsset) => {
    if (!canCurateLocally) {
      window.alert("Deny is only available in local/dev mode.");
      return;
    }

    if (!window.confirm(`Deny and remove ${asset.filename}?`)) {
      return;
    }

    setActionAssetId(asset.id);
    try {
      const response = await fetch("/api/willard/assets/deny", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          localPath: asset.pathname ?? asset.url,
          sourceKind: asset.sourceKind,
          reason: "Denied in local review queue",
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Deny failed.");
      }

      await loadAssets();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Deny failed.");
    } finally {
      setActionAssetId(null);
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

            {!isLoading && filteredAssets.length > 0 && selectedFilter === "needs-review" ? (
              <div className={styles.assetActionStack}>
                {filteredAssets.map((asset) => {
                  const disabled = actionAssetId === asset.id;
                  return (
                    <div key={asset.id} className={styles.assetDetails}>
                      <img src={asset.url} alt={asset.altText ?? asset.filename} className={styles.assetDetailsThumb} />
                      <dl className={styles.assetDetailsList}>
                        <div>
                          <dt>Filename</dt>
                          <dd>{asset.filename}</dd>
                        </div>
                        <div>
                          <dt>Suggested category</dt>
                          <dd>{asset.suggestedCategory ?? asset.category ?? "image"}</dd>
                        </div>
                        <div>
                          <dt>Provider / license</dt>
                          <dd>{asset.sourceNotes ?? "Unknown source"}</dd>
                        </div>
                        <div>
                          <dt>Status</dt>
                          <dd>{resolveAssetStatus(asset)}</dd>
                        </div>
                      </dl>
                      <div className={styles.assetActionStack}>
                        <button
                          type="button"
                          className={styles.assetPrimaryButton}
                          disabled={disabled || !canCurateLocally}
                          onClick={() => handleApproveAsset(asset)}
                          title={!canCurateLocally ? "Local/dev only" : "Approve asset"}
                        >
                          {disabled ? "Working..." : "Approve"}
                        </button>
                        <button
                          type="button"
                          className={styles.assetDangerButton}
                          disabled={disabled || !canCurateLocally}
                          onClick={() => handleDenyAsset(asset)}
                          title={!canCurateLocally ? "Local/dev only" : "Deny asset"}
                        >
                          {disabled ? "Working..." : "Deny"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {!isLoading && filteredAssets.length > 0 && selectedFilter !== "needs-review" ? (
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
                      <span className={styles.assetCardMeta}>{asset.category} · {resolveAssetStatus(asset)}</span>
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
                  title="Restores the original image src and styles. The asset stays in the library."
                >
                  Remove image override
                </button>
                <p className={styles.overrideNote}>Restores original image · Asset stays in library</p>

                {selectedImageOverride ? (
                  <div className={styles.assetOverrideControls}>
                    <div className={styles.assetControlRow}>
                      <label className={styles.assetControlLabel} htmlFor="willard-image-object-fit">
                        Object fit
                      </label>
                      <select
                        id="willard-image-object-fit"
                        className={styles.assetCompactSelect}
                        value={selectedImageOverride.objectFit}
                        onChange={(event) =>
                          updateSelectedImageOverride({
                            objectFit: event.target.value as WillardImageObjectFit,
                          })
                        }
                      >
                        {IMAGE_OBJECT_FIT_OPTIONS.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.assetControlRow}>
                      <label className={styles.assetControlLabel} htmlFor="willard-image-focal-x">
                        Focal X
                      </label>
                      <input
                        id="willard-image-focal-x"
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        className={styles.assetCompactRange}
                        value={selectedImageOverride.objectPositionX}
                        onChange={(event) =>
                          updateSelectedImageOverride({
                            objectPositionX: clampNumber(Number(event.target.value), 0, 100),
                          })
                        }
                      />
                      <span className={styles.assetValueLabel}>{selectedImageOverride.objectPositionX}%</span>
                    </div>

                    <div className={styles.assetControlRow}>
                      <label className={styles.assetControlLabel} htmlFor="willard-image-focal-y">
                        Focal Y
                      </label>
                      <input
                        id="willard-image-focal-y"
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        className={styles.assetCompactRange}
                        value={selectedImageOverride.objectPositionY}
                        onChange={(event) =>
                          updateSelectedImageOverride({
                            objectPositionY: clampNumber(Number(event.target.value), 0, 100),
                          })
                        }
                      />
                      <span className={styles.assetValueLabel}>{selectedImageOverride.objectPositionY}%</span>
                    </div>

                    <div className={styles.assetControlRow}>
                      <label className={styles.assetControlLabel} htmlFor="willard-image-width">
                        Width
                      </label>
                      <input
                        id="willard-image-width"
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        className={styles.assetCompactRange}
                        value={selectedImageOverride.width}
                        onChange={(event) =>
                          updateSelectedImageOverride({
                            width: clampNumber(Number(event.target.value), 0, 100),
                          })
                        }
                      />
                      <span className={styles.assetValueLabel}>{selectedImageOverride.width}%</span>
                    </div>

                    <div className={styles.assetControlRow}>
                      <label className={styles.assetControlLabel} htmlFor="willard-image-max-width">
                        Max width
                      </label>
                      <input
                        id="willard-image-max-width"
                        type="number"
                        min={0}
                        max={4000}
                        step={10}
                        className={styles.assetCompactNumber}
                        value={selectedImageOverride.maxWidth}
                        onChange={(event) =>
                          updateSelectedImageOverride({
                            maxWidth: clampNumber(Number(event.target.value), 0, 4000),
                          })
                        }
                      />
                      <span className={styles.assetValueLabel}>px</span>
                    </div>

                    <div className={styles.assetControlRow}>
                      <label className={styles.assetControlLabel} htmlFor="willard-image-opacity">
                        Opacity
                      </label>
                      <input
                        id="willard-image-opacity"
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        className={styles.assetCompactRange}
                        value={selectedImageOverride.opacity}
                        onChange={(event) =>
                          updateSelectedImageOverride({
                            opacity: clampNumber(Number(event.target.value), 0, 1),
                          })
                        }
                      />
                      <span className={styles.assetValueLabel}>{selectedImageOverride.opacity.toFixed(2)}</span>
                    </div>

                    <div className={styles.assetControlRow}>
                      <label className={styles.assetControlLabel} htmlFor="willard-image-border-radius">
                        Border radius
                      </label>
                      <input
                        id="willard-image-border-radius"
                        type="number"
                        min={0}
                        max={1000}
                        step={1}
                        className={styles.assetCompactNumber}
                        value={selectedImageOverride.borderRadius}
                        onChange={(event) =>
                          updateSelectedImageOverride({
                            borderRadius: clampNumber(Number(event.target.value), 0, 1000),
                          })
                        }
                      />
                      <span className={styles.assetValueLabel}>px</span>
                    </div>

                    <div className={styles.assetControlRow}>
                      <label className={styles.assetControlLabel} htmlFor="willard-image-border-width">
                        Border width
                      </label>
                      <input
                        id="willard-image-border-width"
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        className={styles.assetCompactNumber}
                        value={selectedImageOverride.borderWidth}
                        onChange={(event) =>
                          updateSelectedImageOverride({
                            borderWidth: clampNumber(Number(event.target.value), 0, 100),
                          })
                        }
                      />
                      <span className={styles.assetValueLabel}>px</span>
                    </div>

                    <div className={styles.assetControlRow}>
                      <label className={styles.assetControlLabel} htmlFor="willard-image-border-color">
                        Border color
                      </label>
                      <input
                        id="willard-image-border-color"
                        type="color"
                        className={styles.assetCompactColor}
                        value={normalizeColorInputValue(selectedImageOverride.borderColor)}
                        onChange={(event) =>
                          updateSelectedImageOverride({
                            borderColor: event.target.value,
                          })
                        }
                      />
                      <span className={styles.assetValueLabel}>{selectedImageOverride.borderColor}</span>
                    </div>

                    <div className={styles.assetControlRow}>
                      <label className={styles.assetControlLabel} htmlFor="willard-image-offset-x">
                        X offset
                      </label>
                      <input
                        id="willard-image-offset-x"
                        type="range"
                        min={-500}
                        max={500}
                        step={1}
                        className={styles.assetCompactRange}
                        value={selectedImageOverride.xOffset}
                        onChange={(event) =>
                          updateSelectedImageOverride({
                            xOffset: clampNumber(Number(event.target.value), -500, 500),
                          })
                        }
                      />
                      <span className={styles.assetValueLabel}>{selectedImageOverride.xOffset}px</span>
                    </div>

                    <div className={styles.assetControlRow}>
                      <label className={styles.assetControlLabel} htmlFor="willard-image-offset-y">
                        Y offset
                      </label>
                      <input
                        id="willard-image-offset-y"
                        type="range"
                        min={-500}
                        max={500}
                        step={1}
                        className={styles.assetCompactRange}
                        value={selectedImageOverride.yOffset}
                        onChange={(event) =>
                          updateSelectedImageOverride({
                            yOffset: clampNumber(Number(event.target.value), -500, 500),
                          })
                        }
                      />
                      <span className={styles.assetValueLabel}>{selectedImageOverride.yOffset}px</span>
                    </div>

                    <div className={styles.assetControlRow}>
                      <label className={styles.assetControlLabel} htmlFor="willard-image-rotation">
                        Rotation
                      </label>
                      <input
                        id="willard-image-rotation"
                        type="range"
                        min={-180}
                        max={180}
                        step={1}
                        className={styles.assetCompactRange}
                        value={selectedImageOverride.rotation}
                        onChange={(event) =>
                          updateSelectedImageOverride({
                            rotation: clampNumber(Number(event.target.value), -180, 180),
                          })
                        }
                      />
                      <span className={styles.assetValueLabel}>{selectedImageOverride.rotation}deg</span>
                    </div>

                    <div className={styles.assetControlRow}>
                      <label className={styles.assetControlLabel} htmlFor="willard-image-z-index">
                        Z-index
                      </label>
                      <input
                        id="willard-image-z-index"
                        type="number"
                        min={-20}
                        max={20}
                        step={1}
                        className={styles.assetCompactNumber}
                        value={selectedImageOverride.zIndex}
                        onChange={(event) =>
                          updateSelectedImageOverride({
                            zIndex: clampNumber(Number(event.target.value), -20, 20),
                          })
                        }
                      />
                      <span className={styles.assetValueLabel}>safe</span>
                    </div>
                  </div>
                ) : null}
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

                <label className={styles.assetFieldLabel} htmlFor="willard-bg-blend-mode">
                  Background blend mode
                </label>
                <select
                  id="willard-bg-blend-mode"
                  className={styles.assetSelect}
                  value={backgroundBlendMode}
                  onChange={(event) => setBackgroundBlendMode(event.target.value as WillardBackgroundBlendMode)}
                >
                  {BACKGROUND_BLEND_MODE_OPTIONS.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
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
                  title="Restores the original background. The asset stays in the library."
                >
                  Remove background override
                </button>
                <p className={styles.overrideNote}>Restores original background · Asset stays in library</p>
              </div>
            ) : null}

            {activeStyleTarget && activeTargetKind !== "image" && activeTargetKind !== "container" ? (
              <p className={styles.assetLibraryMuted}>
                This target kind does not support asset replacement in Phase 3.
              </p>
            ) : null}
          </section>

          <section className={styles.assetLibrarySection}>
            <h3 className={styles.assetLibrarySectionTitle}>Bulk Reset Overrides</h3>
            <p className={styles.assetLibraryMuted}>
              Clear all overrides of a type. Assets remain in the library. Style variables are not affected.
            </p>
            <div className={styles.assetActionStack}>
              <button
                type="button"
                className={styles.assetDangerButton}
                disabled={imageOverrides.length === 0}
                onClick={() => {
                  if (
                    window.confirm(
                      `Reset all ${imageOverrides.length} image override${imageOverrides.length !== 1 ? "s" : ""}? This removes all image replacements. Assets are not deleted.`
                    )
                  ) {
                    clearAllImageOverrides();
                  }
                }}
              >
                Reset all image overrides ({imageOverrides.length})
              </button>
              <button
                type="button"
                className={styles.assetDangerButton}
                disabled={backgroundOverrides.length === 0}
                onClick={() => {
                  if (
                    window.confirm(
                      `Reset all ${backgroundOverrides.length} background override${backgroundOverrides.length !== 1 ? "s" : ""}? This removes all background replacements. Assets are not deleted.`
                    )
                  ) {
                    clearAllBackgroundOverrides();
                  }
                }}
              >
                Reset all background overrides ({backgroundOverrides.length})
              </button>
            </div>
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
                    <dd>
                      {resolveAssetStatus(selectedAsset)} · {selectedAsset.readonly ? "Read-only" : "Editable"}
                    </dd>
                  </div>
                  <div>
                    <dt>Quality score</dt>
                    <dd>{typeof selectedAsset.qualityScore === "number" ? selectedAsset.qualityScore : "Not scored"}</dd>
                  </div>
                  <div>
                    <dt>Needs review</dt>
                    <dd>{selectedAsset.reviewRequired ? "Yes" : "No"}</dd>
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
  const status = resolveAssetStatus(asset);

  if (filterId === "approved") {
    return status === "approved";
  }

  if (filterId === "needs-review") {
    return asset.reviewRequired === true || status === "staging";
  }

  if (filterId === "demo-hidden") {
    return status === "demo";
  }

  if (filterId === "denied") {
    return status === "denied" || status === "rejected";
  }

  if (filterId === "rejected") {
    return status === "rejected" || status === "denied";
  }

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
    return asset.category === "texture" || asset.category === "paper";
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

function resolveAssetStatus(asset: WillardAsset): WillardAssetStatus {
  const normalized = (asset.status ?? "").trim().toLowerCase();
  if (
    normalized === "approved" ||
    normalized === "staging" ||
    normalized === "denied" ||
    normalized === "rejected" ||
    normalized === "demo"
  ) {
    return normalized;
  }

  if (asset.reviewRequired) {
    return "staging";
  }

  if (asset.sourceKind === "uploaded") {
    return "approved";
  }

  return "staging";
}

function normalizeReviewCategory(value: string): string {
  const normalized = value.trim().toLowerCase();
  const allowed = new Set([
    "image",
    "background",
    "texture",
    "paper",
    "overlay",
    "tape",
    "sticker",
    "frame",
    "shape",
    "mask",
    "edge",
    "callout",
    "module-frame",
  ]);
  return allowed.has(normalized) ? normalized : "";
}

function assetTimestamp(asset: WillardAsset): number {
  const primary = new Date(asset.createdAt).getTime();
  if (Number.isFinite(primary)) {
    return primary;
  }
  const fallback = new Date(asset.updatedAt).getTime();
  return Number.isFinite(fallback) ? fallback : 0;
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

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function normalizeColorInputValue(value: string): string {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed;
  }
  return "#475569";
}
