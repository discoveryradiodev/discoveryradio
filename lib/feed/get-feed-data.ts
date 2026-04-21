import { fetchSheetRows } from '@/lib/feed/google-sheets';
import { mockFeedData } from '@/lib/feed/mock-data';
import type {
  ArchiveItem,
  ArtistProfile,
  ArtistSpotlight,
  FeaturedYouTube,
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

function normalizeImagePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;
  if (trimmed.startsWith('public/')) return '/' + trimmed.slice(7);
  return '/' + trimmed;
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
    headshotUrl: normalizeImagePath(clean(row['headshot_url'])),
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
    excerpt: clean(row['excerpt']) || clean(row['exerpt']),
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
    artistName: 'Kanye West',
    embedType: 'artist',
    spotifyUrl: 'https://open.spotify.com/artist/5K4W6rqBFWDnAN6FQUkS6x',
    spotifyEmbedUrl: 'https://open.spotify.com/embed/artist/5K4W6rqBFWDnAN6FQUkS6x',
    monthLabel: 'April 2026',
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

async function fetchLiveYouTube(): Promise<FeaturedYouTube | undefined> {
  const rows = await fetchSheetRows('editor_youtube');
  const row = rows.find((r) => isNonEmptyRow(r) && clean(r['status']) === 'published');
  if (!row) return undefined;
  return {
    id: clean(row['id']),
    status: 'published',
    title: clean(row['title']),
    artistName: clean(row['artist_name']),
    youtubeUrl: clean(row['youtube_url']),
    youtubeEmbedUrl: clean(row['youtube_embed_url']),
    thumbnailUrl: clean(row['thumbnail_url']) || undefined,
    description: clean(row['description']) || undefined,
    publishedAt: clean(row['published_at']) || new Date().toISOString(),
    updatedAt: clean(row['updated_at']) || undefined,
  };
}

export async function getArchivedYouTubeItems(): Promise<ArchiveItem[]> {
  const rows = await fetchSheetRows('archive_youtube');

  return rows
    .filter((row) => isNonEmptyRow(row) && clean(row['status']) === 'published')
    .map((row) => ({
      id: clean(row['id']),
      title: clean(row['title']),
      type: 'youtube' as const,
      publishedAt: clean(row['published_at']) || new Date().toISOString(),
      href: clean(row['youtube_url']),
      description: clean(row['description']) || undefined,
    }))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

function newestByPublishedAt<T>(
  items: T[],
  getPublishedAt: (item: T) => string | undefined
): T | null {
  let bestItem: T | null = null;
  let bestTime = Number.NEGATIVE_INFINITY;
  let foundValidDate = false;

  for (const item of items) {
    const value = clean(getPublishedAt(item));
    const time = Date.parse(value);
    if (!Number.isNaN(time) && time > bestTime) {
      foundValidDate = true;
      bestTime = time;
      bestItem = item;
    }
  }

  if (foundValidDate) return bestItem;
  return items[0] ?? null;
}

async function fetchArchivePreviewItems(): Promise<ArchiveItem[]> {
  const previewItems: ArchiveItem[] = [];

  const archivedYouTubeItems = await getArchivedYouTubeItems();
  const newestArchivedYouTube = newestByPublishedAt(archivedYouTubeItems, (item) => item.publishedAt);
  if (newestArchivedYouTube) {
    previewItems.push(newestArchivedYouTube);
  }

  try {
    const archivedBlogs = await getArchivedWeeklyBlogs();
    const newestArchivedBlog = newestByPublishedAt(archivedBlogs, (item) => item.publishedAt);
    if (newestArchivedBlog) {
      previewItems.push({
        id: `archive-blog-${newestArchivedBlog.id}`,
        title: newestArchivedBlog.title,
        type: 'blog',
        publishedAt: newestArchivedBlog.publishedAt,
        href: `/the-feed/blog/${newestArchivedBlog.slug}`,
        description: newestArchivedBlog.excerpt || undefined,
      });
    }
  } catch {
    // Missing archive blog data should not break feed rendering.
  }

  try {
    const archivedSpotlights = await getArchivedArtistSpotlights();
    const newestArchivedSpotlight = newestByPublishedAt(
      archivedSpotlights,
      (item) => item.publishedAt
    );
    if (newestArchivedSpotlight) {
      previewItems.push({
        id: `archive-spotlight-${newestArchivedSpotlight.id}`,
        title: newestArchivedSpotlight.title,
        type: 'spotlight',
        publishedAt: newestArchivedSpotlight.publishedAt,
        href: `/the-feed/spotlight/${newestArchivedSpotlight.slug}`,
        description: newestArchivedSpotlight.excerpt || undefined,
      });
    }
  } catch {
    // Missing archive spotlight data should not break feed rendering.
  }

  return previewItems;
}

export async function getFeedPageData(): Promise<FeedPageData> {
  const [artistSpotlight, weeklyBlog, music, archivePreview, featuredYouTube, archivedYouTubeItems] = await Promise.all([
    fetchLiveSpotlight(),
    fetchLiveBlog(),
    fetchLiveMusic(),
    fetchArchivePreviewItems(),
    fetchLiveYouTube(),
    getArchivedYouTubeItems(),
  ]);

  return {
    artistSpotlight: artistSpotlight ?? undefined,
    artistProfile: music.artistProfile,
    weeklyBlog: weeklyBlog ?? undefined,
    monthlyPlaylist: music.monthlyPlaylist,
    featuredYouTube,
    archive: archivedYouTubeItems,
    archivePreview,
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
