import Link from "next/link";
import styles from "./page.module.css";
import FeedModuleRenderer from "@/components/feed/FeedModuleRenderer";
import YouTubeHeroModule from "@/components/feed/YouTubeHeroModule";
import { getHomepageFeedModules } from "@/lib/feed/get-feed-modules";

export default async function FeedPage() {
  const modules = await getHomepageFeedModules();

  return (
    <main className={styles.page} data-feed-page="true" data-style-target="feed-shell">
      <div className={styles.inner}>
        <header className={styles.masthead}>
          <div className={styles.mastheadPrimary}>
            <h1 className={styles.title} data-style-target="feed-masthead-title">THE FEED</h1>
            <p className={styles.subTitle} data-style-target="feed-masthead-subtitle">DISCOVERY RADIO</p>
          </div>
          <div className={styles.mastheadActions}>
            <Link href="/the-feed/archive" className={styles.archiveLink} data-style-target="feed-archive-link">
              Browse Archive
            </Link>
            <Link href="/submit" className={styles.submitLink}>
              Submit your work
            </Link>
          </div>
        </header>

        <YouTubeHeroModule module={modules.youtube} />

        <section className={styles.composition}>
          <div className={styles.rowOne}>
            {modules.spotlight ? (
              <div className={`${styles.panel} ${styles.spotlightPanel}`}>
                <FeedModuleRenderer module={modules.spotlight} />
              </div>
            ) : null}

            <div className={`${styles.panel} ${styles.profilePanel}`}>
              <FeedModuleRenderer module={modules.profile} />
            </div>
          </div>

          {modules.blog ? (
            <div className={`${styles.panel} ${styles.blogFeature}`}>
              <FeedModuleRenderer module={modules.blog} />
            </div>
          ) : null}

          <div className={styles.rowThree}>
            <div className={`${styles.panel} ${styles.archivePanel}`}>
              <FeedModuleRenderer module={modules.archivePreview} />
            </div>

            <div className={`${styles.panel} ${styles.playlistPanel}`}>
              <FeedModuleRenderer module={modules.playlist} />
            </div>
          </div>

          <div className={styles.bottomClosing}>
            <div className={`${styles.panel} ${styles.socialPanel}`}>
              <FeedModuleRenderer module={modules.socialLinks} />
            </div>

            <div className={`${styles.panel} ${styles.discordPanel}`}>
              <FeedModuleRenderer module={modules.community} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
