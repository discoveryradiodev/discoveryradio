import type { WillardImageOverride } from "@/lib/dev/willard-assets";

const ORIGINAL_SRC_ATTR = "data-style-lab-original-src";
const ORIGINAL_ALT_ATTR = "data-style-lab-original-alt";
const ORIGINAL_STYLE_ATTR = "data-style-lab-original-style";
const ORIGINAL_STYLE_PRESENT_ATTR = "data-style-lab-original-style-present";
const OVERRIDDEN_ATTR = "data-style-lab-image-overridden";

export function applyImageOverridesToDocument(
  doc: Document,
  imageOverrides: WillardImageOverride[]
): void {
  const overrideMap = new Map(
    imageOverrides
      .filter((item) => item && item.targetId && item.url)
      .map((item) => [item.targetId, item])
  );

  const allTargetNodes = Array.from(doc.querySelectorAll<HTMLElement>("[data-style-target]"));
  for (const node of allTargetNodes) {
    const targetId = node.getAttribute("data-style-target");
    if (!targetId) {
      continue;
    }

    const override = overrideMap.get(targetId);
    const image = resolveTargetImage(node);
    if (!image) {
      continue;
    }

    if (!override) {
      restoreImageIfOverridden(image);
      continue;
    }

    if (!image.getAttribute(ORIGINAL_SRC_ATTR)) {
      image.setAttribute(ORIGINAL_SRC_ATTR, image.getAttribute("src") ?? "");
    }
    if (!image.getAttribute(ORIGINAL_ALT_ATTR)) {
      image.setAttribute(ORIGINAL_ALT_ATTR, image.getAttribute("alt") ?? "");
    }
    if (!image.hasAttribute(ORIGINAL_STYLE_PRESENT_ATTR)) {
      const originalStyle = image.getAttribute("style");
      image.setAttribute(ORIGINAL_STYLE_PRESENT_ATTR, originalStyle === null ? "false" : "true");
      image.setAttribute(ORIGINAL_STYLE_ATTR, originalStyle ?? "");
    }

    image.setAttribute("src", override.url);
    if (typeof override.altText === "string" && override.altText.trim()) {
      image.setAttribute("alt", override.altText);
    }

    applyImageStyles(image, override);
    image.setAttribute(OVERRIDDEN_ATTR, "true");
  }

  const previouslyOverridden = Array.from(
    doc.querySelectorAll<HTMLImageElement>(`img[${OVERRIDDEN_ATTR}="true"]`)
  );
  for (const image of previouslyOverridden) {
    const targetNode = image.closest<HTMLElement>("[data-style-target]");
    const targetId = targetNode?.getAttribute("data-style-target") ?? "";
    if (!overrideMap.has(targetId)) {
      restoreImageIfOverridden(image);
    }
  }
}

function resolveTargetImage(node: HTMLElement): HTMLImageElement | null {
  if (node instanceof HTMLImageElement) {
    return node;
  }
  return node.querySelector("img");
}

function restoreImageIfOverridden(image: HTMLImageElement): void {
  if (image.getAttribute(OVERRIDDEN_ATTR) !== "true") {
    return;
  }

  const originalSrc = image.getAttribute(ORIGINAL_SRC_ATTR);
  const originalAlt = image.getAttribute(ORIGINAL_ALT_ATTR);

  if (originalSrc !== null) {
    image.setAttribute("src", originalSrc);
  }
  if (originalAlt !== null) {
    image.setAttribute("alt", originalAlt);
  }

  const hadStyleAttribute = image.getAttribute(ORIGINAL_STYLE_PRESENT_ATTR) === "true";
  const originalStyle = image.getAttribute(ORIGINAL_STYLE_ATTR) ?? "";
  if (hadStyleAttribute) {
    image.setAttribute("style", originalStyle);
  } else {
    image.removeAttribute("style");
  }

  image.removeAttribute(ORIGINAL_SRC_ATTR);
  image.removeAttribute(ORIGINAL_ALT_ATTR);
  image.removeAttribute(ORIGINAL_STYLE_ATTR);
  image.removeAttribute(ORIGINAL_STYLE_PRESENT_ATTR);
  image.removeAttribute(OVERRIDDEN_ATTR);
}

function applyImageStyles(image: HTMLImageElement, override: WillardImageOverride): void {
  const objectPositionX = clamp(override.objectPositionX, 0, 100);
  const objectPositionY = clamp(override.objectPositionY, 0, 100);
  const widthPercent = clamp(override.width, 0, 100);
  const maxWidthPx = clamp(override.maxWidth, 0, 4000);
  const opacity = clamp(override.opacity, 0, 1);
  const borderRadiusPx = clamp(override.borderRadius, 0, 1000);
  const borderWidthPx = clamp(override.borderWidth, 0, 100);
  const xOffsetPx = clamp(override.xOffset, -2000, 2000);
  const yOffsetPx = clamp(override.yOffset, -2000, 2000);
  const rotationDeg = clamp(override.rotation, -360, 360);
  const zIndex = Math.round(clamp(override.zIndex, -20, 20));

  image.style.objectFit = normalizeObjectFit(override.objectFit);
  image.style.objectPosition = `${objectPositionX}% ${objectPositionY}%`;
  image.style.width = `${widthPercent}%`;
  image.style.maxWidth = maxWidthPx > 0 ? `${maxWidthPx}px` : "none";
  image.style.opacity = `${opacity}`;
  image.style.borderRadius = `${borderRadiusPx}px`;
  image.style.borderWidth = `${borderWidthPx}px`;
  image.style.borderColor = normalizeColor(override.borderColor);
  image.style.borderStyle = borderWidthPx > 0 ? "solid" : "none";
  image.style.transform = `translate(${xOffsetPx}px, ${yOffsetPx}px) rotate(${rotationDeg}deg)`;

  if (zIndex !== 0) {
    image.style.position = "relative";
    image.style.zIndex = `${zIndex}`;
  } else {
    image.style.position = "";
    image.style.zIndex = "";
  }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function normalizeObjectFit(value: string): "cover" | "contain" | "fill" | "none" | "scale-down" {
  if (
    value === "cover" ||
    value === "contain" ||
    value === "fill" ||
    value === "none" ||
    value === "scale-down"
  ) {
    return value;
  }
  return "cover";
}

function normalizeColor(value: string): string {
  const next = typeof value === "string" ? value.trim() : "";
  return next || "transparent";
}
