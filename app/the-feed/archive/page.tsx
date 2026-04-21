import Link from "next/link";
import Image from "next/image";
import {
  getArchivedArtistSpotlights,
  getArchivedWeeklyBlogs,
  getFeedPageData,
} from "@/lib/feed/get-feed-data";
import styles from "./page.module.css";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function FeedArchivePage() {
  const [feedData, archivedBlogs, archivedSpotlights] = await Promise.all([
    getFeedPageData(),
    getArchivedWeeklyBlogs(),
    getArchivedArtistSpotlights(),
  ]);
  const recentLimit = 1;

  const youtubeItems = feedData.archive
    .filter((item) => item.type === 'youtube')
    .sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  const recentYouTubeItems = youtubeItems.slice(0, recentLimit);
  const blogItems = archivedBlogs.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  const recentBlogItems = blogItems.slice(0, recentLimit);
  const spotlightItems = archivedSpotlights.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  const recentSpotlightItems = spotlightItems.slice(0, recentLimit);

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.masthead}>
          <div className={styles.mastheadPrimary}>
            <h1 className={styles.mastheadTitle}>THE FEED ARCHIVE</h1>
            <p className={styles.mastheadSubTitle}>DISCOVERY RADIO</p>
          </div>
          <Link href="/" className={styles.backLink}>Back to The Feed</Link>
        </header>

        <section className={`${styles.module} ${styles.leadModule}`}>
          <div className={styles.headerContent}>
            <h2 className={styles.title}>Recent highlights from interviews, blogs, and spotlights.</h2>
            <p className={styles.intro}>
              Each section shows the latest highlight and links to its full category archive.
            </p>
          </div>
          <div className={styles.logoBlock} aria-hidden="true">
            <Image
              src="/discoveryradio_logo_transparent.png"
              alt=""
              width={320}
              height={320}
              className={styles.logoImage}
              priority={false}
            />
          </div>
        </section>

        <section className={`${styles.module} ${styles.section}`}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Link href="/the-feed/archive/youtube" className={styles.sectionTitleLink}>
                YouTube Interviews
              </Link>
            </h2>
            <p className={styles.sectionCopy}>
              Newest interview first. Open the full YouTube archive for the complete list.
            </p>
          </div>

          <div className={styles.videoList}>
            {recentYouTubeItems.map((item) => (
              <article key={item.id} className={styles.videoCard}>
                <div>
                  <p className={styles.metaLabel}>YouTube Interview</p>
                  <h3 className={styles.cardTitle}>
                    <a href={item.href} target="_blank" rel="noreferrer" className={styles.cardLink}>
                      {item.title}
                    </a>
                  </h3>
                  <p className={styles.cardMeta}>{formatDate(item.publishedAt)}</p>
                  {item.description ? (
                    <p className={styles.cardDescription}>{item.description}</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.module} ${styles.section}`}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Link href="/the-feed/archive/blog" className={styles.sectionTitleLink}>
                Blog Archive
              </Link>
            </h2>
            <p className={styles.sectionCopy}>
              Latest blog highlight shown here. Open the full blog archive for all entries.
            </p>
          </div>

          {recentBlogItems.map((post) => (
            <article key={post.id} className={styles.featureCard}>
              <img
                src={post.coverImageUrl ?? "/placeholder-blog-cover.jpg"}
                alt={post.coverImageAlt ?? "Weekly blog cover placeholder"}
                className={styles.featureImage}
              />

              <div className={styles.featureBody}>
                <p className={styles.metaLabel}>Weekly Blog</p>
                <h3 className={styles.cardTitle}>
                  <Link href={`/the-feed/blog/${post.slug}`} className={styles.cardLink}>
                    {post.title}
                  </Link>
                </h3>
                <p className={styles.cardMeta}>{formatDate(post.publishedAt)}</p>
                <p className={styles.excerpt}>{post.excerpt}</p>
              </div>
            </article>
          ))}
        </section>

        <section className={`${styles.module} ${styles.section}`}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Link href="/the-feed/archive/spotlights" className={styles.sectionTitleLink}>
                Artist Spotlights
              </Link>
            </h2>
            <p className={styles.sectionCopy}>
              Latest spotlight shown here. Open the full spotlights archive for all entries.
            </p>
          </div>

          {recentSpotlightItems.map((item) => (
            <article key={item.id} className={styles.featureCard}>
              <img src={item.headshotUrl} alt={item.headshotAlt} className={styles.featureImage} />

              <div className={styles.featureBody}>
                <p className={styles.metaLabel}>Artist Spotlight</p>
                <h3 className={styles.cardTitle}>
                  <Link href={`/the-feed/spotlight/${item.slug}`} className={styles.cardLink}>
                    {item.title}
                  </Link>
                </h3>
                <p className={styles.cardMeta}>{formatDate(item.publishedAt)}</p>
                <p className={styles.artistMeta}>
                  <span>{item.artistName}</span>
                  {item.artistLocation ? <span>{item.artistLocation}</span> : null}
                  {item.artistGenre ? <span>{item.artistGenre}</span> : null}
                </p>
                <p className={styles.excerpt}>{item.excerpt}</p>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}