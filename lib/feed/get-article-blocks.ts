import { fetchGoogleDocText, normalizeDocTextToArticleBlocks } from '@/lib/feed/google-docs';
import {
  getArchivedArtistSpotlightBySlug,
  getArchivedWeeklyBlogBySlug,
  getArtistSpotlightBySlug,
  getWeeklyBlogBySlug,
} from '@/lib/feed/get-feed-data';
import type { ArticleBlock } from '@/types/article';

export async function getArtistSpotlightArticleBlocks(
  slug: string
): Promise<ArticleBlock[] | null> {
  const liveSpotlight = await getArtistSpotlightBySlug(slug);

  if (liveSpotlight) {
    if (!liveSpotlight.docId) return null;
    const text = await fetchGoogleDocText(liveSpotlight.docId);
    return normalizeDocTextToArticleBlocks(text);
  }

  const archivedSpotlight = await getArchivedArtistSpotlightBySlug(slug);
  if (!archivedSpotlight) return null;

  if (!archivedSpotlight.docId) {
    return null;
  }

  const text = await fetchGoogleDocText(archivedSpotlight.docId);
  return normalizeDocTextToArticleBlocks(text);
}

export async function getWeeklyBlogArticleBlocks(
  slug: string
): Promise<ArticleBlock[] | null> {
  const livePost = await getWeeklyBlogBySlug(slug);

  if (livePost) {
    if (!livePost.docId) return null;
    const text = await fetchGoogleDocText(livePost.docId);
    return normalizeDocTextToArticleBlocks(text);
  }

  const archivedPost = await getArchivedWeeklyBlogBySlug(slug);
  if (!archivedPost) return null;

  if (!archivedPost.docId) {
    return null;
  }

  const text = await fetchGoogleDocText(archivedPost.docId);
  return normalizeDocTextToArticleBlocks(text);
}
