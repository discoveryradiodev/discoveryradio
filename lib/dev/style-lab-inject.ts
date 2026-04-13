/**
 * Injects CSS variables into an iframe document.
 * Used to update the live preview when style lab controls change.
 */
export function injectStyleLabVariables(
  documentRoot: HTMLElement,
  variables: Record<string, string>
) {
  if (!documentRoot) {
    return;
  }

  // Update CSS variables
  Object.entries(variables).forEach(([key, value]) => {
    documentRoot.style.setProperty(`--${key}`, value);
  });
}

/**
 * Removes a set of CSS custom properties from the iframe document root.
 * Used by reset to fully clear all style-lab-applied overrides.
 */
export function removeStyleLabVariables(
  documentRoot: HTMLElement,
  keys: string[]
) {
  if (!documentRoot) return;
  keys.forEach((key) => {
    documentRoot.style.removeProperty(`--${key}`);
  });
}

/**
 * Get all CSS variables from iframe for inspection (optional utility)
 */
export function getStyleLabVariablesFromIframe(
  documentRoot: HTMLElement
): Record<string, string> {
  if (!documentRoot) {
    return {};
  }

  const variables: Record<string, string> = {};

  // Get computed style for any CSS variable we set
  const style = window.getComputedStyle(documentRoot);
  for (let i = 0; i < style.length; i++) {
    const propName = style[i];
    if (propName.startsWith("--")) {
      variables[propName] = style.getPropertyValue(propName);
    }
  }

  return variables;
}
