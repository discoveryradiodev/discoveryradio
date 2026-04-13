/**
 * Check if the style lab is available in the current environment.
 * - Always available in local development
 * - In production, requires DEV_STYLE_LAB_ENABLED=true env var
 */
export function isStyleLabEnabled(): boolean {
  // In development, always enable
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  // In production, check env var
  return process.env.DEV_STYLE_LAB_ENABLED === "true";
}
