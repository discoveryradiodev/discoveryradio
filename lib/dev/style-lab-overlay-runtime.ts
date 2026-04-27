import type { WillardOverlayDraft } from "@/lib/dev/willard-assets";

const OVERLAY_ROOT_ID = "style-lab-overlay-root";

const BLEND_MODE_SET = new Set([
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
]);

export function applyOverlayDraftsToDocument(doc: Document, drafts: WillardOverlayDraft[]): void {
  let root = doc.getElementById(OVERLAY_ROOT_ID) as HTMLDivElement | null;

  if (!drafts.length) {
    if (root) {
      root.remove();
    }
    return;
  }

  if (!root) {
    root = doc.createElement("div");
    root.id = OVERLAY_ROOT_ID;
    root.setAttribute("data-style-lab-overlay-root", "true");
    root.style.position = "fixed";
    root.style.inset = "0";
    root.style.pointerEvents = "none";
    root.style.zIndex = "2147483000";
    root.style.isolation = "isolate";
    doc.body.appendChild(root);
  }

  root.innerHTML = "";

  const fragment = doc.createDocumentFragment();

  for (const draft of drafts) {
    if (!draft || typeof draft.url !== "string" || !draft.url.trim()) {
      continue;
    }

    const overlay = doc.createElement("div");
    overlay.setAttribute("data-style-lab-overlay-id", draft.id);
    overlay.setAttribute("data-style-lab-overlay-locked", draft.locked ? "true" : "false");
    overlay.style.position = "fixed";
    overlay.style.left = `${clampNumber(draft.x, -5000, 10000)}px`;
    overlay.style.top = `${clampNumber(draft.y, -5000, 10000)}px`;
    overlay.style.width = `${clampNumber(draft.width, 1, 10000)}px`;
    overlay.style.height = `${clampNumber(draft.height, 1, 10000)}px`;
    overlay.style.transformOrigin = "center center";
    overlay.style.transform = `rotate(${clampNumber(draft.rotation, -1080, 1080)}deg)`;
    overlay.style.opacity = `${clampNumber(draft.opacity, 0, 1)}`;
    overlay.style.mixBlendMode = normalizeBlendMode(draft.blendMode);
    overlay.style.zIndex = `${Math.round(clampNumber(draft.zIndex, -2000, 2000))}`;
    overlay.style.pointerEvents = "none";
    overlay.style.userSelect = "none";
    overlay.style.display = draft.visible ? "block" : "none";

    const img = doc.createElement("img");
    img.src = draft.url;
    img.alt = draft.name || "Overlay";
    img.draggable = false;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "fill";
    img.style.pointerEvents = "none";
    img.style.userSelect = "none";

    overlay.appendChild(img);
    fragment.appendChild(overlay);
  }

  root.appendChild(fragment);
}

export function removeOverlayDraftsFromDocument(doc: Document): void {
  const root = doc.getElementById(OVERLAY_ROOT_ID);
  if (root) {
    root.remove();
  }
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function normalizeBlendMode(value: string): string {
  const normalized = (value ?? "").trim().toLowerCase();
  if (BLEND_MODE_SET.has(normalized)) {
    return normalized;
  }
  return "normal";
}
