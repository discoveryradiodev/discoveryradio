import type { FeedModuleDisplay } from '@/types/feed-modules';

// Named preview character-length constants — adjust here to change all truncation site-wide.
export const PREVIEW_CHARS = {
  homepageSpotlightExcerpt: 260,
  homepageBlogExcerpt: 300,
  archiveOverviewCard: 240,
  archiveCategoryCard: 280,
} as const;

// Number of items shown per section in the archive overview page.
export const ARCHIVE_OVERVIEW_PREVIEW_LIMIT = 1;

/**
 * Trims text to maxChars without cutting mid-word.
 * Appends a unicode ellipsis only when text was actually trimmed.
 * Returns an empty string for null / undefined / empty input.
 */
export function createPreviewText(
  text: string | null | undefined,
  maxChars: number,
): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  const sliced = trimmed.slice(0, maxChars);
  const lastSpace = sliced.lastIndexOf(' ');
  const cut = lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced;
  return cut + '\u2026';
}

/** Returns true when the value is a non-empty string after trimming. */
export function isRenderableText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Returns the default display config for a given module type and rendering context.
 * Pages / module builders call this so display rules stay in one place.
 */
export function getDefaultModuleDisplay(
  type: string,
  context: 'homepage' | 'archive-overview' | 'archive-category' | 'article',
): FeedModuleDisplay {
  if (context === 'article') {
    return {
      textMode: 'full',
      allowImage: true,
      allowEmbed: false,
      fallbackBehavior: 'hide',
    };
  }

  if (context === 'homepage') {
    const excerptMaxChars =
      type === 'artistSpotlight'
        ? PREVIEW_CHARS.homepageSpotlightExcerpt
        : type === 'weeklyBlog'
          ? PREVIEW_CHARS.homepageBlogExcerpt
          : undefined;
    return {
      textMode: 'preview',
      excerptMaxChars,
      allowImage: true,
      allowEmbed: true,
      fallbackBehavior: 'hide',
    };
  }

  if (context === 'archive-overview') {
    return {
      textMode: 'preview',
      maxItems: ARCHIVE_OVERVIEW_PREVIEW_LIMIT,
      excerptMaxChars: PREVIEW_CHARS.archiveOverviewCard,
      allowImage: true,
      allowEmbed: false,
      fallbackBehavior: 'hide',
    };
  }

  // archive-category
  return {
    textMode: 'preview',
    excerptMaxChars: PREVIEW_CHARS.archiveCategoryCard,
    allowImage: true,
    allowEmbed: false,
    fallbackBehavior: 'hide',
  };
}

/**
 * Sorts an array of module-like objects by priority (ascending),
 * then by publishedAt (descending, newest first).
 */
export function sortByPriorityThenDate<T extends { priority: number; publishedAt?: string }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return bTime - aTime;
  });
}
