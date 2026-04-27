"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { StyleLabProvider } from "@/lib/dev/style-lab-context";
import { useStyleLab } from "@/lib/dev/style-lab-context";
import { isStyleTargetId, type StyleTargetId } from "@/lib/dev/style-lab-inspect";
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

// Inner component has access to useStyleLab context
function StyleLabShellInner({ canApplyToSource = false }: StyleLabShellProps) {
  const [activeTarget, setActiveTarget] = useState("feed-homepage");
  const [inspectMode, setInspectMode] = useState(false);
  const [activeStyleTarget, setActiveStyleTarget] = useState<StyleTargetId | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [previewDisplayMode, setPreviewDisplayMode] = useState<PreviewDisplayMode>("docked");
  const [showDockedWhilePopout, setShowDockedWhilePopout] = useState(false);
  const [previewNotice, setPreviewNotice] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isAssetLibraryOpen, setIsAssetLibraryOpen] = useState(false);
  const [applyStatus, setApplyStatus] = useState<ApplyStatus>(null);
  const previewRef = useRef<PreviewAreaHandle>(null);
  const popoutWindowRef = useRef<Window | null>(null);
  const previewChannelRef = useRef<BroadcastChannel | null>(null);
  const {
    resetToDefaults,
    variables,
    imageOverrides,
    backgroundOverrides,
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

  const showDockedPreview =
    previewDisplayMode === "docked" ||
    (previewDisplayMode === "popout" && showDockedWhilePopout);

  const handleStyleTargetSelect = (targetId: StyleTargetId) => {
    setActiveStyleTarget(targetId);
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setActiveStyleTarget(null);
  };

  /** Called when preview target changes — close the panel to avoid mismatched state. */
  const handleClearSelection = () => {
    setIsPanelOpen(false);
    setActiveStyleTarget(null);
    postWillardPreviewMessage(previewChannelRef.current, { type: "clear-selection" });
  };

  const handlePreviewSelectionFromPopout = (targetId: StyleTargetId) => {
    setActiveStyleTarget(targetId);
    setIsPanelOpen(true);
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

  /** Reset clears state AND removes all CSS overrides from the iframe. */
  const handleReset = () => {
    previewRef.current?.clearAllStyles();
    resetToDefaults();
    setApplyStatus(null);
    // Also close any open panel so stale controls aren't shown
    handleClosePanel();
  };

  const handleApplyToSource = async () => {
    if (!canApplyToSource || isApplying) {
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
    }
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
      target: safeTarget,
      inspectMode,
      updatedAt: Date.now(),
    });

    postWillardPreviewMessage(previewChannelRef.current, {
      type: "style-state",
      variables,
      imageOverrides,
      backgroundOverrides,
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

  return (
    <div className={styles.shell}>
      <div className={styles.compactToolbar}>
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
              title="Hide docked preview and focus on controls"
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
          <span className={styles.toolbarLabel}>Actions</span>
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
              {inspectMode ? "✓ Inspect Mode" : "Inspect Mode"}
            </button>
            <button
              onClick={handleApplyToSource}
              className={styles.applyButton}
              disabled={!canApplyToSource || !isLoaded || isApplying}
              title={
                canApplyToSource
                  ? "Write the current Willard target styles into the local source file"
                  : "Source apply is available only on local/dev runs"
              }
            >
              {isApplying ? "Applying..." : "Apply to Source"}
            </button>
            <button
              onClick={() => setIsAssetLibraryOpen(true)}
              className={styles.toolbarButton}
              title="Open the Willard asset library"
            >
              Asset Library
            </button>
          </div>
        </div>

        <div className={styles.toolbarMeta}>
          {changedTargetCount > 0 || imageOverrides.length > 0 || backgroundOverrides.length > 0 ? (
            <p className={styles.changesSummary}>
              Changed:{" "}
              {changedTargetCount > 0 ? `${changedTargetCount} style target${changedTargetCount !== 1 ? "s" : ""}` : null}
              {changedTargetCount > 0 && (imageOverrides.length > 0 || backgroundOverrides.length > 0) ? " · " : null}
              {imageOverrides.length > 0 ? `${imageOverrides.length} image override${imageOverrides.length !== 1 ? "s" : ""}` : null}
              {imageOverrides.length > 0 && backgroundOverrides.length > 0 ? " · " : null}
              {backgroundOverrides.length > 0 ? `${backgroundOverrides.length} background override${backgroundOverrides.length !== 1 ? "s" : ""}` : null}
            </p>
          ) : null}
          {canApplyToSource ? (
            <p className={styles.applyHint}>
              Local apply writes the current Willard state into the feed source file.
            </p>
          ) : (
            <p className={styles.applyHint}>
              Live production stays sandboxed. Source apply is local-only.
            </p>
          )}
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

      <div
        className={`${styles.shellBody} ${
          showDockedPreview ? "" : styles.shellBodyPreviewHidden
        }`}
      >
        {isPanelOpen && activeStyleTarget ? (
          <aside
            className={`${styles.leftPanel} ${
              showDockedPreview ? "" : styles.leftPanelExpanded
            }`}
          >
            <ControlPanel
              activeTarget={activeTarget}
              activeStyleTarget={activeStyleTarget}
              onClose={handleClosePanel}
              onReset={handleReset}
            />
          </aside>
        ) : null}

        {showDockedPreview ? (
          <main className={styles.rightPanel}>
            <PreviewArea
              ref={previewRef}
              activeTarget={activeTarget}
              inspectMode={inspectMode}
              activeStyleTarget={activeStyleTarget}
              onStyleTargetSelect={handleStyleTargetSelect}
              onClearSelection={handleClearSelection}
            />
          </main>
        ) : null}
      </div>

      <AssetLibraryPanel
        isOpen={isAssetLibraryOpen}
        onClose={() => setIsAssetLibraryOpen(false)}
        activeStyleTarget={activeStyleTarget}
        activeSurface={normalizeWillardPreviewTarget(activeTarget)}
      />
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
