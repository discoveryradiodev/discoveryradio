/**
 * Style Lab Inspect Mode
 * Manages hover/click detection on iframe elements with data-style-target attributes
 */

export type InspectControlGroup =
  | "feedShell"
  | "spotlight"
  | "profile"
  | "homepageBlog"
  | "playlist"
  | "archivePreview"
  | "socials"
  | "discord"
  | "article"
  | "blog";

export type StyleTargetKind = "text" | "image" | "button" | "container";

export type StyleTargetDefinition = {
  label: string;
  group: InspectControlGroup;
  kind: StyleTargetKind;
};

export const STYLE_TARGET_REGISTRY = {
  "feed-masthead-title": { label: "Feed Masthead Title", group: "feedShell", kind: "text" },
  "feed-masthead-subtitle": { label: "Feed Masthead Subtitle", group: "feedShell", kind: "text" },
  "feed-archive-link": { label: "Feed Archive Link", group: "feedShell", kind: "button" },

  "spotlight-image": { label: "Spotlight Image", group: "spotlight", kind: "image" },
  "spotlight-headline": { label: "Spotlight Headline", group: "spotlight", kind: "text" },
  "spotlight-header": { label: "Spotlight Header Block", group: "spotlight", kind: "container" },
  "spotlight-title": { label: "Spotlight Title", group: "spotlight", kind: "text" },
  "spotlight-meta": { label: "Spotlight Meta", group: "spotlight", kind: "text" },
  "spotlight-excerpt": { label: "Spotlight Excerpt", group: "spotlight", kind: "text" },
  "spotlight-cta": { label: "Spotlight CTA", group: "spotlight", kind: "button" },

  "profile-title": { label: "Profile Title", group: "profile", kind: "text" },
  "profile-body": { label: "Profile Body", group: "profile", kind: "text" },
  "profile-link": { label: "Profile Link", group: "profile", kind: "button" },

  "homepage-blog-image": { label: "Homepage Blog Image", group: "homepageBlog", kind: "image" },
  "homepage-blog-title": { label: "Homepage Blog Title", group: "homepageBlog", kind: "text" },
  "homepage-blog-meta": { label: "Homepage Blog Meta", group: "homepageBlog", kind: "text" },
  "homepage-blog-excerpt": { label: "Homepage Blog Excerpt", group: "homepageBlog", kind: "text" },
  "homepage-blog-cta": { label: "Homepage Blog CTA", group: "homepageBlog", kind: "button" },

  "playlist-title": { label: "Playlist Title", group: "playlist", kind: "text" },
  "playlist-month": { label: "Playlist Month Label", group: "playlist", kind: "text" },
  "playlist-body": { label: "Playlist Body", group: "playlist", kind: "text" },
  "playlist-link": { label: "Playlist Link", group: "playlist", kind: "button" },

  "archive-title": { label: "Archive Title", group: "archivePreview", kind: "text" },
  "archive-list": { label: "Archive List", group: "archivePreview", kind: "container" },
  "archive-link": { label: "Archive Link", group: "archivePreview", kind: "button" },

  "socials-title": { label: "Socials Title", group: "socials", kind: "text" },
  "socials-links": { label: "Socials Links", group: "socials", kind: "container" },

  "discord-title": { label: "Discord Title", group: "discord", kind: "text" },
  "discord-body": { label: "Discord Description", group: "discord", kind: "text" },
  "discord-button": { label: "Discord Button", group: "discord", kind: "button" },

  "article-content-frame": { label: "Spotlight Content Frame", group: "article", kind: "container" },
  "article-hero": { label: "Spotlight Hero Block", group: "article", kind: "container" },
  "article-image": { label: "Spotlight Article Image", group: "article", kind: "image" },
  "article-image-wrap": { label: "Spotlight Article Image Wrap", group: "article", kind: "container" },
  "article-title": { label: "Spotlight Article Title", group: "article", kind: "text" },
  "article-identity": { label: "Spotlight Artist Identity", group: "article", kind: "text" },
  "article-meta": { label: "Spotlight Article Meta", group: "article", kind: "text" },
  "article-published": { label: "Spotlight Published Date", group: "article", kind: "text" },
  "article-body": { label: "Spotlight Article Body", group: "article", kind: "text" },

  "blog-content-frame": { label: "Blog Content Frame", group: "blog", kind: "container" },
  "blog-image": { label: "Blog Image", group: "blog", kind: "image" },
  "blog-title": { label: "Blog Title", group: "blog", kind: "text" },
  "blog-meta": { label: "Blog Meta", group: "blog", kind: "text" },
  "blog-body": { label: "Blog Body", group: "blog", kind: "text" },
} as const satisfies Record<string, StyleTargetDefinition>;

