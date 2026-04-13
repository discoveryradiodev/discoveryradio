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
        <header className={styles.masthead}>
          <div className={styles.mastheadPrimary}>
            <h1 className={styles.title} data-style-target="feed-masthead-title">THE FEED</h1>
            <p className={styles.subTitle} data-style-target="feed-masthead-subtitle">DISCOVERY RADIO</p>
          </div>
          <Link href="/the-feed/archive" className={styles.archiveLink} data-style-target="feed-archive-link">
            Browse Archive
          </Link>
        </header>

        <section className={styles.composition}>
          <div className={styles.rowOne}>
            {feedData.artistSpotlight ? (
              <div className={`${styles.panel} ${styles.spotlightPanel}`}>
                <ArtistSpotlightCard spotlight={feedData.artistSpotlight} />
              </div>
            ) : null}

            <div className={`${styles.panel} ${styles.profilePanel}`}>
              <ArtistProfileCard profile={feedData.artistProfile} />
            </div>
          </div>

          {feedData.weeklyBlog ? (
            <div className={`${styles.panel} ${styles.blogFeature}`}>
              <WeeklyBlogCard post={feedData.weeklyBlog} />
            </div>
          ) : null}

          <div className={styles.rowThree}>
            <div className={`${styles.panel} ${styles.archivePanel}`}>
              <ArchiveCard
                items={feedData.archivePreview?.length ? feedData.archivePreview : feedData.archive}
              />
            </div>

            <div className={`${styles.panel} ${styles.playlistPanel}`}>
              <MonthlyPlaylistCard playlist={feedData.monthlyPlaylist} />
            </div>
          </div>

          <div className={styles.bottomClosing}>
            <div className={`${styles.panel} ${styles.socialPanel}`}>
              <SocialLinksCard links={feedData.socialLinks} />
            </div>

            <div className={`${styles.panel} ${styles.discordPanel}`}>
              <DiscordCard discordUrl={feedData.discordUrl} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
