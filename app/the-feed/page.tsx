import Link from "next/link";
import styles from "./page.module.css";
import ArtistSpotlightCard from "@/components/feed/ArtistSpotlightCard";
import ArtistProfileCard from "@/components/feed/ArtistProfileCard";
import WeeklyBlogCard from "@/components/feed/WeeklyBlogCard";
import MonthlyPlaylistCard from "@/components/feed/MonthlyPlaylistCard";
import ArchiveCard from "@/components/feed/ArchiveCard";
import SocialLinksCard from "@/components/feed/SocialLinksCard";
import DiscordCard from "@/components/feed/DiscordCard";
import { getFeedPageData } from "@/lib/feed/get-feed-data";

export default async function FeedPage() {
  const feedData = await getFeedPageData();

  return (
    <main className={styles.page} data-feed-page="true">
      <div className={styles.inner}>
        <h1 className={styles.title}>The Feed</h1>
        <div className={styles.pageActions}>
          <Link href="/the-feed/archive" className={styles.archiveLink}>
            Browse Archive
          </Link>
        </div>

        <section className={styles.composition}>
          <div className={styles.topPair}>
            {feedData.artistSpotlight ? (
              <div className={`${styles.block} ${styles.heroBlock}`}>
                <ArtistSpotlightCard spotlight={feedData.artistSpotlight} />
              </div>
            ) : null}

            <div className={`${styles.block} ${styles.heroBlock}`}>
              <ArtistProfileCard profile={feedData.artistProfile} />
            </div>
          </div>

          {feedData.weeklyBlog ? (
            <div className={`${styles.block} ${styles.blogFeature}`}>
              <WeeklyBlogCard post={feedData.weeklyBlog} />
            </div>
          ) : null}

          <div className={styles.playlistStack}>
            <div className={styles.block}>
              <MonthlyPlaylistCard playlist={feedData.monthlyPlaylist} />
            </div>

            <div className={styles.block}>
              <ArchiveCard items={feedData.archive} />
            </div>
          </div>

          <div className={styles.bottomPair}>
            <div className={styles.block}>
              <SocialLinksCard links={feedData.socialLinks} />
            </div>

            <div className={styles.block}>
              <DiscordCard discordUrl={feedData.discordUrl} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
