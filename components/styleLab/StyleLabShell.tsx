"use client";

import { useRef, useState } from "react";
import { StyleLabProvider } from "@/lib/dev/style-lab-context";
import { useStyleLab } from "@/lib/dev/style-lab-context";
import { type StyleTargetId } from "@/lib/dev/style-lab-inspect";
import { ControlPanel } from "./ControlPanel";
import { PreviewArea, type PreviewAreaHandle } from "./PreviewArea";
import { PreviewSwitcher } from "./PreviewSwitcher";
import styles from "./styleLab.module.css";

// Inner component has access to useStyleLab context
function StyleLabShellInner() {
  const [activeTarget, setActiveTarget] = useState("feed-homepage");
  const [inspectMode, setInspectMode] = useState(false);
  const [activeStyleTarget, setActiveStyleTarget] = useState<StyleTargetId | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const previewRef = useRef<PreviewAreaHandle>(null);
  const { resetToDefaults } = useStyleLab();

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
    // Also close any open panel so stale controls aren't shown
    handleClosePanel();
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

export function StyleLabShell() {
  return (
    <StyleLabProvider>
      <StyleLabShellInner />
    </StyleLabProvider>
  );
}
