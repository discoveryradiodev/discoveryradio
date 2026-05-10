import {
  getArchivedArtistSpotlights,
  getArchivedWeeklyBlogs,
  getArchivedYouTubeItems,
  getFeedPageData,
} from '@/lib/feed/get-feed-data';
import { ARCHIVE_OVERVIEW_PREVIEW_LIMIT, getDefaultModuleDisplay } from '@/lib/feed/module-rules';
import type {
  ArchiveItem,
  ArtistProfile,
  ArtistSpotlight,
  FeaturedYouTube,
  MonthlyPlaylist,
  SocialLink,
  WeeklyBlogPost,
} from '@/types/feed';
import type {
  ArchivePreviewModule,
  ArtistSpotlightModule,
  CommunityModule,
  PlaylistModule,
  SocialLinksModule,
  SpotifyProfileModule,
  WeeklyBlogModule,
  YouTubeInterviewModule,
} from '@/types/feed-modules';

// --- Internal module builders ---

function buildYouTubeModule(data: FeaturedYouTube): YouTubeInterviewModule {
  return {
    id: data.id,
    type: 'youtubeInterview',
    source: 'live',
    placement: 'hero',
    layout: 'full',
    priority: 0,
    title: data.title,
    publishedAt: data.publishedAt,
    display: getDefaultModuleDisplay('youtubeInterview', 'homepage'),
    data,
  };
}

function buildSpotlightModule(data: ArtistSpotlight): ArtistSpotlightModule {
  return {
    id: data.id,
    type: 'artistSpotlight',
    source: 'live',
    placement: 'feature',
    layout: 'half',
    priority: 1,
    title: data.title,
    href: `/the-feed/spotlight/${data.slug}`,
    publishedAt: data.publishedAt,
    display: getDefaultModuleDisplay('artistSpotlight', 'homepage'),
    data,
  };
}

function buildProfileModule(data: ArtistProfile): SpotifyProfileModule {
  return {
    id: `spotify-profile-${data.artistName}`,
    type: 'spotifyProfile',
    source: 'live',
    placement: 'support',
    layout: 'half',
    priority: 2,
    title: data.artistName,
    display: getDefaultModuleDisplay('spotifyProfile', 'homepage'),
    data,
  };
}

function buildBlogModule(data: WeeklyBlogPost): WeeklyBlogModule {
  return {
    id: data.id,
    type: 'weeklyBlog',
    source: 'live',
    placement: 'feature',
    layout: 'wide',
    priority: 3,
    title: data.title,
    href: `/the-feed/blog/${data.slug}`,
    publishedAt: data.publishedAt,
    display: getDefaultModuleDisplay('weeklyBlog', 'homepage'),
    data,
  };
}

function buildArchivePreviewModule(items: ArchiveItem[]): ArchivePreviewModule {
  return {
    id: 'archive-preview',
    type: 'archivePreview',
    source: 'archive',
    placement: 'archive',
    layout: 'list',
    priority: 4,
    title: 'Archive Highlights',
    href: '/the-feed/archive',
    display: getDefaultModuleDisplay('archivePreview', 'homepage'),
    data: items,
  };
}

function buildPlaylistModule(data: MonthlyPlaylist): PlaylistModule {
  return {
    id: `playlist-${data.monthLabel}`,
    type: 'playlist',
    source: 'live',
    placement: 'support',
    layout: 'half',
    priority: 5,
    title: data.title,
    display: getDefaultModuleDisplay('playlist', 'homepage'),
    data,
  };
}

function buildSocialLinksModule(data: SocialLink[]): SocialLinksModule {
  return {
    id: 'social-links',
    type: 'socialLinks',
    source: 'static',
    placement: 'closing',
    layout: 'half',
    priority: 6,
    title: 'Social Links',
    display: getDefaultModuleDisplay('socialLinks', 'homepage'),
    data,
  };
}

function buildCommunityModule(discordUrl: string): CommunityModule {
  return {
    id: 'community',
    type: 'community',
    source: 'static',
    placement: 'closing',
    layout: 'half',
    priority: 7,
    title: 'Community',
    display: getDefaultModuleDisplay('community', 'homepage'),
    data: { discordUrl },
  };
}

// --- Exported homepage module bundle ---

export type HomepageFeedModules = {
  youtube: YouTubeInterviewModule | null;
  spotlight: ArtistSpotlightModule | null;
  profile: SpotifyProfileModule;
  blog: WeeklyBlogModule | null;
  archivePreview: ArchivePreviewModule;
  playlist: PlaylistModule;
  socialLinks: SocialLinksModule;
  community: CommunityModule;
};

export async function getHomepageFeedModules(): Promise<HomepageFeedModules> {
  const feedData = await getFeedPageData();
  const archiveItems = feedData.archivePreview?.length
    ? feedData.archivePreview
    : feedData.archive;

  return {
    youtube: feedData.featuredYouTube ? buildYouTubeModule(feedData.featuredYouTube) : null,
    spotlight: feedData.artistSpotlight ? buildSpotlightModule(feedData.artistSpotlight) : null,
    profile: buildProfileModule(feedData.artistProfile),
    blog: feedData.weeklyBlog ? buildBlogModule(feedData.weeklyBlog) : null,
    archivePreview: buildArchivePreviewModule(archiveItems),
    playlist: buildPlaylistModule(feedData.monthlyPlaylist),
    socialLinks: buildSocialLinksModule(feedData.socialLinks),
    community: buildCommunityModule(feedData.discordUrl),
  };
}

// --- Archive data getters (limit applied via ARCHIVE_OVERVIEW_PREVIEW_LIMIT) ---

const sortDesc = (a: { publishedAt: string }, b: { publishedAt: string }) =>
  new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();

export type ArchiveOverviewData = {
  youtubeItems: ArchiveItem[];
  blogItems: WeeklyBlogPost[];
  spotlightItems: ArtistSpotlight[];
};

/**
 * Returns the newest N items per section for the archive overview page.
 * Item count is controlled by ARCHIVE_OVERVIEW_PREVIEW_LIMIT in module-rules.ts.
 */
export async function getArchiveOverviewData(): Promise<ArchiveOverviewData> {
  const [archivedYouTubeItems, archivedBlogs, archivedSpotlights] = await Promise.all([
    getArchivedYouTubeItems(),
    getArchivedWeeklyBlogs(),
    getArchivedArtistSpotlights(),
  ]);

  return {
    youtubeItems: archivedYouTubeItems.sort(sortDesc).slice(0, ARCHIVE_OVERVIEW_PREVIEW_LIMIT),
    blogItems: archivedBlogs.sort(sortDesc).slice(0, ARCHIVE_OVERVIEW_PREVIEW_LIMIT),
    spotlightItems: archivedSpotlights.sort(sortDesc).slice(0, ARCHIVE_OVERVIEW_PREVIEW_LIMIT),
  };
}

/** Returns all archived blog posts, newest first. */
export async function getBlogArchiveModules(): Promise<WeeklyBlogPost[]> {
  return (await getArchivedWeeklyBlogs()).sort(sortDesc);
}

/** Returns all archived artist spotlights, newest first. */
export async function getSpotlightArchiveModules(): Promise<ArtistSpotlight[]> {
  return (await getArchivedArtistSpotlights()).sort(sortDesc);
}

/** Returns all archived YouTube items, newest first. */
export async function getYouTubeArchiveModules(): Promise<ArchiveItem[]> {
  return (await getArchivedYouTubeItems()).sort(sortDesc);
}
