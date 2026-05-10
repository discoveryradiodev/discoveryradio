import type {
  ArchiveItem,
  ArtistProfile,
  ArtistSpotlight,
  FeaturedYouTube,
  MonthlyPlaylist,
  SocialLink,
  WeeklyBlogPost,
} from './feed';

export type FeedModuleSource = 'live' | 'archive' | 'static';
export type FeedModulePlacement = 'hero' | 'feature' | 'support' | 'archive' | 'article' | 'closing';
export type FeedModuleLayout = 'auto' | 'full' | 'wide' | 'half' | 'compact' | 'list' | 'article';
export type FeedModuleTextMode = 'full' | 'preview' | 'none';
export type FeedModuleFallbackBehavior = 'hide' | 'compact' | 'placeholder';

export type FeedModuleDisplay = {
  textMode: FeedModuleTextMode;
  maxItems?: number;
  excerptMaxChars?: number;
  allowImage: boolean;
  allowEmbed: boolean;
  fallbackBehavior: FeedModuleFallbackBehavior;
};

type FeedModuleBase = {
  id: string;
  source: FeedModuleSource;
  placement: FeedModulePlacement;
  layout: FeedModuleLayout;
  priority: number;
  title: string;
  href?: string;
  publishedAt?: string;
  display: FeedModuleDisplay;
};

export type YouTubeInterviewModule = FeedModuleBase & {
  type: 'youtubeInterview';
  data: FeaturedYouTube;
};

export type ArtistSpotlightModule = FeedModuleBase & {
  type: 'artistSpotlight';
  data: ArtistSpotlight;
};

export type WeeklyBlogModule = FeedModuleBase & {
  type: 'weeklyBlog';
  data: WeeklyBlogPost;
};

export type SpotifyProfileModule = FeedModuleBase & {
  type: 'spotifyProfile';
  data: ArtistProfile;
};

export type PlaylistModule = FeedModuleBase & {
  type: 'playlist';
  data: MonthlyPlaylist;
};

export type ArchivePreviewModule = FeedModuleBase & {
  type: 'archivePreview';
  data: ArchiveItem[];
};

export type SocialLinksModule = FeedModuleBase & {
  type: 'socialLinks';
  data: SocialLink[];
};

export type CommunityModule = FeedModuleBase & {
  type: 'community';
  data: { discordUrl: string };
};

export type FeedModule =
  | YouTubeInterviewModule
  | ArtistSpotlightModule
  | WeeklyBlogModule
  | SpotifyProfileModule
  | PlaylistModule
  | ArchivePreviewModule
  | SocialLinksModule
  | CommunityModule;
