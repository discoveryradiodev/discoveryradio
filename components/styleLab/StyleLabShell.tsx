"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { StyleLabProvider } from "@/lib/dev/style-lab-context";
import { useStyleLab } from "@/lib/dev/style-lab-context";
import {
  STYLE_TARGET_REGISTRY,
  TARGET_TO_KIND,
  isStyleTargetId,
  type StyleTargetId,
} from "@/lib/dev/style-lab-inspect";
import {
  WILLARD_PREVIEW_SELECTION_STORAGE_KEY,
  buildWillardPreviewUrl,
  createWillardPreviewChannel,
  normalizeWillardPreviewTarget,
  postWillardPreviewMessage,
  writeWillardPreviewSnapshot,
  type WillardPreviewMessage,
} from "@/lib/dev/willard-preview-sync";
import { AssetLibraryPanel } from "./AssetLibraryPanel";
import { ControlPanel } from "./ControlPanel";
import { LayersPanel } from "./LayersPanel";
import { PreviewArea, type PreviewAreaHandle } from "./PreviewArea";
import styles from "./styleLab.module.css";

type ApplyStatus = {
  kind: "success" | "error";
  message: string;
} | null;

interface StyleLabShellProps {
  canApplyToSource?: boolean;
}

type PreviewDisplayMode = "docked" | "popout" | "hidden";
type PreviewHeightMode = "viewport" | "full-page";
type ActiveTool = "style" | "assets" | "review" | "layers" | "shapes" | "source" | null;
type ActiveModal = "apply-confirmation" | null;

const PREVIEW_TARGETS = [
  {
    id: "feed-homepage",
    label: "Feed Homepage",
    description: "Spotlight card on /the-feed",
  },
  {
    id: "live-spotlight",
    label: "Live Spotlight Page",
    description: "Full article on /the-feed/spotlight/[slug]",
  },
  {
    id: "live-blog",
    label: "Live Blog Page",
    description: "Weekly blog on /the-feed/blog/[slug]",
  },
] as const;

