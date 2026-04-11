import { fetchSheetRows } from '@/lib/feed/google-sheets';
import { mockFeedData } from '@/lib/feed/mock-data';
import type {
  ArtistProfile,
  ArtistSpotlight,
  FeedPageData,
  MonthlyPlaylist,
  WeeklyBlogPost,
} from '@/types/feed';
import type { SheetRow } from '@/lib/feed/google-sheets';

const BLOG_REQUIRED_FIELDS = ['id', 'slug', 'title', 'doc_id'] as const;
const SPOTLIGHT_REQUIRED_FIELDS = ['id', 'slug', 'title', 'doc_id'] as const;
const MUSIC_REQUIRED_FIELDS = ['artist_name', 'month_label'] as const;

function clean(value: string | undefined): string {
  return (value ?? '').trim();
}

function isNonEmptyRow(row: SheetRow): boolean {
  return Object.values(row).some((v) => clean(v) !== '');
}

function hasRequiredFields(row: SheetRow, requiredFields: readonly string[]): boolean {
  return requiredFields.every((field) => clean(row[field]) !== '');
}

function hasPublishedStatus(row: SheetRow): boolean {
  return clean(row['status']) === 'published';
}

function isPublishedOrStatusMissing(row: SheetRow): boolean {
  const status = clean(row['status']);
  return status === '' || status === 'published';
}

function isRenderableBlogRow(row: SheetRow): boolean {
  return (
    isNonEmptyRow(row) &&
    hasRequiredFields(row, BLOG_REQUIRED_FIELDS) &&
    hasPublishedStatus(row)
  );
}

function isRenderableSpotlightRow(row: SheetRow): boolean {
  return (
    isNonEmptyRow(row) &&
    hasRequiredFields(row, SPOTLIGHT_REQUIRED_FIELDS) &&
    hasPublishedStatus(row)
  );
}

function isRenderableMusicRow(row: SheetRow): boolean {
  return (
    isNonEmptyRow(row) &&
    hasRequiredFields(row, MUSIC_REQUIRED_FIELDS) &&
    isPublishedOrStatusMissing(row)
  );
}

function firstValidRow(rows: SheetRow[], isValid: (row: SheetRow) => boolean): SheetRow | null {
  return rows.find((row) => isValid(row)) ?? null;
}

function rowToSpotlight(row: SheetRow): ArtistSpotlight {
  return {
    id: clean(row['id']),
    status: (row['status'] as ArtistSpotlight['status']) ?? 'published',
    slug: clean(row['slug']),
    title: clean(row['title']),
    excerpt: clean(row['excerpt']),
    docId: clean(row['doc_id']),
    artistName: clean(row['artist_name']),
    artistLocation: clean(row['artist_location']) || undefined,
    artistGenre: clean(row['artist_genre']) || undefined,
    headshotUrl: clean(row['headshot_url']),
    headshotAlt: clean(row['headshot_alt']),
    publishedAt: clean(row['published_at']) || new Date().toISOString(),
    updatedAt: clean(row['updated_at']) || undefined,
  };
}

function rowToBlog(row: SheetRow): WeeklyBlogPost {
  return {
    id: clean(row['id']),
    status: (row['status'] as WeeklyBlogPost['status']) ?? 'published',
    slug: clean(row['slug']),
    title: clean(row['title']),
    excerpt: clean(row['excerpt']),
    docId: clean(row['doc_id']),
    coverImageUrl: clean(row['cover_image_url']) || undefined,
    coverImageAlt: clean(row['cover_image_alt']) || undefined,
    publishedAt: clean(row['published_at']) || new Date().toISOString(),
    updatedAt: clean(row['updated_at']) || undefined,
  };
}

async function fetchLiveSpotlight(): Promise<ArtistSpotlight | null> {
  const rows = await fetchSheetRows('editor_spotlight');
  const row = firstValidRow(rows, isRenderableSpotlightRow);
  if (!row) return null;
  return rowToSpotlight(row);
}

