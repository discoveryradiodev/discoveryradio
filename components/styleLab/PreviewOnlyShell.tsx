"use client";

import { useEffect, useRef, useState } from "react";
import { STYLE_LAB_DEFAULTS } from "@/lib/dev/style-lab-defaults";
import { buildTargetStylesheet } from "@/lib/dev/style-lab-css";
import { applyImageOverridesToDocument } from "@/lib/dev/style-lab-image-runtime";
import { injectStyleLabVariables, removeStyleLabVariables } from "@/lib/dev/style-lab-inject";
import {
  attachInspectListeners,
  clearSelection,
  isStyleTargetId,
  type StyleTargetId,
} from "@/lib/dev/style-lab-inspect";
import {
  WILLARD_PREVIEW_SELECTION_STORAGE_KEY,
  WILLARD_PREVIEW_SYNC_STORAGE_KEY,
  createWillardPreviewChannel,
  getPreviewLabelForTarget,
  getPreviewPathForTarget,
  normalizeWillardPreviewTarget,
  postWillardPreviewMessage,
  readWillardPreviewSnapshot,
  writeWillardPreviewSelection,
  type WillardPreviewMessage,
  type WillardPreviewTarget,
} from "@/lib/dev/willard-preview-sync";
import type {
  WillardBackgroundOverride,
  WillardImageOverride,
} from "@/lib/dev/willard-assets";
import styles from "./styleLab.module.css";

const RUNTIME_STYLE_ID = "style-lab-target-runtime-style";
const ALL_VARIABLE_KEYS = Object.keys(STYLE_LAB_DEFAULTS);

type PreviewOnlyShellProps = {
  initialTarget: WillardPreviewTarget;
};

