import type { StyleTargetId } from "@/lib/dev/style-lab-inspect";
import type {
  WillardBackgroundOverride,
  WillardImageOverride,
} from "@/lib/dev/willard-assets";

export const WILLARD_PREVIEW_CHANNEL_NAME = "willard-preview-channel";
export const WILLARD_PREVIEW_SYNC_STORAGE_KEY = "willard-preview-sync-state";
export const WILLARD_PREVIEW_SELECTION_STORAGE_KEY = "willard-preview-selected-target";

export type WillardPreviewTarget = "feed-homepage" | "live-spotlight" | "live-blog";

export type WillardPreviewSnapshot = {
  variables: Record<string, string>;
  imageOverrides: WillardImageOverride[];
  backgroundOverrides: WillardBackgroundOverride[];
  target: WillardPreviewTarget;
  inspectMode: boolean;
  updatedAt: number;
};

export type WillardPreviewMessage =
  | {
      type: "style-state";
      variables: Record<string, string>;
      imageOverrides: WillardImageOverride[];
      backgroundOverrides: WillardBackgroundOverride[];
    }
  | {
      type: "preview-target";
      target: WillardPreviewTarget;
    }
  | {
      type: "inspect-mode";
      enabled: boolean;
    }
  | {
      type: "selected-target";
      targetId: StyleTargetId;
      source: "docked" | "popout";
    }
  | {
      type: "clear-selection";
    };

const PREVIEW_TARGETS: readonly WillardPreviewTarget[] = [
  "feed-homepage",
  "live-spotlight",
  "live-blog",
] as const;

export function normalizeWillardPreviewTarget(
  value: string | null | undefined
): WillardPreviewTarget {
  const candidate = (value ?? "").trim();
  if ((PREVIEW_TARGETS as readonly string[]).includes(candidate)) {
    return candidate as WillardPreviewTarget;
  }
  return "feed-homepage";
}

export function getPreviewPathForTarget(target: WillardPreviewTarget): string {
  switch (target) {
    case "live-spotlight":
      return "/the-feed/spotlight/ye";
    case "live-blog":
      return "/the-feed/blog/weekly-blog-placeholder-entry";
    case "feed-homepage":
    default:
      return "/the-feed";
  }
}

export function getPreviewLabelForTarget(target: WillardPreviewTarget): string {
  switch (target) {
    case "feed-homepage":
      return "Feed Homepage";
    case "live-spotlight":
      return "Live Spotlight Page";
    case "live-blog":
      return "Live Blog Page";
    default:
      return "Feed Homepage";
  }
}

export function buildWillardPreviewUrl(target: WillardPreviewTarget): string {
  return `/willard/preview?target=${encodeURIComponent(target)}`;
}

export function createWillardPreviewChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof window.BroadcastChannel === "undefined") {
    return null;
  }
  return new window.BroadcastChannel(WILLARD_PREVIEW_CHANNEL_NAME);
}

export function postWillardPreviewMessage(
  channel: BroadcastChannel | null,
  message: WillardPreviewMessage
): void {
  if (!channel) {
    return;
  }
  try {
    channel.postMessage(message);
  } catch {
    // ignore channel post failures and allow normal editor behavior
  }
}

export function writeWillardPreviewSnapshot(snapshot: WillardPreviewSnapshot): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(WILLARD_PREVIEW_SYNC_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore localStorage failures
  }
}

export function readWillardPreviewSnapshot(): WillardPreviewSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(WILLARD_PREVIEW_SYNC_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<WillardPreviewSnapshot>;
    const variables =
      parsed.variables && typeof parsed.variables === "object"
        ? (parsed.variables as Record<string, string>)
        : {};
    const imageOverrides = Array.isArray(parsed.imageOverrides)
      ? (parsed.imageOverrides as WillardImageOverride[])
      : [];
    const backgroundOverrides = Array.isArray(parsed.backgroundOverrides)
      ? (parsed.backgroundOverrides as WillardBackgroundOverride[])
      : [];

    return {
      variables,
      imageOverrides,
      backgroundOverrides,
      target: normalizeWillardPreviewTarget(parsed.target),
      inspectMode: Boolean(parsed.inspectMode),
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function writeWillardPreviewSelection(targetId: StyleTargetId): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      WILLARD_PREVIEW_SELECTION_STORAGE_KEY,
      JSON.stringify({ targetId, updatedAt: Date.now() })
    );
  } catch {
    // ignore localStorage failures
  }
}
