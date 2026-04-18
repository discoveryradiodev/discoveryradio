"use client";

import { useRef, useState } from "react";
import { StyleLabProvider } from "@/lib/dev/style-lab-context";
import { useStyleLab } from "@/lib/dev/style-lab-context";
import { type StyleTargetId } from "@/lib/dev/style-lab-inspect";
import { ControlPanel } from "./ControlPanel";
import { PreviewArea, type PreviewAreaHandle } from "./PreviewArea";
import { PreviewSwitcher } from "./PreviewSwitcher";
import styles from "./styleLab.module.css";

type ApplyStatus = {
  kind: "success" | "error";
  message: string;
} | null;

interface StyleLabShellProps {
  canApplyToSource?: boolean;
}

// Inner component has access to useStyleLab context
function StyleLabShellInner({ canApplyToSource = false }: StyleLabShellProps) {
  const [activeTarget, setActiveTarget] = useState("feed-homepage");
  const [inspectMode, setInspectMode] = useState(false);
  const [activeStyleTarget, setActiveStyleTarget] = useState<StyleTargetId | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyStatus, setApplyStatus] = useState<ApplyStatus>(null);
  const previewRef = useRef<PreviewAreaHandle>(null);
  const { resetToDefaults, variables, isLoaded } = useStyleLab();

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
        body: JSON.stringify({ variables }),
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

  return (
    <div className={styles.shell}>
      <header className={styles.shellHeader}>
        <h1 className={styles.shellTitle}>
          /willard — Discovery Radio Style Lab
        </h1>
        <p className={styles.shellSubtitle}>
           Phase 2.75: Live CSS Variables + Inspect Mode
        </p>
      </header>

      <PreviewSwitcher
        activeTarget={activeTarget}
        onTargetChange={setActiveTarget}
      />

      <div className={styles.inspectToolbar}>
        <div className={styles.toolbarActions}>
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
            {isApplying ? "Applying…" : "Apply to Source"}
          </button>
        </div>

        {canApplyToSource ? (
          <p className={styles.applyHint}>
            Local apply writes the current Willard state into the feed source file.
          </p>
        ) : (
          <p className={styles.applyHint}>
            Live production stays sandboxed. Source apply is local-only.
          </p>
        )}

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

      <div className={styles.shellBody}>
        {isPanelOpen && activeStyleTarget ? (
          <aside className={styles.leftPanel}>
            <ControlPanel
              activeTarget={activeTarget}
              activeStyleTarget={activeStyleTarget}
              onClose={handleClosePanel}
              onReset={handleReset}
            />
          </aside>
        ) : null}

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
      </div>
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
