/**
 * Default CSS variables for the style lab.
 * These serve as the control defaults and fallback values.
 */
import { STYLE_LAB_FONT_FAMILIES } from "@/lib/dev/style-lab-fonts";

export const STYLE_LAB_VARIABLE_SCHEMA = {
  text: [
    "font-family",
    "font-size",
    "font-weight",
    "line-height",
    "letter-spacing",
    "text-transform",
    "color",
    "text-align",
  ],
  image: [
    "width",
    "max-width",
    "opacity",
    "border-radius",
    "border-width",
    "border-color",
    "box-shadow",
    "x-offset",
    "y-offset",
    "rotation",
  ],
  button: [
    "font-family",
    "font-size",
    "font-weight",
    "text-color",
    "background-color",
    "border-width",
    "border-color",
    "border-radius",
    "padding-x",
    "padding-y",
    "box-shadow",
  ],
  container: [
    "background-color",
    "border-width",
    "border-color",
    "border-radius",
    "max-width",
    "margin-x",
    "margin-x-mode",
    "padding-x",
    "padding-y",
    "padding",
    "shadow",
    "opacity",
  ],
} as const;

export const STYLE_LAB_DEFAULTS = {
  // Text target variables
  "text-font-family": STYLE_LAB_FONT_FAMILIES[0],
  "text-font-size": "1rem",
  "text-font-weight": "400",
  "text-line-height": "1.5",
  "text-letter-spacing": "0em",
  "text-text-transform": "none",
  "text-color": "#e2e8f0",
  "text-text-align": "left",

  // Image target variables
  "image-width": "100",
  "image-max-width": "640px",
  "image-opacity": "1",
  "image-border-radius": "0px",
  "image-border-width": "0px",
  "image-border-color": "#475569",
  "image-box-shadow": "none",
  "image-x-offset": "0px",
  "image-y-offset": "0px",
  "image-rotation": "0deg",

  // Button target variables
  "button-font-family": STYLE_LAB_FONT_FAMILIES[0],
  "button-font-size": "0.875rem",
  "button-font-weight": "600",
  "button-text-color": "#f8efde",
  "button-background-color": "#0e0d0d",
  "button-border-width": "2px",
  "button-border-color": "#0e0d0d",
  "button-border-radius": "4px",
  "button-padding-x": "12px",
  "button-padding-y": "8px",
  "button-box-shadow": "none",

  // Container target variables
  "container-background-color": "transparent",
  "container-border-width": "0px",
  "container-border-color": "#475569",
  "container-border-radius": "0px",
  "container-max-width": "780px",
  "container-margin-x": "0px",
  "container-margin-x-mode": "none",
  "container-padding-x": "0px",
  "container-padding-y": "0px",
  "container-padding": "0px",
  "container-shadow": "none",
  "container-opacity": "1",

  // Spotlight card controls
  "spotlight-image-x": "0px",
  "spotlight-image-width": "220px",
  "spotlight-shape-margin": "0.35rem",
  "spotlight-excerpt-size": "1rem",
  "spotlight-title-size": "2rem",
  "spotlight-meta-size": "0.85rem",
  "spotlight-cta-bg": "#0e0d0d",
  "spotlight-cta-color": "#f8efde",
  "spotlight-panel-bg": "transparent",
  "spotlight-panel-border": "#161111",
  "spotlight-text-color": "#1b1614",

  // Live spotlight page controls
  "article-image-x": "0px",
  "article-image-width": "360px",
  "article-body-size": "1rem",
  "article-title-size": "2.75rem",
  "article-line-height": "1.75",
  "article-text-color": "#e2e8f0",
  "article-meta-color": "#94a3b8",

  // Feed shell controls
  "feed-shell-bg": "#0f1419",
  "feed-panel-bg": "#1a2332",
  "feed-masthead-color": "#000000",

  // Live blog page controls
  "blog-image-width": "640px",
  "blog-title-size": "2.75rem",
  "blog-body-size": "1rem",
  "blog-line-height": "1.75",
  "blog-text-color": "#e2e8f0",
  "blog-meta-color": "#94a3b8",
  "blog-content-max-width": "780px",
};

export type StyleLabVariables = typeof STYLE_LAB_DEFAULTS;

export function isValidVariable(
  key: string
): key is keyof typeof STYLE_LAB_DEFAULTS {
  return key in STYLE_LAB_DEFAULTS;
}

/**
 * Per-kind default values for target-scoped editing.
 * Keys match the field names used in target-scoped storage (e.g. "font-size", not "text-font-size").
 * Used by ControlPanel to show fallback values before the user has edited a target.
 */
export const KIND_FIELD_DEFAULTS = {
  text: {
    "font-family": STYLE_LAB_FONT_FAMILIES[0],
    "font-size": "1rem",
    "font-weight": "400",
    "line-height": "1.5",
    "letter-spacing": "0em",
    "text-transform": "none",
    "color": "#e2e8f0",
    "text-align": "left",
  },
  image: {
    "width": "100",
    "max-width": "640px",
    "opacity": "1",
    "border-radius": "0px",
    "border-width": "0px",
    "border-color": "#475569",
    "box-shadow": "none",
    "x-offset": "0px",
    "y-offset": "0px",
    "rotation": "0deg",
  },
  button: {
    "font-family": STYLE_LAB_FONT_FAMILIES[0],
    "font-size": "0.875rem",
    "font-weight": "600",
    "text-color": "#f8efde",
    "background-color": "#0e0d0d",
    "border-width": "2px",
    "border-color": "#0e0d0d",
    "border-radius": "4px",
    "padding-x": "12px",
    "padding-y": "8px",
    "box-shadow": "none",
  },
  container: {
    "background-color": "transparent",
    "border-width": "0px",
    "border-color": "#475569",
    "border-radius": "0px",
    "max-width": "780px",
    "margin-x": "0px",
    "margin-x-mode": "none",
    "padding-x": "0px",
    "padding-y": "0px",
    "padding": "0px",
    "shadow": "none",
    "opacity": "1",
  },
} as const;
