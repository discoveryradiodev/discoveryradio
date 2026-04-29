"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useStyleLab } from "@/lib/dev/style-lab-context";
import { STYLE_LAB_DEFAULTS } from "@/lib/dev/style-lab-defaults";
import { injectStyleLabVariables, removeStyleLabVariables } from "@/lib/dev/style-lab-inject";
import { applyImageOverridesToDocument } from "@/lib/dev/style-lab-image-runtime";
import {
  applyOverlayDraftsToDocument,
  removeOverlayDraftsFromDocument,
} from "@/lib/dev/style-lab-overlay-runtime";
import { buildTargetStylesheet } from "@/lib/dev/style-lab-css";
import {
  attachInspectListeners,
  clearSelection,
  type StyleTargetId,
} from "@/lib/dev/style-lab-inspect";
import {
  getPreviewLabelForTarget,
  getPreviewPathForTarget,
  normalizeWillardPreviewTarget,
} from "@/lib/dev/willard-preview-sync";
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
  previewHeightMode?: "viewport" | "full-page";
}

export const PreviewArea = forwardRef<PreviewAreaHandle, PreviewAreaProps>(
  function PreviewArea(
    {
      activeTarget,
      inspectMode = false,
      activeStyleTarget,
      onStyleTargetSelect,
      onClearSelection,
      previewHeightMode = "full-page",
    },
    ref
  ) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  const { variables, imageOverrides, backgroundOverrides, overlayDrafts } = useStyleLab();

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

  /** Measures the actual content height of the iframe document. */
  const measureIframeHeight = () => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) {
      setMeasuredHeight(null);
      return;
    }

    try {
      const docElement = doc.documentElement;
      const body = doc.body;
      
      // Get the maximum scroll height from both documentElement and body
      const height = Math.max(
        docElement.scrollHeight || 0,
        body?.scrollHeight || 0
      );

      // Set a reasonable height (at least 350px, but cap at 3000px to avoid absurd heights)
      const finalHeight = Math.max(350, Math.min(height, 3000));
      setMeasuredHeight(finalHeight);
    } catch (error) {
      // Fallback if measurement fails (cross-origin or other issues)
      console.warn("Failed to measure iframe height:", error);
      setMeasuredHeight(null);
    }
  };

  /** Sets up ResizeObserver inside iframe to track content height changes. */
  const setupResizeObserver = () => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;

    try {
      // Clean up old observer if it exists
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }

      // Create new ResizeObserver that triggers on content changes
      const observer = new ResizeObserver(() => {
        // Debounce measurement to avoid excessive updates
        const timeoutId = window.setTimeout(() => {
          measureIframeHeight();
        }, 100);

        return () => window.clearTimeout(timeoutId);
      });

      // Observe the document element
      observer.observe(doc.documentElement);
      resizeObserverRef.current = observer;
    } catch (error) {
      // ResizeObserver might not be available or fail in sandboxed iframe
      console.warn("ResizeObserver not available:", error);
    }
  };

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
          injectComprehensiveStylesheet(doc, RUNTIME_STYLE_ID, variables, backgroundOverrides);
        }
        if (doc) {
          applyImageOverridesToDocument(doc, imageOverrides);
          applyOverlayDraftsToDocument(doc, getSurfaceOverlayDrafts(overlayDrafts, activeTarget));
        }
        attachInspectIfNeeded(doc);

        // Measure iframe height after load
        if (previewHeightMode === "full-page") {
          // Use a small timeout to allow images/fonts to render
          const timeoutId = window.setTimeout(() => {
            measureIframeHeight();
            setupResizeObserver();
          }, 200);
          return () => window.clearTimeout(timeoutId);
        }
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
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [activeTarget, inspectMode, onStyleTargetSelect, variables, imageOverrides, backgroundOverrides, overlayDrafts, previewHeightMode]);

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
    injectComprehensiveStylesheet(doc, RUNTIME_STYLE_ID, variables, backgroundOverrides);
    applyImageOverridesToDocument(doc, imageOverrides);
    applyOverlayDraftsToDocument(doc, getSurfaceOverlayDrafts(overlayDrafts, activeTarget));

    // Re-measure after style/image/overlay changes in full-page mode
    if (previewHeightMode === "full-page") {
      const timeoutId = window.setTimeout(() => {
        measureIframeHeight();
      }, 200);
      return () => window.clearTimeout(timeoutId);
    }
  }, [variables, imageOverrides, backgroundOverrides, overlayDrafts, activeTarget, previewHeightMode]);

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
      removeOverlayDraftsFromDocument(doc);
    } catch (e) {
      console.error("Failed to clear selection on target switch:", e);
    }

    // Tell the parent shell to close any open contextual panel.
    onClearSelection?.();
  }, [activeTarget]);

  const safePreviewTarget = normalizeWillardPreviewTarget(activeTarget);

  // Compute inline styles based on preview height mode
  const frameStyles = previewHeightMode === "full-page" && measuredHeight
    ? { height: `${measuredHeight}px` }
    : undefined;

  const iframeStyles = {
    width: "100%",
    height: previewHeightMode === "full-page" && measuredHeight ? `${measuredHeight}px` : "100%",
    border: "none",
    borderRadius: "0.375rem",
  } as React.CSSProperties;

  return (
    <div className={styles.previewArea}>
      <div className={`${styles.previewFrame} ${previewHeightMode === "full-page" ? styles.previewFrameFullPage : ""}`} style={frameStyles}>
        <iframe
          ref={iframeRef}
          src={getPreviewPathForTarget(safePreviewTarget)}
          style={iframeStyles}
          title={`Preview: ${getPreviewLabelForTarget(safePreviewTarget)}`}
          sandbox="allow-same-origin allow-scripts allow-popups"
        />
      </div>

      <div className={styles.previewFooter}>
        <p className={styles.previewFooterText}>
          Target: <code>{safePreviewTarget}</code>
        </p>
      </div>
    </div>
  );
});

/** Returns only the non-target-scoped entries (no "__") for legacy CSS var injection. */
function getLegacyVars(variables: Record<string, string>): Record<string, string> {
  const legacy: Record<string, string> = {};
  for (const [k, v] of Object.entries(variables)) {
    if (!k.includes("__")) legacy[k] = v;
  }
  return legacy;
}

function getSurfaceOverlayDrafts(
  drafts: ReturnType<typeof useStyleLab>["overlayDrafts"],
  surface: string
) {
  const safeSurface = normalizeWillardPreviewTarget(surface);
  return drafts.filter((draft) => draft.surface === safeSurface);
}

/** Upserts a <style> element in the iframe <head> with rules for every edited target. */
function injectComprehensiveStylesheet(
  doc: Document,
  styleId: string,
  variables: Record<string, string>,
  backgroundOverrides: ReturnType<typeof useStyleLab>["backgroundOverrides"]
): void {
  let styleEl = doc.getElementById(styleId) as HTMLStyleElement | null;
  const css = buildTargetStylesheet(variables, backgroundOverrides);

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
