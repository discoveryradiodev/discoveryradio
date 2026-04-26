"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import type {
  WillardAsset,
  WillardAssetUsage,
  WillardBackgroundOverride,
  WillardImageOverride,
  WillardOverlayDraft,
} from "@/lib/dev/willard-assets";

const STORAGE_KEY = "discovery-radio-style-lab";
const ASSET_STORAGE_KEY = "discovery-radio-style-lab-assets";

// Old kind-scoped prefixes from before the element isolation pass.
// These are discarded on load as they are no longer meaningful.
const LEGACY_KIND_PREFIXES = ["text-", "image-", "button-", "container-"];

interface StyleLabContextType {
  variables: Record<string, string>;
  assets: WillardAsset[];
  selectedAssetId: string | null;
  assetUsages: WillardAssetUsage[];
  imageOverrides: WillardImageOverride[];
  backgroundOverrides: WillardBackgroundOverride[];
  overlayDrafts: WillardOverlayDraft[];
  /** Update a raw storage key (for legacy CSS vars like spotlight-image-x). */
  updateVariable: (key: string, value: string) => void;
  /** Update a field value scoped to a specific inspect target. */
  updateTargetVariable: (targetId: string, field: string, value: string) => void;
  /** Read a field value for a specific inspect target. Returns undefined if not set. */
  getTargetValue: (targetId: string, field: string) => string | undefined;
  addAsset: (asset: WillardAsset) => void;
  setAssets: (assets: WillardAsset[]) => void;
  setSelectedAssetId: (assetId: string | null) => void;
  addAssetUsage: (usage: WillardAssetUsage) => void;
  removeAssetUsage: (usageId: string) => void;
  setImageOverride: (override: WillardImageOverride) => void;
  removeImageOverride: (targetId: string) => void;
  setBackgroundOverride: (override: WillardBackgroundOverride) => void;
  removeBackgroundOverride: (targetId: string) => void;
  addOverlayDraft: (draft: WillardOverlayDraft) => void;
  updateOverlayDraft: (draftId: string, updates: Partial<WillardOverlayDraft>) => void;
  removeOverlayDraft: (draftId: string) => void;
  resetToDefaults: () => void;
  clearSettings: () => void;
  isLoaded: boolean;
}

const StyleLabContext = createContext<StyleLabContextType | null>(null);

