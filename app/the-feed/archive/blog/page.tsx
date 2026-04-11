import Link from "next/link";
import { getArchivedWeeklyBlogs } from "@/lib/feed/get-feed-data";
import styles from "./page.module.css";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogArchivePage() {
  const blogItems = (await getArchivedWeeklyBlogs()).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Archive Category</p>
          <h1 className={styles.title}>Blog Archive</h1>
          <p className={styles.intro}>Full blog list in newest-first order.</p>
        </header>

        <section className={styles.list}>
          {blogItems.map((post) => (
            <article key={post.id} className={styles.card}>
              <img
                src={post.coverImageUrl ?? "/placeholder-blog-cover.jpg"}
                alt={post.coverImageAlt ?? "Weekly blog cover placeholder"}
                className={styles.image}
              />
              <div className={styles.body}>
                <p className={styles.metaLabel}>Weekly Blog</p>
                <h2 className={styles.cardTitle}>
                  <Link href={`/the-feed/blog/${post.slug}`} className={styles.cardLink}>
                    {post.title}
                  </Link>
                </h2>
                <p className={styles.dateMeta}>{formatDate(post.publishedAt)}</p>
                <p className={styles.excerpt}>{post.excerpt}</p>
              </div>
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
