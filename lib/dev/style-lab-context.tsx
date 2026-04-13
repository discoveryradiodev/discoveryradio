"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const STORAGE_KEY = "discovery-radio-style-lab";

// Old kind-scoped prefixes from before the element isolation pass.
// These are discarded on load as they are no longer meaningful.
const LEGACY_KIND_PREFIXES = ["text-", "image-", "button-", "container-"];

interface StyleLabContextType {
  variables: Record<string, string>;
  /** Update a raw storage key (for legacy CSS vars like spotlight-image-x). */
  updateVariable: (key: string, value: string) => void;
  /** Update a field value scoped to a specific inspect target. */
  updateTargetVariable: (targetId: string, field: string, value: string) => void;
  /** Read a field value for a specific inspect target. Returns undefined if not set. */
  getTargetValue: (targetId: string, field: string) => string | undefined;
  resetToDefaults: () => void;
  clearSettings: () => void;
  isLoaded: boolean;
}

const StyleLabContext = createContext<StyleLabContextType | null>(null);

export function StyleLabProvider({ children }: { children: ReactNode }) {
  const [variables, setVariables] = useState<Record<string, string>>({});
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
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever variables change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(variables));
    }
  }, [variables, isLoaded]);

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
        updateVariable,
        updateTargetVariable,
        getTargetValue,
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
