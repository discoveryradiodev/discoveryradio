import Link from "next/link";
import { getYouTubeArchiveModules } from "@/lib/feed/get-feed-modules";
import { PREVIEW_CHARS, createPreviewText } from "@/lib/feed/module-rules";
import styles from "./page.module.css";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function YouTubeArchivePage() {
  const youtubeItems = await getYouTubeArchiveModules();

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
          <header className={styles.masthead}>
            <div className={styles.mastheadPrimary}>
              <h1 className={styles.mastheadTitle}>THE FEED</h1>
              <p className={styles.mastheadSubTitle}>YOUTUBE ARCHIVE</p>
            </div>
            <Link href="/the-feed/archive" className={styles.backLink}>Back to Archive</Link>
        </header>

          <section className={`${styles.module} ${styles.leadModule}`}>
            <p className={styles.intro}>Embedded episodes from newest to oldest.</p>
          </section>

          <section className={`${styles.module} ${styles.listModule}`}>
            <div className={styles.list}>
          {youtubeItems.map((item) => (
            <article key={item.id} className={styles.card}>
              <p className={styles.metaLabel}>YouTube Interview</p>
              <h2 className={styles.cardTitle}>
                <a href={item.href} target="_blank" rel="noreferrer" className={styles.cardLink}>
                  {item.title}
                </a>
              </h2>
              <p className={styles.dateMeta}>{formatDate(item.publishedAt)}</p>
              {item.description ? <p className={styles.description}>{createPreviewText(item.description, PREVIEW_CHARS.archiveCategoryCard)}</p> : null}
            </article>
          ))}
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
