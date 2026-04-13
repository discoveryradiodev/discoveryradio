export type StyleLabFontCategory =
  | "sans"
  | "serif"
  | "display"
  | "mono"
  | "handwritten"
  | "experimental"
  | "slab";

export type StyleLabFontSource = "loaded" | "system";

export type StyleLabFontEntry = {
  label: string;
  family: string;
  source: StyleLabFontSource;
  category: StyleLabFontCategory;
};

export const STYLE_LAB_FONT_REGISTRY: readonly StyleLabFontEntry[] = [
  // Sans
  { label: "Assistant", family: '"Assistant", Arial, sans-serif', source: "loaded", category: "sans" },
  { label: "Archivo", family: '"Archivo", Arial, sans-serif', source: "loaded", category: "sans" },
  { label: "DM Sans", family: '"DM Sans", Arial, sans-serif', source: "loaded", category: "sans" },
  { label: "Figtree", family: '"Figtree", Arial, sans-serif', source: "loaded", category: "sans" },
  { label: "Inter", family: '"Inter", Arial, sans-serif', source: "loaded", category: "sans" },
  { label: "IBM Plex Sans", family: '"IBM Plex Sans", Arial, sans-serif', source: "loaded", category: "sans" },
  { label: "Karla", family: '"Karla", Arial, sans-serif', source: "loaded", category: "sans" },
  { label: "Manrope", family: '"Manrope", Arial, sans-serif', source: "loaded", category: "sans" },
  { label: "Nunito Sans", family: '"Nunito Sans", Arial, sans-serif', source: "loaded", category: "sans" },
  { label: "Outfit", family: '"Outfit", Arial, sans-serif', source: "loaded", category: "sans" },
  { label: "Plus Jakarta Sans", family: '"Plus Jakarta Sans", Arial, sans-serif', source: "loaded", category: "sans" },
  { label: "Public Sans", family: '"Public Sans", Arial, sans-serif', source: "loaded", category: "sans" },
  { label: "Sora", family: '"Sora", Arial, sans-serif', source: "loaded", category: "sans" },
  { label: "Space Grotesk", family: '"Space Grotesk", Arial, sans-serif', source: "loaded", category: "sans" },
  { label: "Urbanist", family: '"Urbanist", Arial, sans-serif', source: "loaded", category: "sans" },
  { label: "Work Sans", family: '"Work Sans", Arial, sans-serif', source: "loaded", category: "sans" },

  // Serif
  { label: "Alegreya", family: '"Alegreya", Georgia, serif', source: "loaded", category: "serif" },
  { label: "Bitter", family: '"Bitter", Georgia, serif', source: "loaded", category: "serif" },
  { label: "Cardo", family: '"Cardo", Georgia, serif', source: "loaded", category: "serif" },
  { label: "Cormorant Garamond", family: '"Cormorant Garamond", Georgia, serif', source: "loaded", category: "serif" },
  { label: "Crimson Text", family: '"Crimson Text", Georgia, serif', source: "loaded", category: "serif" },
  { label: "DM Serif Display", family: '"DM Serif Display", Georgia, serif', source: "loaded", category: "serif" },
  { label: "DM Serif Text", family: '"DM Serif Text", Georgia, serif', source: "loaded", category: "serif" },
  { label: "EB Garamond", family: '"EB Garamond", Georgia, serif', source: "loaded", category: "serif" },
  { label: "Libre Baskerville", family: '"Libre Baskerville", Georgia, serif', source: "loaded", category: "serif" },
  { label: "Lora", family: '"Lora", Georgia, serif', source: "loaded", category: "serif" },
  { label: "Merriweather", family: '"Merriweather", Georgia, serif', source: "loaded", category: "serif" },
  { label: "Old Standard TT", family: '"Old Standard TT", Georgia, serif', source: "loaded", category: "serif" },
  { label: "Playfair Display", family: '"Playfair Display", Georgia, serif', source: "loaded", category: "serif" },
  { label: "Prata", family: '"Prata", Georgia, serif', source: "loaded", category: "serif" },
  { label: "Spectral", family: '"Spectral", Georgia, serif', source: "loaded", category: "serif" },
  { label: "Vollkorn", family: '"Vollkorn", Georgia, serif', source: "loaded", category: "serif" },

  // Display
  { label: "Abril Fatface", family: '"Abril Fatface", Impact, sans-serif', source: "loaded", category: "display" },
  { label: "Alfa Slab One", family: '"Alfa Slab One", Impact, serif', source: "loaded", category: "display" },
  { label: "Anton", family: '"Anton", Impact, sans-serif', source: "loaded", category: "display" },
  { label: "Archivo Narrow", family: '"Archivo Narrow", Arial Narrow, sans-serif', source: "loaded", category: "display" },
  { label: "Bebas Neue", family: '"Bebas Neue", Impact, sans-serif', source: "loaded", category: "display" },
  { label: "Bowlby One SC", family: '"Bowlby One SC", Impact, sans-serif', source: "loaded", category: "display" },
  { label: "Bungee", family: '"Bungee", Impact, sans-serif', source: "loaded", category: "display" },
  { label: "Fjalla One", family: '"Fjalla One", Impact, sans-serif', source: "loaded", category: "display" },
  { label: "Oswald", family: '"Oswald", Arial Narrow, sans-serif', source: "loaded", category: "display" },
  { label: "Passion One", family: '"Passion One", Impact, sans-serif', source: "loaded", category: "display" },
  { label: "Rajdhani", family: '"Rajdhani", Arial, sans-serif', source: "loaded", category: "display" },
  { label: "Righteous", family: '"Righteous", Impact, sans-serif', source: "loaded", category: "display" },
  { label: "Rubik Mono One", family: '"Rubik Mono One", monospace', source: "loaded", category: "display" },
  { label: "Saira Condensed", family: '"Saira Condensed", Arial Narrow, sans-serif', source: "loaded", category: "display" },
  { label: "Staatliches", family: '"Staatliches", Impact, sans-serif', source: "loaded", category: "display" },
  { label: "Teko", family: '"Teko", Arial Narrow, sans-serif', source: "loaded", category: "display" },

  // Mono
  { label: "Anonymous Pro", family: '"Anonymous Pro", "Courier New", monospace', source: "loaded", category: "mono" },
  { label: "Cutive Mono", family: '"Cutive Mono", "Courier New", monospace', source: "loaded", category: "mono" },
  { label: "IBM Plex Mono", family: '"IBM Plex Mono", "Courier New", monospace', source: "loaded", category: "mono" },
  { label: "Inconsolata", family: '"Inconsolata", "Courier New", monospace', source: "loaded", category: "mono" },
  { label: "JetBrains Mono", family: '"JetBrains Mono", "Courier New", monospace', source: "loaded", category: "mono" },
  { label: "PT Mono", family: '"PT Mono", "Courier New", monospace', source: "loaded", category: "mono" },
  { label: "Source Code Pro", family: '"Source Code Pro", "Courier New", monospace', source: "loaded", category: "mono" },
  { label: "Space Mono", family: '"Space Mono", "Courier New", monospace', source: "loaded", category: "mono" },
  { label: "Special Elite", family: '"Special Elite", "Courier New", monospace', source: "loaded", category: "mono" },

  // Handwritten
  { label: "Architects Daughter", family: '"Architects Daughter", "Comic Sans MS", cursive', source: "loaded", category: "handwritten" },
  { label: "Caveat", family: '"Caveat", "Comic Sans MS", cursive', source: "loaded", category: "handwritten" },
  { label: "Covered By Your Grace", family: '"Covered By Your Grace", "Comic Sans MS", cursive', source: "loaded", category: "handwritten" },
  { label: "Gloria Hallelujah", family: '"Gloria Hallelujah", "Comic Sans MS", cursive', source: "loaded", category: "handwritten" },
  { label: "Indie Flower", family: '"Indie Flower", "Comic Sans MS", cursive', source: "loaded", category: "handwritten" },
  { label: "Kalam", family: '"Kalam", "Comic Sans MS", cursive', source: "loaded", category: "handwritten" },
  { label: "Nanum Pen Script", family: '"Nanum Pen Script", "Comic Sans MS", cursive', source: "loaded", category: "handwritten" },
  { label: "Patrick Hand", family: '"Patrick Hand", "Comic Sans MS", cursive', source: "loaded", category: "handwritten" },
  { label: "Permanent Marker", family: '"Permanent Marker", "Comic Sans MS", cursive', source: "loaded", category: "handwritten" },
  { label: "Reenie Beanie", family: '"Reenie Beanie", "Comic Sans MS", cursive', source: "loaded", category: "handwritten" },
  { label: "Rock Salt", family: '"Rock Salt", "Comic Sans MS", cursive', source: "loaded", category: "handwritten" },
  { label: "Shadows Into Light", family: '"Shadows Into Light", "Comic Sans MS", cursive', source: "loaded", category: "handwritten" },

  // Experimental
  { label: "Audiowide", family: '"Audiowide", "Trebuchet MS", sans-serif', source: "loaded", category: "experimental" },
  { label: "Black Ops One", family: '"Black Ops One", Impact, sans-serif', source: "loaded", category: "experimental" },
  { label: "Bungee Shade", family: '"Bungee Shade", Impact, sans-serif', source: "loaded", category: "experimental" },
  { label: "Butcherman", family: '"Butcherman", Impact, serif', source: "loaded", category: "experimental" },
  { label: "Creepster", family: '"Creepster", Impact, cursive', source: "loaded", category: "experimental" },
  { label: "Cinzel Decorative", family: '"Cinzel Decorative", Georgia, serif', source: "loaded", category: "experimental" },
  { label: "Fascinate", family: '"Fascinate", Impact, serif', source: "loaded", category: "experimental" },
  { label: "Fredericka the Great", family: '"Fredericka the Great", Georgia, serif', source: "loaded", category: "experimental" },
  { label: "Frijole", family: '"Frijole", Impact, cursive', source: "loaded", category: "experimental" },
  { label: "Grenze Gotisch", family: '"Grenze Gotisch", Georgia, serif', source: "loaded", category: "experimental" },
  { label: "Monoton", family: '"Monoton", Impact, cursive', source: "loaded", category: "experimental" },
  { label: "Nosifer", family: '"Nosifer", Impact, cursive', source: "loaded", category: "experimental" },
  { label: "Orbitron", family: '"Orbitron", Arial, sans-serif', source: "loaded", category: "experimental" },
  { label: "Pirata One", family: '"Pirata One", Georgia, serif', source: "loaded", category: "experimental" },
  { label: "Press Start 2P", family: '"Press Start 2P", "Courier New", monospace', source: "loaded", category: "experimental" },
  { label: "Rye", family: '"Rye", Georgia, serif', source: "loaded", category: "experimental" },
  { label: "Syncopate", family: '"Syncopate", Arial, sans-serif', source: "loaded", category: "experimental" },
  { label: "UnifrakturCook", family: '"UnifrakturCook", Georgia, serif', source: "loaded", category: "experimental" },

  // Slab
  { label: "Arvo", family: '"Arvo", Georgia, serif', source: "loaded", category: "slab" },
  { label: "Bevan", family: '"Bevan", Georgia, serif', source: "loaded", category: "slab" },
  { label: "Bitter", family: '"Bitter", Georgia, serif', source: "loaded", category: "slab" },
  { label: "Josefin Slab", family: '"Josefin Slab", Georgia, serif', source: "loaded", category: "slab" },
  { label: "Roboto Slab", family: '"Roboto Slab", Georgia, serif', source: "loaded", category: "slab" },
  { label: "Zilla Slab", family: '"Zilla Slab", Georgia, serif', source: "loaded", category: "slab" },

  // System fallbacks
  { label: "Arial", family: 'Arial, sans-serif', source: "system", category: "sans" },
  { label: "Arial Black", family: '"Arial Black", Gadget, sans-serif', source: "system", category: "display" },
  { label: "Courier New", family: '"Courier New", Courier, monospace', source: "system", category: "mono" },
  { label: "Georgia", family: 'Georgia, serif', source: "system", category: "serif" },
  { label: "Impact", family: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif', source: "system", category: "display" },
  { label: "Palatino", family: '"Palatino Linotype", "Book Antiqua", Palatino, serif', source: "system", category: "serif" },
  { label: "Segoe UI", family: '"Segoe UI", Arial, sans-serif', source: "system", category: "sans" },
  { label: "Tahoma", family: 'Tahoma, Geneva, sans-serif', source: "system", category: "sans" },
  { label: "Times New Roman", family: '"Times New Roman", Times, serif', source: "system", category: "serif" },
  { label: "Verdana", family: 'Verdana, Geneva, sans-serif', source: "system", category: "sans" },
] as const;

const CATEGORY_LABELS: Record<StyleLabFontCategory, string> = {
  sans: "Sans",
  serif: "Serif",
  display: "Display",
  mono: "Mono",
  handwritten: "Handwritten",
  experimental: "Experimental",
  slab: "Slab",
};

export const STYLE_LAB_FONT_FAMILIES = STYLE_LAB_FONT_REGISTRY.map((font) => font.family);

export const STYLE_LAB_WEB_FONTS = STYLE_LAB_FONT_REGISTRY.filter((font) => font.source === "loaded");
export const STYLE_LAB_SYSTEM_FONTS = STYLE_LAB_FONT_REGISTRY.filter((font) => font.source === "system");

export const STYLE_LAB_FONT_OPTIONS = STYLE_LAB_FONT_REGISTRY.map((font) => ({
  label: `${CATEGORY_LABELS[font.category]} | ${font.label}${font.source === "system" ? " (System)" : ""}`,
  value: font.family,
}));
