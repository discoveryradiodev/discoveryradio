import Link from "next/link";
import { getArchivedArtistSpotlights } from "@/lib/feed/get-feed-data";
import styles from "./page.module.css";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function SpotlightsArchivePage() {
  const spotlightItems = (await getArchivedArtistSpotlights()).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.masthead}>
          <div className={styles.mastheadPrimary}>
            <h1 className={styles.mastheadTitle}>THE FEED</h1>
            <p className={styles.mastheadSubTitle}>SPOTLIGHT ARCHIVE</p>
          </div>
          <Link href="/the-feed/archive" className={styles.backLink}>Back to Archive</Link>
        </header>

        <section className={`${styles.module} ${styles.leadModule}`}>
          <p className={styles.intro}>Full spotlight list in newest-first order.</p>
        </section>

        <section className={`${styles.module} ${styles.listModule}`}>
          <div className={styles.list}>
          {spotlightItems.length === 0 ? (
            <p className={styles.intro}>No archived spotlight entries are available right now.</p>
          ) : (
            spotlightItems.map((item) => (
              <article key={item.id} className={styles.card}>
                <img src={item.headshotUrl} alt={item.headshotAlt} className={styles.image} />
                <div className={styles.body}>
                  <p className={styles.metaLabel}>Artist Spotlight</p>
                  <h2 className={styles.cardTitle}>
                    <Link href={`/the-feed/spotlight/${item.slug}`} className={styles.cardLink}>
                      {item.title}
                    </Link>
                  </h2>
                  <p className={styles.dateMeta}>{formatDate(item.publishedAt)}</p>
                  <p className={styles.artistMeta}>
                    <span>{item.artistName}</span>
                    {item.artistLocation ? <span>{item.artistLocation}</span> : null}
                    {item.artistGenre ? <span>{item.artistGenre}</span> : null}
                  </p>
                  <p className={styles.excerpt}>{item.excerpt}</p>
                </div>
              </article>
            ))
          )}
          </div>
        </section>

        <nav className={styles.backNav}>
          <Link href="/the-feed/archive" className={styles.backLink}>
            Back to Archive
          </Link>
          <Link href="/" className={styles.backLink}>
            Back to The Feed
          </Link>
        </nav>
      </div>
    </main>
  );
}