export type StyleTargetId = keyof typeof STYLE_TARGET_REGISTRY;

export const TARGET_TO_GROUP = Object.fromEntries(
  Object.entries(STYLE_TARGET_REGISTRY).map(([targetId, definition]) => [targetId, definition.group])
) as Record<StyleTargetId, InspectControlGroup>;

export const TARGET_TO_KIND = Object.fromEntries(
  Object.entries(STYLE_TARGET_REGISTRY).map(([targetId, definition]) => [targetId, definition.kind])
) as Record<StyleTargetId, StyleTargetKind>;

export function isStyleTargetId(value: string | null): value is StyleTargetId {
  return !!value && value in STYLE_TARGET_REGISTRY;
}

const HOVER_CLASS = "style-lab-inspect-hover";
const SELECTED_CLASS = "style-lab-inspect-selected";

export function attachInspectListeners(
  iframeDocument: Document,
  onTargetSelect: (targetId: StyleTargetId) => void
) {
  const listeners = {
    mouseover: (e: Event) => handleMouseOver(e as MouseEvent, iframeDocument),
    mouseout: (e: Event) => handleMouseOut(e as MouseEvent, iframeDocument),
    click: (e: Event) => handleClick(e as MouseEvent, iframeDocument, onTargetSelect),
  };

  // Prevent link navigation while inspecting
  const preventNav = (e: Event) => {
    if ((e.target as Element)?.closest("[data-style-target]")) {
      e.preventDefault();
    }
  };

  iframeDocument.addEventListener("mouseover", listeners.mouseover);
  iframeDocument.addEventListener("mouseout", listeners.mouseout);
  iframeDocument.addEventListener("click", listeners.click, true);
  iframeDocument.addEventListener("click", preventNav, true);

  return () => {
    iframeDocument.removeEventListener("mouseover", listeners.mouseover);
    iframeDocument.removeEventListener("mouseout", listeners.mouseout);
    iframeDocument.removeEventListener("click", listeners.click, true);
    iframeDocument.removeEventListener("click", preventNav, true);
  };
}

function handleMouseOver(e: MouseEvent, iframeDocument: Document) {
  const target = (e.target as Element)?.closest("[data-style-target]");
  if (target && !target.classList.contains(SELECTED_CLASS)) {
    target.classList.add(HOVER_CLASS);
    injectInspectStyles(iframeDocument);
  }
}

function handleMouseOut(e: MouseEvent, iframeDocument: Document) {
  const target = (e.target as Element)?.closest("[data-style-target]");
  if (target && !target.classList.contains(SELECTED_CLASS)) {
    target.classList.remove(HOVER_CLASS);
  }
}

function handleClick(
  e: MouseEvent,
  iframeDocument: Document,
  onTargetSelect: (targetId: StyleTargetId) => void
) {
  const target = (e.target as Element)?.closest("[data-style-target]") as HTMLElement | null;
  if (!target) return;

  e.preventDefault();
  e.stopPropagation();

  // Clear previous selection
  const prevSelected = iframeDocument.querySelector(`.${SELECTED_CLASS}`);
  if (prevSelected) {
    prevSelected.classList.remove(SELECTED_CLASS);
  }

  // Select new target
  target.classList.add(SELECTED_CLASS);
  const targetId = target.getAttribute("data-style-target");
  if (!isStyleTargetId(targetId)) {
    return;
  }
  onTargetSelect(targetId);
}

export function clearSelection(iframeDocument: Document) {
  const selected = iframeDocument.querySelector(`.${SELECTED_CLASS}`);
  if (selected) {
    selected.classList.remove(SELECTED_CLASS, HOVER_CLASS);
  }

  const hovered = iframeDocument.querySelector(`.${HOVER_CLASS}`);
  if (hovered) {
    hovered.classList.remove(HOVER_CLASS);
  }
}

function injectInspectStyles(iframeDocument: Document) {
  // Check if already injected
  if (iframeDocument.getElementById("style-lab-inspect-styles")) {
    return;
  }

  const style = iframeDocument.createElement("style");
  style.id = "style-lab-inspect-styles";
  style.textContent = `
    .${HOVER_CLASS} {
      outline: 2px solid #60a5fa !important;
      outline-offset: 2px !important;
    }
    .${SELECTED_CLASS} {
      outline: 3px solid #3b82f6 !important;
      outline-offset: 2px !important;
      box-shadow: inset 0 0 8px rgba(59, 130, 246, 0.2) !important;
    }
    a[data-style-target] {
      cursor: pointer !important;
    }
  `;
  iframeDocument.head.appendChild(style);
}
