"use client";

import { useEffect, useMemo, useState } from "react";
import { useStyleLab } from "@/lib/dev/style-lab-context";
import {
  createOverlayId,
  type WillardOverlayDraft,
} from "@/lib/dev/willard-assets";
import type { WillardPreviewTarget } from "@/lib/dev/willard-preview-sync";
import styles from "./styleLab.module.css";

type LayersPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  activeSurface: WillardPreviewTarget;
};

const BLEND_MODE_OPTIONS = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "soft-light",
  "hard-light",
  "difference",
] as const;

export function LayersPanel({ isOpen, onClose, activeSurface }: LayersPanelProps) {
  const {
    assets,
    selectedAssetId,
    setSelectedAssetId,
    overlayDrafts,
    addOverlayDraft,
    updateOverlayDraft,
    removeOverlayDraft,
    clearOverlayDraftsForSurface,
  } = useStyleLab();

  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  const selectedAsset = useMemo(() => {
    if (!selectedAssetId) {
      return null;
    }
    return assets.find((asset) => asset.id === selectedAssetId) ?? null;
  }, [assets, selectedAssetId]);

  const surfaceLayers = useMemo(
    () =>
      overlayDrafts
        .filter((draft) => draft.surface === activeSurface)
        .sort((a, b) => a.zIndex - b.zIndex || a.name.localeCompare(b.name)),
    [overlayDrafts, activeSurface]
  );

  const selectedLayer = useMemo(() => {
    if (!selectedLayerId) {
      return null;
    }
    return surfaceLayers.find((layer) => layer.id === selectedLayerId) ?? null;
  }, [surfaceLayers, selectedLayerId]);

  useEffect(() => {
    if (selectedLayer && selectedLayer.surface === activeSurface) {
      return;
    }

    setSelectedLayerId(surfaceLayers[0]?.id ?? null);
  }, [surfaceLayers, selectedLayer, activeSurface]);

  const canAddSelectedAsset = Boolean(selectedAsset);

  const handleAddSelectedAssetAsOverlay = () => {
    if (!selectedAsset) {
      return;
    }

    const highestZIndex = surfaceLayers.reduce((max, layer) => Math.max(max, layer.zIndex), 0);
    const nextDraft: WillardOverlayDraft = {
      id: createOverlayId(),
      assetId: selectedAsset.id,
      url: selectedAsset.url,
      name: createLayerName(selectedAsset.filename, surfaceLayers.length + 1),
      surface: activeSurface,
      placementMode: "free",
      x: 72,
      y: 72,
      width: selectedAsset.width ?? 280,
      height: selectedAsset.height ?? 180,
      rotation: 0,
      opacity: 1,
      zIndex: highestZIndex + 1,
      blendMode: "normal",
      visible: true,
      locked: false,
    };

    addOverlayDraft(nextDraft);
    setSelectedLayerId(nextDraft.id);
  };

  const handleUpdateSelectedLayer = (updates: Partial<WillardOverlayDraft>) => {
    if (!selectedLayer) {
      return;
    }
    updateOverlayDraft(selectedLayer.id, updates);
  };

  const handleRemoveSelectedLayer = () => {
    if (!selectedLayer) {
      return;
    }

    removeOverlayDraft(selectedLayer.id);
    setSelectedLayerId(null);
  };

  const handleClearSurfaceLayers = () => {
    if (surfaceLayers.length === 0) {
      return;
    }

    if (
      window.confirm(
        `Clear ${surfaceLayers.length} overlay layer${
          surfaceLayers.length === 1 ? "" : "s"
        } on this preview surface? Assets will stay in the library.`
      )
    ) {
      clearOverlayDraftsForSurface(activeSurface);
      setSelectedLayerId(null);
    }
  };

  if (!isOpen) {
    return null;
  }

  const selectedLayerLocked = selectedLayer?.locked ?? false;

  return (
    <div className={styles.layersPanelLayer} role="dialog" aria-modal="true" aria-label="Overlay Layers">
      <div className={styles.layersPanelBackdrop} onClick={onClose} />

      <aside className={styles.layersPanel}>
        <header className={styles.layersPanelHeader}>
          <h2 className={styles.layersPanelTitle}>Layers</h2>
          <button type="button" className={styles.layersPanelClose} onClick={onClose}>
            Close
          </button>
        </header>

        <div className={styles.layersPanelContent}>
          <section className={styles.layersSection}>
            <h3 className={styles.layersSectionTitle}>Add Overlay</h3>
            <p className={styles.layersMuted}>
              Surface: <strong>{formatSurfaceLabel(activeSurface)}</strong>
            </p>
            <p className={styles.layersMuted}>
              Selected asset: <strong>{selectedAsset?.filename ?? "None"}</strong>
            </p>
            <div className={styles.layersRowActions}>
              <button
                type="button"
                className={styles.layersPrimaryButton}
                disabled={!canAddSelectedAsset}
                onClick={handleAddSelectedAssetAsOverlay}
              >
                Add Selected Asset As Overlay
              </button>
              <button type="button" className={styles.layersSecondaryButton} onClick={handleClearSurfaceLayers}>
                Clear Surface Overlays
              </button>
            </div>
            <p className={styles.layersMuted}>
              Tip: pick an overlay in the Asset Library first. Starter overlays are pre-seeded.
            </p>
          </section>

          <section className={styles.layersSection}>
            <div className={styles.layersListHeader}>
              <h3 className={styles.layersSectionTitle}>Layer List</h3>
              <span className={styles.layersCount}>{surfaceLayers.length}</span>
            </div>

            {surfaceLayers.length === 0 ? (
              <p className={styles.layersEmpty}>No overlays on this surface yet.</p>
            ) : (
              <div className={styles.layersList}>
                {surfaceLayers.map((layer) => {
                  const isSelected = layer.id === selectedLayerId;
                  return (
                    <button
                      key={layer.id}
                      type="button"
                      className={`${styles.layerItem} ${isSelected ? styles.layerItemSelected : ""}`}
                      onClick={() => setSelectedLayerId(layer.id)}
                    >
                      <span className={styles.layerName}>{layer.name || layer.assetId}</span>
                      <span className={styles.layerMeta}>
                        z {layer.zIndex} · {layer.visible ? "visible" : "hidden"} · {layer.locked ? "locked" : "unlocked"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className={styles.layersSection}>
            <h3 className={styles.layersSectionTitle}>Selected Layer</h3>

            {!selectedLayer ? (
              <p className={styles.layersMuted}>Select a layer to edit.</p>
            ) : (
              <div className={styles.layersEditor}>
                <label className={styles.layersFieldLabel} htmlFor="willard-layer-name">
                  Name
                </label>
                <input
                  id="willard-layer-name"
                  className={styles.layersInput}
                  type="text"
                  value={selectedLayer.name}
                  disabled={selectedLayerLocked}
                  onChange={(event) => handleUpdateSelectedLayer({ name: event.target.value })}
                />

                <div className={styles.layersToggleRow}>
                  <button
                    type="button"
                    className={styles.layersToggleButton}
                    onClick={() => handleUpdateSelectedLayer({ visible: !selectedLayer.visible })}
                    disabled={selectedLayerLocked}
                  >
                    {selectedLayer.visible ? "Visible" : "Hidden"}
                  </button>
                  <button
                    type="button"
                    className={styles.layersToggleButton}
                    onClick={() => handleUpdateSelectedLayer({ locked: !selectedLayer.locked })}
                  >
                    {selectedLayer.locked ? "Locked" : "Unlocked"}
                  </button>
                </div>

                <div className={styles.layersGrid}>
                  <LayerNumberField
                    label="X"
                    value={selectedLayer.x}
                    min={-5000}
                    max={10000}
                    disabled={selectedLayerLocked}
                    onChange={(next) => handleUpdateSelectedLayer({ x: next })}
                  />
                  <LayerNumberField
                    label="Y"
                    value={selectedLayer.y}
                    min={-5000}
                    max={10000}
                    disabled={selectedLayerLocked}
                    onChange={(next) => handleUpdateSelectedLayer({ y: next })}
                  />
                  <LayerNumberField
                    label="Width"
                    value={selectedLayer.width}
                    min={1}
                    max={10000}
                    disabled={selectedLayerLocked}
                    onChange={(next) => handleUpdateSelectedLayer({ width: next })}
                  />
                  <LayerNumberField
                    label="Height"
                    value={selectedLayer.height}
                    min={1}
                    max={10000}
                    disabled={selectedLayerLocked}
                    onChange={(next) => handleUpdateSelectedLayer({ height: next })}
                  />
                  <LayerNumberField
                    label="Rotation"
                    value={selectedLayer.rotation}
                    min={-1080}
                    max={1080}
                    disabled={selectedLayerLocked}
                    onChange={(next) => handleUpdateSelectedLayer({ rotation: next })}
                  />
                  <LayerNumberField
                    label="Opacity"
                    value={selectedLayer.opacity}
                    min={0}
                    max={1}
                    step={0.01}
                    disabled={selectedLayerLocked}
                    onChange={(next) => handleUpdateSelectedLayer({ opacity: next })}
                  />
                  <LayerNumberField
                    label="Z-index"
                    value={selectedLayer.zIndex}
                    min={-2000}
                    max={2000}
                    disabled={selectedLayerLocked}
                    onChange={(next) => handleUpdateSelectedLayer({ zIndex: Math.round(next) })}
                  />
                </div>

                <label className={styles.layersFieldLabel} htmlFor="willard-layer-blend-mode">
                  Blend mode
                </label>
                <select
                  id="willard-layer-blend-mode"
                  className={styles.layersSelect}
                  value={selectedLayer.blendMode}
                  disabled={selectedLayerLocked}
                  onChange={(event) => handleUpdateSelectedLayer({ blendMode: event.target.value })}
                >
                  {BLEND_MODE_OPTIONS.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>

                {selectedLayerLocked ? (
                  <p className={styles.layersMuted}>Layer is locked. Unlock to edit position and style values.</p>
                ) : null}

                <div className={styles.layersRowActions}>
                  <button type="button" className={styles.layersDangerButton} onClick={handleRemoveSelectedLayer}>
                    Remove Selected Overlay
                  </button>
                  <button
                    type="button"
                    className={styles.layersSecondaryButton}
                    onClick={() => setSelectedAssetId(selectedLayer.assetId)}
                  >
                    Select Layer Asset
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

type LayerNumberFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
};

function LayerNumberField({
  label,
  value,
  min,
  max,
  step = 1,
  disabled = false,
  onChange,
}: LayerNumberFieldProps) {
  return (
    <label className={styles.layersFieldCompact}>
      <span>{label}</span>
      <input
        type="number"
        className={styles.layersInput}
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => {
          const next = clampNumber(Number(event.target.value), min, max, min);
          onChange(next);
        }}
      />
    </label>
  );
}

function createLayerName(filename: string, fallbackIndex: number): string {
  const base = filename.replace(/\.[a-z0-9]+$/i, "").trim();
  return base || `Overlay ${fallbackIndex}`;
}

function formatSurfaceLabel(surface: WillardPreviewTarget): string {
  if (surface === "live-spotlight") {
    return "Live Spotlight";
  }
  if (surface === "live-blog") {
    return "Live Blog";
  }
  return "Feed Homepage";
}

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}
