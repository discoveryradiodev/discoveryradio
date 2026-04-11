import Link from "next/link";
import { getFeedPageData } from "@/lib/feed/get-feed-data";
import styles from "./page.module.css";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function YouTubeArchivePage() {
  const feedData = await getFeedPageData();

  const youtubeItems = [...feedData.archive].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Archive Category</p>
          <h1 className={styles.title}>YouTube Interviews</h1>
          <p className={styles.intro}>
            Full interview archive in newest-first order. The older entries stay lower in the stack.
          </p>
        </header>

        <section className={styles.list}>
          {youtubeItems.map((item) => (
            <article key={item.id} className={styles.card}>
              <p className={styles.metaLabel}>YouTube Interview</p>
              <h2 className={styles.cardTitle}>
                <a href={item.href} target="_blank" rel="noreferrer" className={styles.cardLink}>
                  {item.title}
                </a>
              </h2>
              <p className={styles.dateMeta}>{formatDate(item.publishedAt)}</p>
              {item.description ? <p className={styles.description}>{item.description}</p> : null}
            </article>
          ))}
        </section>

        <nav className={styles.backNav}>
          <Link href="/the-feed/archive" className={styles.backLink}>
            Back to Archive
          </Link>
          <Link href="/the-feed" className={styles.backLink}>
            Back to The Feed
          </Link>
        </nav>
      </div>
    </main>
  );
}