export function PreviewOnlyShell({ initialTarget }: PreviewOnlyShellProps) {
  const snapshot = readWillardPreviewSnapshot();
  const [variables, setVariables] = useState<Record<string, string>>(snapshot?.variables ?? {});
  const [imageOverrides, setImageOverrides] = useState<WillardImageOverride[]>(
    snapshot?.imageOverrides ?? []
  );
  const [backgroundOverrides, setBackgroundOverrides] = useState<WillardBackgroundOverride[]>(
    snapshot?.backgroundOverrides ?? []
  );
  const [activeTarget, setActiveTarget] = useState<WillardPreviewTarget>(
    snapshot?.target ?? initialTarget
  );
  const [inspectMode, setInspectMode] = useState<boolean>(snapshot?.inspectMode ?? false);
  const [channelAvailable, setChannelAvailable] = useState(true);
  const [syncNote, setSyncNote] = useState<string>("");

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const detachInspectListeners = () => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  };

  const handleSelectedTarget = (targetId: StyleTargetId) => {
    postWillardPreviewMessage(channelRef.current, {
      type: "selected-target",
      targetId,
      source: "popout",
    });
    writeWillardPreviewSelection(targetId);
  };

  const attachInspectIfNeeded = (doc: Document | null | undefined) => {
    if (!doc) {
      return;
    }

    detachInspectListeners();

    if (!inspectMode) {
      clearSelection(doc);
      return;
    }

    cleanupRef.current = attachInspectListeners(doc, handleSelectedTarget);
  };

  useEffect(() => {
    const channel = createWillardPreviewChannel();
    channelRef.current = channel;

    if (!channel) {
      setChannelAvailable(false);
      setSyncNote("Live sync uses localStorage fallback because BroadcastChannel is unavailable.");
      return;
    }

    const handleMessage = (event: MessageEvent<WillardPreviewMessage>) => {
      const message = event.data;
      if (!message || typeof message !== "object") {
        return;
      }

      if (message.type === "style-state") {
        setVariables(message.variables ?? {});
        setImageOverrides(message.imageOverrides ?? []);
        setBackgroundOverrides(message.backgroundOverrides ?? []);
        return;
      }

      if (message.type === "preview-target") {
        setActiveTarget(normalizeWillardPreviewTarget(message.target));
        return;
      }

      if (message.type === "inspect-mode") {
        setInspectMode(Boolean(message.enabled));
        return;
      }

      if (message.type === "clear-selection") {
        const doc = iframeRef.current?.contentDocument;
        if (doc) {
          clearSelection(doc);
        }
      }
    };

    channel.addEventListener("message", handleMessage);

    return () => {
      channel.removeEventListener("message", handleMessage);
      channel.close();
      channelRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== WILLARD_PREVIEW_SYNC_STORAGE_KEY) {
        return;
      }

      const latest = readWillardPreviewSnapshot();
      if (!latest) {
        return;
      }

      setVariables(latest.variables);
      setImageOverrides(latest.imageOverrides ?? []);
      setBackgroundOverrides(latest.backgroundOverrides ?? []);
      setActiveTarget(latest.target);
      setInspectMode(latest.inspectMode);
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    const handleIframeLoad = () => {
      const doc = iframe.contentDocument;
      try {
        if (doc?.documentElement) {
          injectStyleLabVariables(doc.documentElement, getLegacyVars(variables));
        }
        if (doc?.head) {
          injectComprehensiveStylesheet(doc, RUNTIME_STYLE_ID, variables, backgroundOverrides);
        }
        if (doc) {
          applyImageOverridesToDocument(doc, imageOverrides);
        }
        attachInspectIfNeeded(doc);
      } catch (error) {
        console.error("Failed to process pop-out preview iframe load:", error);
      }
    };

    iframe.addEventListener("load", handleIframeLoad);
    handleIframeLoad();

    return () => {
      iframe.removeEventListener("load", handleIframeLoad);
      const doc = iframe.contentDocument;
      detachInspectListeners();
      if (doc) {
        clearSelection(doc);
      }
    };
  }, [activeTarget, inspectMode, variables, imageOverrides, backgroundOverrides]);

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.documentElement) {
      return;
    }

    injectStyleLabVariables(doc.documentElement, getLegacyVars(variables));
    injectComprehensiveStylesheet(doc, RUNTIME_STYLE_ID, variables, backgroundOverrides);
    applyImageOverridesToDocument(doc, imageOverrides);
  }, [variables, imageOverrides, backgroundOverrides]);

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) {
      return;
    }

    attachInspectIfNeeded(doc);

    if (!inspectMode) {
      postWillardPreviewMessage(channelRef.current, { type: "clear-selection" });
      clearSelection(doc);
    }
  }, [inspectMode]);

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) {
      return;
    }

    detachInspectListeners();
    clearSelection(doc);
    postWillardPreviewMessage(channelRef.current, { type: "clear-selection" });
  }, [activeTarget]);

  useEffect(() => {
    return () => {
      const iframe = iframeRef.current;
      const doc = iframe?.contentDocument;
      if (!doc) {
        return;
      }

      try {
        if (doc.documentElement) {
          removeStyleLabVariables(doc.documentElement, ALL_VARIABLE_KEYS);
        }
        const styleEl = doc.getElementById(RUNTIME_STYLE_ID);
        if (styleEl) {
          styleEl.remove();
        }
      } catch {
        // ignore cleanup failures on pop-out close
      }
    };
  }, []);

  return (
    <div className={styles.previewOnlyShell} data-willard-preview-root="true">
      <header className={styles.previewOnlyHeader}>
        <h1 className={styles.previewOnlyTitle}>Willard Pop-Out Preview</h1>
        <p className={styles.previewOnlySubtitle}>
          Target: {getPreviewLabelForTarget(activeTarget)}
        </p>
        {!channelAvailable ? (
          <p className={styles.previewSyncNote}>{syncNote}</p>
        ) : (
          <p className={styles.previewSyncNote}>Live sync connected to main /willard window.</p>
        )}
      </header>

      <div className={styles.previewOnlyFrameWrap}>
        <iframe
          ref={iframeRef}
          src={getPreviewPathForTarget(activeTarget)}
          className={styles.previewOnlyFrame}
          title={`Willard Preview: ${getPreviewLabelForTarget(activeTarget)}`}
          sandbox="allow-same-origin allow-scripts allow-popups"
        />
      </div>

      <footer className={styles.previewOnlyFooter}>
        <p className={styles.previewOnlyFooterText}>
          Inspect mode mirrors the main window and can push selected targets back.
        </p>
        <p className={styles.previewOnlyFooterText}>Storage key fallback: {WILLARD_PREVIEW_SELECTION_STORAGE_KEY}</p>
      </footer>
    </div>
  );
}

function getLegacyVars(variables: Record<string, string>): Record<string, string> {
  const legacy: Record<string, string> = {};
  for (const [key, value] of Object.entries(variables)) {
    if (!key.includes("__")) {
      legacy[key] = value;
    }
  }
  return legacy;
}

function injectComprehensiveStylesheet(
  doc: Document,
  styleId: string,
  variables: Record<string, string>,
  backgroundOverrides: WillardBackgroundOverride[]
): void {
  let styleEl = doc.getElementById(styleId) as HTMLStyleElement | null;
  const css = buildTargetStylesheet(variables, backgroundOverrides);

  if (!css) {
    if (styleEl) {
      styleEl.remove();
    }
    return;
  }

  if (!styleEl) {
    styleEl = doc.createElement("style");
    styleEl.id = styleId;
    doc.head.appendChild(styleEl);
  }

  styleEl.textContent = css;
}
