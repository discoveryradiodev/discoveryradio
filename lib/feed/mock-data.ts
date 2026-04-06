import type { FeedPageData } from "@/types/feed";

export const mockFeedData: FeedPageData = {
  artistSpotlight: {
    id: "spotlight-001",
    status: "published",
    title: "Artist Spotlight: Placeholder Artist",
    slug: "artist-spotlight-placeholder-artist",
    artistName: "Placeholder Artist",
    artistLocation: "Charleston, WV",
    artistGenre: "Alternative / Experimental",
    headshotUrl: "/placeholder-headshot.jpg",
    headshotAlt: "Placeholder Artist headshot",
    excerpt:
      "This is a preview excerpt for the monthly artist spotlight. It should be long enough to test layout, wrapping, and the future read more flow without being the full article.",
    docId: "mock-google-doc-id-artist-001",
    publishedAt: "2026-04-05T00:00:00.000Z",
    updatedAt: "2026-04-05T00:00:00.000Z",
  },

  artistProfile: {
    artistName: "Placeholder Artist",
    embedType: "artist",
    spotifyUrl: "https://open.spotify.com/artist/placeholder",
    spotifyEmbedUrl: "https://open.spotify.com/embed/artist/placeholder",
    monthLabel: "April 2026",
  },

  weeklyBlog: {
    id: "blog-001",
    status: "published",
    title: "Weekly Blog: Placeholder Entry",
    slug: "weekly-blog-placeholder-entry",
    excerpt:
      "This is the weekly blog preview. Later it will pull from Google Docs and link to a full article page.",
    docId: "mock-google-doc-id-blog-001",
    coverImageUrl: "/placeholder-blog-cover.jpg",
    coverImageAlt: "Placeholder blog cover image",
    publishedAt: "2026-04-05T00:00:00.000Z",
    updatedAt: "2026-04-05T00:00:00.000Z",
  },

  monthlyPlaylist: {
    title: "Monthly Playlist",
    monthLabel: "April 2026",
    spotifyUrl: "https://open.spotify.com/playlist/placeholder",
    spotifyEmbedUrl: "https://open.spotify.com/embed/playlist/placeholder",
    description: "A rotating playlist tied to the current monthly feature.",
  },

  archive: [
    {
      id: "archive-001",
      title: "Previous Artist Spotlight",
      slug: "previous-artist-spotlight",
      type: "spotlight",
      publishedAt: "2026-03-01T00:00:00.000Z",
    },
    {
      id: "archive-002",
      title: "Previous Weekly Blog",
      slug: "previous-weekly-blog",
      type: "blog",
      publishedAt: "2026-03-24T00:00:00.000Z",
    },
  ],

  socialLinks: [
    {
      label: "Instagram",
      href: "https://www.instagram.com/discoveryradio.inc",
    },
    {
      label: "TikTok",
      href: "https://www.tiktok.com/@discoveryradioinc",
    },
  ],

  discordUrl: "https://discord.gg/placeholder",
};
