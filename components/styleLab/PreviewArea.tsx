"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useStyleLab } from "@/lib/dev/style-lab-context";
import { STYLE_LAB_DEFAULTS } from "@/lib/dev/style-lab-defaults";
import { injectStyleLabVariables, removeStyleLabVariables } from "@/lib/dev/style-lab-inject";
import { buildTargetStylesheet } from "@/lib/dev/style-lab-css";
import {
  attachInspectListeners,
  clearSelection,
  type StyleTargetId,
} from "@/lib/dev/style-lab-inspect";
import styles from "./styleLab.module.css";

const RUNTIME_STYLE_ID = "style-lab-target-runtime-style";
const ALL_VARIABLE_KEYS = Object.keys(STYLE_LAB_DEFAULTS);

export interface PreviewAreaHandle {
  clearAllStyles: () => void;
}

interface PreviewAreaProps {
  activeTarget: string;
  inspectMode?: boolean;
  activeStyleTarget?: StyleTargetId | null;
  onStyleTargetSelect?: (targetId: StyleTargetId) => void;
  /** Called when preview target changes so parent can close any open panel. */
  onClearSelection?: () => void;
}

export const PreviewArea = forwardRef<PreviewAreaHandle, PreviewAreaProps>(
  function PreviewArea(
    {
      activeTarget,
      inspectMode = false,
      activeStyleTarget,
      onStyleTargetSelect,
      onClearSelection,
    },
    ref
  ) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const { variables } = useStyleLab();

  /** Removes all style-lab custom properties and the runtime stylesheet from the iframe. */
  const clearAllStyles = () => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;
    try {
      if (doc.documentElement) {
        removeStyleLabVariables(doc.documentElement, ALL_VARIABLE_KEYS);
      }
      const styleEl = doc.getElementById(RUNTIME_STYLE_ID);
      if (styleEl) styleEl.remove();
    } catch (e) {
      console.error("Failed to clear styles from iframe:", e);
    }
  };

  useImperativeHandle(ref, () => ({ clearAllStyles }));

  const detachInspectListeners = () => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  };

  const attachInspectIfNeeded = (doc: Document | null | undefined) => {
    if (!doc) return;

    detachInspectListeners();

    if (!inspectMode || !onStyleTargetSelect) {
      clearSelection(doc);
      return;
    }

    cleanupRef.current = attachInspectListeners(doc, onStyleTargetSelect);
  };

  // Handle iframe load lifecycle: always inject vars, then attach inspect if enabled.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleIframeLoad = () => {
      const doc = iframe.contentDocument;
      try {
        if (doc?.documentElement) {
          // Only inject legacy (non-target-scoped) CSS vars onto documentElement.
          // Target-scoped keys (containing "__") are handled by the overrides stylesheet.
          const legacyVars = getLegacyVars(variables);
          injectStyleLabVariables(doc.documentElement, legacyVars);
        }
        if (doc?.head) {
          injectComprehensiveStylesheet(doc, RUNTIME_STYLE_ID, variables);
        }
        attachInspectIfNeeded(doc);
      } catch (error) {
        console.error("Failed to process iframe load:", error);
      }
    };

    iframe.addEventListener("load", handleIframeLoad);

    // Handle already-loaded iframe documents too.
    handleIframeLoad();

    return () => {
      iframe.removeEventListener("load", handleIframeLoad);
      const doc = iframe.contentDocument;
      detachInspectListeners();
      if (doc) {
        clearSelection(doc);
      }
    };
  }, [activeTarget, inspectMode, onStyleTargetSelect]);

  // Inject variables whenever they change
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument?.documentElement) return;

    try {
      injectStyleLabVariables(
        iframe.contentDocument.documentElement,
        getLegacyVars(variables)
      );
    } catch (error) {
      console.error("Failed to inject CSS variables into iframe:", error);
    }
  }, [variables]);

  // Rebuild the comprehensive target-override stylesheet whenever variables change.
  // Applies inline styles for ALL targets that have user-edited fields — so edits
  // persist even when the panel is closed or a different target is selected.
  useEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc?.head) return;
    injectComprehensiveStylesheet(doc, RUNTIME_STYLE_ID, variables);
  }, [variables]);

  // Immediate inspect-mode toggle handling without waiting for iframe load.
  useEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;

    attachInspectIfNeeded(doc);

    return () => {
      if (!inspectMode) {
        detachInspectListeners();
        clearSelection(doc);
      }
    };
  }, [inspectMode, onStyleTargetSelect]);

  // On preview target switch: clear inspect state, clear the runtime stylesheet,
  // and notify parent to close any open panel.
  useEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;

    detachInspectListeners();
    try {
      clearSelection(doc);
      const styleEl = doc.getElementById(RUNTIME_STYLE_ID);
      if (styleEl) styleEl.remove();
    } catch (e) {
      console.error("Failed to clear selection on target switch:", e);
    }

    // Tell the parent shell to close any open contextual panel.
    onClearSelection?.();
  }, [activeTarget]);

  const getIframeSrc = () => {
    switch (activeTarget) {
      case "feed-homepage":
        return "/the-feed";
      case "live-spotlight":
        return "/the-feed/spotlight/ye";
      case "live-blog":
        return "/the-feed/blog/weekly-blog-placeholder-entry";
      default:
        return "/the-feed";
    }
  };

  return (
    <div className={styles.previewArea}>
      <div className={styles.previewHeader}>
        <h3 className={styles.previewTitle}>
          Preview: {getTargetLabel(activeTarget)}
        </h3>
        <p className={styles.previewSubtitle}>
          Live CSS variables — Changes update in real time
        </p>
      </div>

      <div className={styles.previewFrame}>
        <iframe
          ref={iframeRef}
          src={getIframeSrc()}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            borderRadius: "0.375rem",
          }}
          title={`Preview: ${getTargetLabel(activeTarget)}`}
          sandbox="allow-same-origin allow-scripts allow-popups"
        />
      </div>

      <div className={styles.previewFooter}>
        <p className={styles.previewFooterText}>
          Target: <code>{activeTarget}</code>
        </p>
      </div>
    </div>
  );
});

function getTargetLabel(targetId: string): string {
  const labels: Record<string, string> = {
    "feed-homepage": "Feed Homepage",
    "live-spotlight": "Live Spotlight Page",
    "live-blog": "Live Blog Page",
  };
  return labels[targetId] || "Unknown";
}

/** Returns only the non-target-scoped entries (no "__") for legacy CSS var injection. */
function getLegacyVars(variables: Record<string, string>): Record<string, string> {
  const legacy: Record<string, string> = {};
  for (const [k, v] of Object.entries(variables)) {
    if (!k.includes("__")) legacy[k] = v;
  }
  return legacy;
}

/** Upserts a <style> element in the iframe <head> with rules for every edited target. */
function injectComprehensiveStylesheet(
  doc: Document,
  styleId: string,
  variables: Record<string, string>
): void {
  let styleEl = doc.getElementById(styleId) as HTMLStyleElement | null;
  const css = buildTargetStylesheet(variables);

  if (!css) {
    if (styleEl) styleEl.remove();
    return;
  }

  if (!styleEl) {
    styleEl = doc.createElement("style");
    styleEl.id = styleId;
    doc.head.appendChild(styleEl);
  }
  styleEl.textContent = css;
}