function StyleLabShellInner({ canApplyToSource = false }: StyleLabShellProps) {
  const [activeTarget, setActiveTarget] = useState("feed-homepage");
  const [inspectMode, setInspectMode] = useState(false);
  const [activeStyleTarget, setActiveStyleTarget] = useState<StyleTargetId | null>(null);
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [previewDisplayMode, setPreviewDisplayMode] = useState<PreviewDisplayMode>("docked");
  const [previewHeightMode, setPreviewHeightMode] = useState<PreviewHeightMode>("full-page");
  const [showDockedWhilePopout, setShowDockedWhilePopout] = useState(false);
  const [previewNotice, setPreviewNotice] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [applyStatus, setApplyStatus] = useState<ApplyStatus>(null);
  const [confirmApplyChecked, setConfirmApplyChecked] = useState(false);
  const previewRef = useRef<PreviewAreaHandle>(null);
  const popoutWindowRef = useRef<Window | null>(null);
  const previewChannelRef = useRef<BroadcastChannel | null>(null);
  const {
    resetToDefaults,
    variables,
    getTargetValue,
    assets,
    imageOverrides,
    backgroundOverrides,
    overlayDrafts,
    isLoaded,
  } = useStyleLab();

  const changedTargetCount = useMemo(() => {
    const seen = new Set<string>();
    for (const k of Object.keys(variables)) {
      const sep = k.indexOf("__");
      if (sep !== -1) {
        seen.add(k.slice(0, sep));
      }
    }
    return seen.size;
  }, [variables]);

  const sourceApplicableChangesCount =
    changedTargetCount + imageOverrides.length + backgroundOverrides.length;
  const hasSourceChanges = sourceApplicableChangesCount > 0;
  const overlayPreviewOnlyCount = overlayDrafts.length;

  const reviewQueueCount = useMemo(
    () => assets.filter((asset) => String(asset.status ?? "").toLowerCase() === "staging").length,
    [assets]
  );

  const activeSurface = normalizeWillardPreviewTarget(activeTarget);
  const surfaceLayerCount = useMemo(
    () => overlayDrafts.filter((draft) => draft.surface === activeSurface).length,
    [overlayDrafts, activeSurface]
  );

  const showDockedPreview =
    previewDisplayMode === "docked" ||
    (previewDisplayMode === "popout" && showDockedWhilePopout);

  const openTool = (tool: Exclude<ActiveTool, null>) => {
    setActiveModal(null);
    setActiveTool(tool);
  };

  const handleStyleTargetSelect = (targetId: StyleTargetId) => {
    setActiveStyleTarget(targetId);
    setActiveTool("style");
  };

  const handleCloseStyleTool = () => {
    setActiveTool(null);
    setActiveStyleTarget(null);
  };

  const handleClearSelection = () => {
    setActiveStyleTarget(null);
    if (activeTool === "style") {
      setActiveTool(null);
    }
    postWillardPreviewMessage(previewChannelRef.current, { type: "clear-selection" });
  };

  const handlePreviewSelectionFromPopout = (targetId: StyleTargetId) => {
    setActiveStyleTarget(targetId);
    setActiveTool("style");
  };

  const handleTargetChange = (nextTarget: string) => {
    setActiveTarget(nextTarget);
    handleClearSelection();
  };

  const handleOpenPopoutPreview = () => {
    setPreviewNotice(null);

    const safeTarget = normalizeWillardPreviewTarget(activeTarget);
    const popoutUrl = buildWillardPreviewUrl(safeTarget);
    const previewWindow = window.open(
      popoutUrl,
      "willard-preview-window",
      "popup=yes,width=1440,height=900,resizable=yes,scrollbars=yes"
    );

    if (!previewWindow) {
      setPreviewNotice("Pop-out was blocked by the browser. Allow pop-ups for this site and try again.");
      return;
    }

    popoutWindowRef.current = previewWindow;
    setPreviewDisplayMode("popout");
    setShowDockedWhilePopout(false);
    setPreviewNotice("Pop-out preview opened in a separate window.");

    if (isLoaded) {
      writeWillardPreviewSnapshot({
        variables,
        imageOverrides,
        backgroundOverrides,
        overlayDrafts,
        target: safeTarget,
        inspectMode,
        updatedAt: Date.now(),
      });
    }

    postWillardPreviewMessage(previewChannelRef.current, {
      type: "style-state",
      variables,
      imageOverrides,
      backgroundOverrides,
      overlayDrafts,
    });
    postWillardPreviewMessage(previewChannelRef.current, {
      type: "preview-target",
      target: safeTarget,
    });
    postWillardPreviewMessage(previewChannelRef.current, {
      type: "inspect-mode",
      enabled: inspectMode,
    });
  };

  const handleReset = () => {
    previewRef.current?.clearAllStyles();
    resetToDefaults();
    setApplyStatus(null);
    handleCloseStyleTool();
  };

  const performApplyToSource = async () => {
    if (!canApplyToSource || isApplying || !hasSourceChanges) {
      return;
    }

    setIsApplying(true);
    setApplyStatus(null);

    try {
      const response = await fetch("/api/willard/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          variables,
          backgroundOverrides,
          imageOverrides,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
        filePath?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to apply Willard styles to source.");
      }

      const locationSuffix = payload?.filePath ? ` Updated ${payload.filePath}.` : "";
      setApplyStatus({
        kind: "success",
        message: `${payload?.message ?? "Local source file updated."}${locationSuffix}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to apply Willard styles to source.";
      setApplyStatus({ kind: "error", message });
    } finally {
      setIsApplying(false);
      setActiveModal(null);
      setConfirmApplyChecked(false);
    }
  };

  const openApplyConfirmation = () => {
    if (!canApplyToSource || !isLoaded || isApplying || !hasSourceChanges) {
      return;
    }

    setActiveModal("apply-confirmation");
    setConfirmApplyChecked(false);
  };

  useEffect(() => {
    const channel = createWillardPreviewChannel();
    previewChannelRef.current = channel;

    const handleSelectedTargetMessage = (message: WillardPreviewMessage) => {
      if (message.type !== "selected-target") {
        return;
      }

      if (!isStyleTargetId(message.targetId)) {
        return;
      }

      handlePreviewSelectionFromPopout(message.targetId);
    };

    const handleStorageSelection = (event: StorageEvent) => {
      if (event.key !== WILLARD_PREVIEW_SELECTION_STORAGE_KEY || !event.newValue) {
        return;
      }

      try {
        const payload = JSON.parse(event.newValue) as { targetId?: string };
        const candidateTargetId = payload.targetId ?? null;
        if (isStyleTargetId(candidateTargetId)) {
          handlePreviewSelectionFromPopout(candidateTargetId);
        }
      } catch {
        // ignore parse errors from malformed storage writes
      }
    };

    if (channel) {
      const listener = (event: MessageEvent<WillardPreviewMessage>) => {
        handleSelectedTargetMessage(event.data);
      };
      channel.addEventListener("message", listener);

      window.addEventListener("storage", handleStorageSelection);

      return () => {
        channel.removeEventListener("message", listener);
        channel.close();
        previewChannelRef.current = null;
        window.removeEventListener("storage", handleStorageSelection);
      };
    }

    window.addEventListener("storage", handleStorageSelection);
    return () => {
      window.removeEventListener("storage", handleStorageSelection);
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const safeTarget = normalizeWillardPreviewTarget(activeTarget);
    writeWillardPreviewSnapshot({
      variables,
      imageOverrides,
      backgroundOverrides,
      overlayDrafts,
      target: safeTarget,
      inspectMode,
      updatedAt: Date.now(),
    });

    postWillardPreviewMessage(previewChannelRef.current, {
      type: "style-state",
      variables,
      imageOverrides,
      backgroundOverrides,
      overlayDrafts,
    });
    postWillardPreviewMessage(previewChannelRef.current, {
      type: "preview-target",
      target: safeTarget,
    });
    postWillardPreviewMessage(previewChannelRef.current, {
      type: "inspect-mode",
      enabled: inspectMode,
    });
  }, [
    variables,
    imageOverrides,
    backgroundOverrides,
    overlayDrafts,
    activeTarget,
    inspectMode,
    isLoaded,
  ]);

  useEffect(() => {
    if (previewDisplayMode !== "popout") {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (popoutWindowRef.current && popoutWindowRef.current.closed) {
        popoutWindowRef.current = null;
        setPreviewNotice("Pop-out preview window was closed.");
      }
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [previewDisplayMode]);

  const styleRibbonText = (() => {
    if (!activeStyleTarget) {
      return "Turn on Inspect Mode and select a target to edit styles.";
    }

    const targetLabel = STYLE_TARGET_REGISTRY[activeStyleTarget]?.label ?? activeStyleTarget;
    const targetKind = TARGET_TO_KIND[activeStyleTarget];

    if (targetKind === "image") {
      const fit = getTargetValue(activeStyleTarget, "object-fit") ?? "cover";
      const width = getTargetValue(activeStyleTarget, "width") ?? "100";
      const opacity = getTargetValue(activeStyleTarget, "opacity") ?? "1";
      return `STYLE: ${targetLabel} | Fit ${fit} | Width ${width}% | Opacity ${opacity} | More...`;
    }

    return `STYLE: ${targetLabel} | Edit typography, spacing, color, and effects.`;
  })();

  return (
    <div className={styles.shell}>
      <div className={styles.topStack}>
        <div className={styles.compactToolbar}>
          <div className={styles.toolbarBrand}>WILLARD</div>

          <div className={styles.toolbarGroup}>
            <span className={styles.toolbarLabel}>Preview Target</span>
            <div className={styles.toolbarButtons}>
              {PREVIEW_TARGETS.map((target) => (
                <button
                  key={target.id}
                  onClick={() => handleTargetChange(target.id)}
                  className={`${styles.toolbarButton} ${
                    activeTarget === target.id ? styles.toolbarButtonActive : ""
                  }`}
                  title={target.description}
                >
                  {target.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.toolbarGroup}>
            <span className={styles.toolbarLabel}>Preview Height</span>
            <div className={styles.toolbarButtons}>
              <button
                onClick={() => setPreviewHeightMode("viewport")}
                className={`${styles.toolbarButton} ${
                  previewHeightMode === "viewport" ? styles.toolbarButtonActive : ""
                }`}
                title="Fixed viewport-like preview height"
              >
                Viewport
              </button>
              <button
                onClick={() => setPreviewHeightMode("full-page")}
                className={`${styles.toolbarButton} ${
                  previewHeightMode === "full-page" ? styles.toolbarButtonActive : ""
                }`}
                title="Expand iframe to full content height"
              >
                Full Page
              </button>
            </div>
          </div>

          <div className={styles.toolbarGroup}>
            <span className={styles.toolbarLabel}>Preview Mode</span>
            <div className={styles.toolbarButtons}>
              <button
                onClick={() => setPreviewDisplayMode("docked")}
                className={`${styles.toolbarButton} ${
                  previewDisplayMode === "docked" ? styles.toolbarButtonActive : ""
                }`}
                title="Keep preview docked inside /willard"
              >
                Docked
              </button>
              <button
                onClick={handleOpenPopoutPreview}
                className={`${styles.toolbarButton} ${
                  previewDisplayMode === "popout" ? styles.toolbarButtonActive : ""
                }`}
                title="Open preview in a separate window"
              >
                Pop Out Preview
              </button>
              <button
                onClick={() => setPreviewDisplayMode("hidden")}
                className={`${styles.toolbarButton} ${
                  previewDisplayMode === "hidden" ? styles.toolbarButtonActive : ""
                }`}
                title="Hide docked preview and focus on tools"
              >
                Hidden
              </button>
              {previewDisplayMode === "popout" ? (
                <button
                  onClick={() => setShowDockedWhilePopout((prev) => !prev)}
                  className={styles.toolbarButton}
                  title="Toggle docked preview while pop-out is active"
                >
                  {showDockedWhilePopout ? "Hide Docked" : "Show Docked"}
                </button>
              ) : null}
            </div>
          </div>

          <div className={styles.toolbarGroup}>
            <span className={styles.toolbarLabel}>Inspect</span>
            <div className={styles.toolbarButtons}>
              <button
                onClick={() => setInspectMode((prev) => !prev)}
                className={`${styles.inspectToggle} ${inspectMode ? styles.inspectActive : ""}`}
                title={
                  inspectMode
                    ? "Inspect mode ON - click to turn off"
                    : "Click to enable inspect mode"
                }
              >
                {inspectMode ? "Inspect On" : "Inspect Off"}
              </button>
            </div>
          </div>

          <div className={styles.toolbarMeta}>
            <p className={styles.selectedTargetLine}>
              Selected target: {activeStyleTarget ? STYLE_TARGET_REGISTRY[activeStyleTarget].label : "None"}
            </p>
            {hasSourceChanges ? (
              <p className={styles.changesSummary}>
                Changed: {changedTargetCount} style target{changedTargetCount !== 1 ? "s" : ""} · {imageOverrides.length} image override{imageOverrides.length !== 1 ? "s" : ""} · {backgroundOverrides.length} background override{backgroundOverrides.length !== 1 ? "s" : ""} · {overlayDrafts.length} overlay layer{overlayDrafts.length !== 1 ? "s" : ""}
              </p>
            ) : null}
            {previewNotice ? <p className={styles.previewModeNote}>{previewNotice}</p> : null}
            {applyStatus ? (
              <p
                className={`${styles.applyStatus} ${
                  applyStatus.kind === "error" ? styles.applyStatusError : styles.applyStatusSuccess
                }`}
              >
                {applyStatus.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className={styles.toolTabsRow}>
          <button
            type="button"
            className={`${styles.toolTabButton} ${activeTool === "style" ? styles.toolTabButtonActive : ""}`}
            onClick={() => openTool("style")}
          >
            Style
          </button>
          <button
            type="button"
            className={`${styles.toolTabButton} ${activeTool === "assets" ? styles.toolTabButtonActive : ""}`}
            onClick={() => openTool("assets")}
          >
            Assets
          </button>
          <button
            type="button"
            className={`${styles.toolTabButton} ${activeTool === "review" ? styles.toolTabButtonActive : ""}`}
            onClick={() => openTool("review")}
          >
            Review Queue
          </button>
          <button
            type="button"
            className={`${styles.toolTabButton} ${activeTool === "layers" ? styles.toolTabButtonActive : ""}`}
            onClick={() => openTool("layers")}
          >
            Layers
          </button>
          <button
            type="button"
            className={`${styles.toolTabButton} ${activeTool === "shapes" ? styles.toolTabButtonActive : ""}`}
            onClick={() => openTool("shapes")}
          >
            Shapes
          </button>
          <button
            type="button"
            className={`${styles.toolTabButton} ${activeTool === "source" ? styles.toolTabButtonActive : ""}`}
            onClick={() => openTool("source")}
          >
            Source
          </button>
        </div>

        {activeTool ? (
          <div className={styles.ribbonContent}>
            {activeTool === "style" ? (
              <>
                <p className={styles.ribbonText}>{styleRibbonText}</p>
                <div className={styles.ribbonActions}>
                  <button
                    type="button"
                    className={styles.toolbarButton}
                    onClick={() => setActiveTool(null)}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : null}

            {activeTool === "assets" ? (
              <>
                <p className={styles.ribbonText}>ASSETS: Approved | Category: All | Search | Open Library</p>
                <div className={styles.ribbonActions}>
                  <button type="button" className={styles.toolbarButton} onClick={() => openTool("assets")}>
                    Open Library
                  </button>
                </div>
              </>
            ) : null}

            {activeTool === "review" ? (
              <>
                <p className={styles.ribbonText}>
                  REVIEW: {reviewQueueCount} waiting | Newest first | Open Queue
                </p>
                <div className={styles.ribbonActions}>
                  <button type="button" className={styles.toolbarButton} onClick={() => openTool("review")}>
                    Open Queue
                  </button>
                </div>
              </>
            ) : null}

            {activeTool === "layers" ? (
              <>
                <p className={styles.ribbonText}>LAYERS: {surfaceLayerCount} layers | Open Layers</p>
                <div className={styles.ribbonActions}>
                  <button type="button" className={styles.toolbarButton} onClick={() => openTool("layers")}>
                    Open Layers
                  </button>
                </div>
              </>
            ) : null}

            {activeTool === "shapes" ? (
              <>
                <p className={styles.ribbonText}>SHAPES: Coming soon | Open Shapes</p>
                <div className={styles.ribbonActions}>
                  <button type="button" className={styles.toolbarButton} disabled>
                    Open Shapes
                  </button>
                </div>
              </>
            ) : null}

            {activeTool === "source" ? (
              <>
                <p className={styles.ribbonText}>
                  SOURCE: {changedTargetCount} style targets source-applicable | {imageOverrides.length} image overrides source-applicable | {backgroundOverrides.length} backgrounds source-applicable | {overlayPreviewOnlyCount} overlay drafts preview-only | Apply to Source
                </p>
                <div className={styles.ribbonActions}>
                  <button
                    type="button"
                    className={styles.applyButton}
                    onClick={openApplyConfirmation}
                    disabled={!canApplyToSource || !isLoaded || isApplying || !hasSourceChanges}
                    title={
                      canApplyToSource
                        ? "Apply current Willard changes to local generated source files"
                        : "Source apply is available only on local/dev runs"
                    }
                  >
                    {isApplying ? "Applying..." : "Apply to Source"}
                  </button>
                  <button type="button" className={styles.toolbarButton} onClick={() => setActiveTool(null)}>
                    Close
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {activeTool === "style" && activeStyleTarget ? (
        <section className={styles.toolSurfacePanel}>
          <ControlPanel
            activeTarget={activeTarget}
            activeStyleTarget={activeStyleTarget}
            onClose={handleCloseStyleTool}
            onReset={handleReset}
          />
        </section>
      ) : null}

      {showDockedPreview ? (
        <section className={styles.previewDockedSection}>
          <PreviewArea
            ref={previewRef}
            activeTarget={activeTarget}
            inspectMode={inspectMode}
            activeStyleTarget={activeStyleTarget}
            onStyleTargetSelect={handleStyleTargetSelect}
            onClearSelection={handleClearSelection}
            previewHeightMode={previewHeightMode}
          />
        </section>
      ) : (
        <section className={styles.previewHiddenNoticeWrap}>
          <p className={styles.previewModeNote}>Docked preview is hidden. Use Pop Out Preview or switch back to Docked mode.</p>
        </section>
      )}

      <AssetLibraryPanel
        isOpen={activeTool === "assets" || activeTool === "review"}
        onClose={() => setActiveTool(null)}
        activeStyleTarget={activeStyleTarget}
        activeSurface={activeSurface}
        forcedFilter={activeTool === "review" ? "needs-review" : "approved"}
      />

      <LayersPanel
        isOpen={activeTool === "layers"}
        onClose={() => setActiveTool(null)}
        activeSurface={activeSurface}
      />

      {activeModal === "apply-confirmation" ? (
        <div className={styles.confirmLayer} role="dialog" aria-modal="true" aria-label="Confirm apply to source">
          <div className={styles.confirmBackdrop} onClick={() => setActiveModal(null)} />
          <div className={styles.confirmCard}>
            <h2 className={styles.confirmTitle}>Apply Willard Changes to Source?</h2>
            <p className={styles.confirmText}>This writes local generated source files and should be intentional.</p>
            <ul className={styles.confirmList}>
              <li>Changed style targets: {changedTargetCount}</li>
              <li>Image overrides: {imageOverrides.length}</li>
              <li>Background overrides: {backgroundOverrides.length}</li>
              <li>Overlay drafts: {overlayPreviewOnlyCount} preview-only, not written yet</li>
            </ul>
            <p className={styles.confirmText}>Expected files:</p>
            <ul className={styles.confirmList}>
              <li>app/the-feed/willard.generated.css</li>
              <li>app/the-feed/willard.generated.images.ts</li>
            </ul>
            <p className={styles.confirmText}>
              Overlay layers are currently preview-only. They will not be written until a generated overlay source file exists.
            </p>
            <label className={styles.confirmCheckLabel}>
              <input
                type="checkbox"
                checked={confirmApplyChecked}
                onChange={(event) => setConfirmApplyChecked(event.target.checked)}
              />
              I understand this writes local generated source files.
            </label>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.assetSecondaryButton} onClick={() => setActiveModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.applyButton}
                onClick={performApplyToSource}
                disabled={!confirmApplyChecked || isApplying}
              >
                {isApplying ? "Applying..." : "Apply"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function StyleLabShell({ canApplyToSource = false }: StyleLabShellProps) {
  return (
    <StyleLabProvider>
      <StyleLabShellInner canApplyToSource={canApplyToSource} />
    </StyleLabProvider>
  );
}
