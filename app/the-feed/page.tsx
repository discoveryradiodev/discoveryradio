import Link from "next/link";
import styles from "./page.module.css";
import { mockFeedData } from "@/lib/feed/mock-data";

export default function FeedPage() {
  const {
    artistSpotlight,
    artistProfile,
    weeklyBlog,
    monthlyPlaylist,
    archive,
    socialLinks,
    discordUrl,
  } = mockFeedData;

  const artistMeta = [artistSpotlight.artistLocation, artistSpotlight.artistGenre]
    .filter(Boolean)
    .join(" | ");

  return (
    <main className={styles.page} data-feed-page="true">
      <div className={styles.inner}>
        <h1 className={styles.title}>The Feed</h1>

        <section className={styles.composition}>
          <div className={styles.topPair}>
            <article className={`${styles.block} ${styles.heroBlock}`}>
              <h2 className={styles.blockTitle}>Artist Spotlight</h2>
              <p className={styles.blockBody}>{artistSpotlight.title}</p>
              <p className={styles.blockBody}>{artistSpotlight.artistName}</p>
              {artistMeta ? <p className={styles.blockBody}>{artistMeta}</p> : null}
              <p className={styles.blockBody}>{artistSpotlight.excerpt}</p>
              <Link
                className={styles.blockBody}
                href={`/the-feed/spotlight/${mockFeedData.artistSpotlight.slug}`}
              >
                Read more →
              </Link>
            </article>

            <article className={`${styles.block} ${styles.heroBlock}`}>
              <h2 className={styles.blockTitle}>Artist Profile</h2>
              <p className={styles.blockBody}>{artistProfile.monthLabel}</p>
              <p className={styles.blockBody}>Embed type: {artistProfile.embedType}</p>
            </article>
          </div>

          <article className={`${styles.block} ${styles.blogFeature}`}>
            <h2 className={styles.blockTitle}>Weekly Blog</h2>
            <p className={styles.blockBody}>{weeklyBlog.title}</p>
            <p className={styles.blockBody}>{weeklyBlog.excerpt}</p>
            <Link className={styles.blockBody} href={`/the-feed/blog/${mockFeedData.weeklyBlog.slug}`}>
              Read more →
            </Link>
          </article>

          <div className={styles.midPair}>
            <article className={styles.block}>
              <h2 className={styles.blockTitle}>Monthly Playlist</h2>
              <p className={styles.blockBody}>{monthlyPlaylist.title}</p>
              <p className={styles.blockBody}>{monthlyPlaylist.monthLabel}</p>
              {monthlyPlaylist.description ? (
                <p className={styles.blockBody}>{monthlyPlaylist.description}</p>
              ) : null}
            </article>

            <article className={styles.block}>
              <h2 className={styles.blockTitle}>Archive</h2>
              <ul className={styles.blockBody}>
                {archive.map((item) => (
                  <li key={item.id}>{item.title}</li>
                ))}
              </ul>
            </article>
          </div>

          <div className={styles.bottomPair}>
            <article className={styles.block}>
              <h2 className={styles.blockTitle}>Social Handles</h2>
              <ul className={styles.blockBody}>
                {socialLinks.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} target="_blank" rel="noreferrer">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </article>

            <article className={styles.block}>
              <h2 className={styles.blockTitle}>Join Discord</h2>
              <a className={styles.blockBody} href={discordUrl} target="_blank" rel="noreferrer">
                {discordUrl}
              </a>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