async function fetchLiveBlog(): Promise<WeeklyBlogPost | null> {
  const rows = await fetchSheetRows('editor_blog');
  const row = firstValidRow(rows, isRenderableBlogRow);
  if (!row) return null;
  return rowToBlog(row);
}

async function fetchLiveMusic(): Promise<{
  artistProfile: ArtistProfile;
  monthlyPlaylist: MonthlyPlaylist;
}> {
  const rows = await fetchSheetRows('editor_music');
  const row = firstValidRow(rows, isRenderableMusicRow);

  const artistProfile: ArtistProfile = {
    artistName: clean(row?.['artist_name']) || 'Discovery Radio',
    embedType: 'artist',
    spotifyUrl: clean(row?.['spotify_artist_url']),
    spotifyEmbedUrl: clean(row?.['spotify_artist_embed_url']),
    monthLabel: clean(row?.['month_label']),
  };

  const monthlyPlaylist: MonthlyPlaylist = {
    title: clean(row?.['spotify_playlist_title']) || 'Monthly Playlist',
    monthLabel: clean(row?.['month_label']),
    spotifyUrl: clean(row?.['spotify_playlist_url']),
    spotifyEmbedUrl: clean(row?.['spotify_playlist_embed_url']),
    description: clean(row?.['playlist_description']) || undefined,
  };

  return { artistProfile, monthlyPlaylist };
}

export async function getFeedPageData(): Promise<FeedPageData> {
  const [artistSpotlight, weeklyBlog, music] = await Promise.all([
    fetchLiveSpotlight(),
    fetchLiveBlog(),
    fetchLiveMusic(),
  ]);

  return {
    artistSpotlight,
    artistProfile: music.artistProfile,
    weeklyBlog,
    monthlyPlaylist: music.monthlyPlaylist,
    archive: mockFeedData.archive,
    socialLinks: mockFeedData.socialLinks,
    discordUrl: mockFeedData.discordUrl,
  };
}

// fetchSheetRows errors propagate — null is returned only for a real slug mismatch.
export async function getArtistSpotlightBySlug(
  slug: string
): Promise<ArtistSpotlight | null> {
  const rows = await fetchSheetRows('editor_spotlight');
  const row = rows.find((r) => isRenderableSpotlightRow(r) && clean(r['slug']) === slug);
  return row ? rowToSpotlight(row) : null;
}

export async function getArchivedArtistSpotlightBySlug(
  slug: string
): Promise<ArtistSpotlight | null> {
  const rows = await fetchSheetRows('archive_spotlight');
  const row = rows.find((r) => isRenderableSpotlightRow(r) && clean(r['slug']) === slug);
  return row ? rowToSpotlight(row) : null;
}

export async function getWeeklyBlogBySlug(
  slug: string
): Promise<WeeklyBlogPost | null> {
  const rows = await fetchSheetRows('editor_blog');
  const row = rows.find((r) => isRenderableBlogRow(r) && clean(r['slug']) === slug);
  return row ? rowToBlog(row) : null;
}

export async function getArchivedWeeklyBlogBySlug(
  slug: string
): Promise<WeeklyBlogPost | null> {
  const rows = await fetchSheetRows('archive_blog');
  const row = rows.find((r) => isRenderableBlogRow(r) && clean(r['slug']) === slug);
  return row ? rowToBlog(row) : null;
}

export async function getArchivedWeeklyBlogs(): Promise<WeeklyBlogPost[]> {
  const rows = await fetchSheetRows('archive_blog');
  return rows.filter(isRenderableBlogRow).map(rowToBlog);
}

export async function getArchivedArtistSpotlights(): Promise<ArtistSpotlight[]> {
  const rows = await fetchSheetRows('archive_spotlight');
  return rows.filter(isRenderableSpotlightRow).map(rowToSpotlight);
}