export function StyleLabProvider({ children }: { children: ReactNode }) {
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [assets, setAssetsState] = useState<WillardAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [assetUsages, setAssetUsages] = useState<WillardAssetUsage[]>([]);
  const [imageOverrides, setImageOverrides] = useState<WillardImageOverride[]>([]);
  const [backgroundOverrides, setBackgroundOverrides] = useState<WillardBackgroundOverride[]>([]);
  const [overlayDrafts, setOverlayDrafts] = useState<WillardOverlayDraft[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Record<string, unknown>;
        // Migrate: discard old kind-scoped keys (text-*, image-*, button-*, container-*).
        // These were the shared per-kind vars from before element isolation.
        // Legacy site CSS vars (spotlight-*, feed-shell-*, etc.) are preserved.
        const migrated: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (
            typeof v === "string" &&
            !LEGACY_KIND_PREFIXES.some((p) => k.startsWith(p))
          ) {
            migrated[k] = v;
          }
        }
        setVariables(migrated);
      } catch (e) {
        console.error("Failed to parse style lab settings:", e);
      }
    }

    const assetStored = localStorage.getItem(ASSET_STORAGE_KEY);
    if (assetStored) {
      try {
        const parsed = JSON.parse(assetStored) as {
          assets?: unknown;
          selectedAssetId?: unknown;
          assetUsages?: unknown;
          imageOverrides?: unknown;
          backgroundOverrides?: unknown;
          overlayDrafts?: unknown;
        };

        if (Array.isArray(parsed.assets)) {
          setAssetsState(parsed.assets as WillardAsset[]);
        }
        if (typeof parsed.selectedAssetId === "string" || parsed.selectedAssetId === null) {
          setSelectedAssetId(parsed.selectedAssetId as string | null);
        }
        if (Array.isArray(parsed.assetUsages)) {
          setAssetUsages(parsed.assetUsages as WillardAssetUsage[]);
        }
        if (Array.isArray(parsed.imageOverrides)) {
          setImageOverrides(parsed.imageOverrides as WillardImageOverride[]);
        }
        if (Array.isArray(parsed.backgroundOverrides)) {
          setBackgroundOverrides(parsed.backgroundOverrides as WillardBackgroundOverride[]);
        }
        if (Array.isArray(parsed.overlayDrafts)) {
          setOverlayDrafts(parsed.overlayDrafts as WillardOverlayDraft[]);
        }
      } catch (e) {
        console.error("Failed to parse style lab asset settings:", e);
      }
    }

    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever variables change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(variables));
    }
  }, [variables, isLoaded]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    localStorage.setItem(
      ASSET_STORAGE_KEY,
      JSON.stringify({
        assets,
        selectedAssetId,
        assetUsages,
        imageOverrides,
        backgroundOverrides,
        overlayDrafts,
      })
    );
  }, [assets, selectedAssetId, assetUsages, imageOverrides, backgroundOverrides, overlayDrafts, isLoaded]);

  const updateVariable = (key: string, value: string) => {
    setVariables((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateTargetVariable = (targetId: string, field: string, value: string) => {
    const key = `${targetId}__${field}`;
    setVariables((prev) => ({ ...prev, [key]: value }));
  };

  const getTargetValue = (targetId: string, field: string): string | undefined => {
    return variables[`${targetId}__${field}`];
  };

  const addAsset = (asset: WillardAsset) => {
    setAssetsState((prev) => [asset, ...prev.filter((item) => item.id !== asset.id)]);
  };

  const setAssets = (nextAssets: WillardAsset[]) => {
    setAssetsState(nextAssets);
  };

  const setSelectedAsset = (assetId: string | null) => {
    setSelectedAssetId(assetId);
  };

  const addAssetUsage = (usage: WillardAssetUsage) => {
    setAssetUsages((prev) => [usage, ...prev.filter((item) => item.id !== usage.id)]);
  };

  const removeAssetUsage = (usageId: string) => {
    setAssetUsages((prev) => prev.filter((item) => item.id !== usageId));
  };

  const setImageOverride = (override: WillardImageOverride) => {
    setImageOverrides((prev) => {
      const next = prev.filter((item) => item.targetId !== override.targetId);
      next.unshift(override);
      return next;
    });
  };

  const removeImageOverride = (targetId: string) => {
    setImageOverrides((prev) => prev.filter((item) => item.targetId !== targetId));
  };

  const setBackgroundOverride = (override: WillardBackgroundOverride) => {
    setBackgroundOverrides((prev) => {
      const next = prev.filter((item) => item.targetId !== override.targetId);
      next.unshift(override);
      return next;
    });
  };

  const removeBackgroundOverride = (targetId: string) => {
    setBackgroundOverrides((prev) => prev.filter((item) => item.targetId !== targetId));
  };

  const addOverlayDraft = (draft: WillardOverlayDraft) => {
    setOverlayDrafts((prev) => [draft, ...prev.filter((item) => item.id !== draft.id)]);
  };

  const updateOverlayDraft = (draftId: string, updates: Partial<WillardOverlayDraft>) => {
    setOverlayDrafts((prev) =>
      prev.map((item) => (item.id === draftId ? { ...item, ...updates } : item))
    );
  };

  const removeOverlayDraft = (draftId: string) => {
    setOverlayDrafts((prev) => prev.filter((item) => item.id !== draftId));
  };

  const resetToDefaults = () => {
    setVariables({});
    localStorage.removeItem(STORAGE_KEY);
  };

  const clearSettings = () => {
    setVariables({});
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <StyleLabContext.Provider
      value={{
        variables,
        assets,
        selectedAssetId,
        assetUsages,
        imageOverrides,
        backgroundOverrides,
        overlayDrafts,
        updateVariable,
        updateTargetVariable,
        getTargetValue,
        addAsset,
        setAssets,
        setSelectedAssetId: setSelectedAsset,
        addAssetUsage,
        removeAssetUsage,
        setImageOverride,
        removeImageOverride,
        setBackgroundOverride,
        removeBackgroundOverride,
        addOverlayDraft,
        updateOverlayDraft,
        removeOverlayDraft,
        resetToDefaults,
        clearSettings,
        isLoaded,
      }}
    >
      {children}
    </StyleLabContext.Provider>
  );
}

export function useStyleLab() {
  const context = useContext(StyleLabContext);
  if (!context) {
    throw new Error("useStyleLab must be used within StyleLabProvider");
  }
  return context;
}
