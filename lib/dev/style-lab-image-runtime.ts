import type { WillardImageOverride } from "@/lib/dev/willard-assets";

const ORIGINAL_SRC_ATTR = "data-style-lab-original-src";
const ORIGINAL_ALT_ATTR = "data-style-lab-original-alt";
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

    image.setAttribute("src", override.url);
    if (typeof override.altText === "string" && override.altText.trim()) {
      image.setAttribute("alt", override.altText);
    }
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

  image.removeAttribute(ORIGINAL_SRC_ATTR);
  image.removeAttribute(ORIGINAL_ALT_ATTR);
  image.removeAttribute(OVERRIDDEN_ATTR);
}
