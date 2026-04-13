export type FeedStatus = "draft" | "published" | "archived";

export type SpotifyEmbedType = "artist" | "track" | "album" | "playlist";

export type SocialLink = {
  label: string;
  href: string;
};

export type ArtistSpotlight = {
  id: string;
  status: FeedStatus;
  title: string;
  slug: string;

  artistName: string;
  artistLocation?: string;
  artistGenre?: string;

  headshotUrl: string;
  headshotAlt: string;

  excerpt: string;
  docId: string;

  publishedAt: string;
  updatedAt?: string;
};

export type ArtistProfile = {
  artistName: string;
  embedType: SpotifyEmbedType;
  spotifyUrl: string;
  spotifyEmbedUrl: string;
  monthLabel: string;
};

export type WeeklyBlogPost = {
  id: string;
  status: FeedStatus;
  title: string;
  slug: string;

  excerpt: string;
  docId: string;

  coverImageUrl?: string;
  coverImageAlt?: string;

  publishedAt: string;
  updatedAt?: string;
};

export type MonthlyPlaylist = {
  title: string;
  monthLabel: string;
  spotifyUrl: string;
  spotifyEmbedUrl: string;
  description?: string;
};

export type ArchiveItem = {
  id: string;
  title: string;
  type: "youtube" | "spotlight" | "blog";
  publishedAt: string;
  href: string;
  description?: string;
};

export type FeedPageData = {
  artistSpotlight?: ArtistSpotlight;
  artistProfile: ArtistProfile;
  weeklyBlog?: WeeklyBlogPost;
  monthlyPlaylist: MonthlyPlaylist;
  archive: ArchiveItem[];
  archivePreview?: ArchiveItem[];

  socialLinks: SocialLink[];
  discordUrl: string;
};
