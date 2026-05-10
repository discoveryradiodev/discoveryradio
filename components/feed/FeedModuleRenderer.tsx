import ArchiveCard from "@/components/feed/ArchiveCard";
import ArtistProfileCard from "@/components/feed/ArtistProfileCard";
import ArtistSpotlightCard from "@/components/feed/ArtistSpotlightCard";
import DiscordCard from "@/components/feed/DiscordCard";
import MonthlyPlaylistCard from "@/components/feed/MonthlyPlaylistCard";
import SocialLinksCard from "@/components/feed/SocialLinksCard";
import WeeklyBlogCard from "@/components/feed/WeeklyBlogCard";
import type { FeedModule } from "@/types/feed-modules";

type Props = {
  module: FeedModule;
};

/**
 * Routes a typed FeedModule to its existing card component.
 * Page-level layout (panels, grid rows) is owned by the calling page.
 * The youtubeInterview type is handled by YouTubeHeroModule at the page level.
 */
export default function FeedModuleRenderer({ module }: Props) {
  switch (module.type) {
    case "artistSpotlight":
      return <ArtistSpotlightCard spotlight={module.data} />;
    case "weeklyBlog":
      return <WeeklyBlogCard post={module.data} />;
    case "spotifyProfile":
      return <ArtistProfileCard profile={module.data} />;
    case "playlist":
      return <MonthlyPlaylistCard playlist={module.data} />;
    case "archivePreview":
      return <ArchiveCard items={module.data} />;
    case "socialLinks":
      return <SocialLinksCard links={module.data} />;
    case "community":
      return <DiscordCard discordUrl={module.data.discordUrl} />;
    case "youtubeInterview":
      // Rendered via YouTubeHeroModule directly in the page.
      return null;
  }
}
