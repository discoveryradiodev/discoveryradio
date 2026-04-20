import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { ArticleBlocks } from "@/components/feed/ArticleBlocks";
import { getWeeklyBlogArticleBlocks } from "@/lib/feed/get-article-blocks";
import { getArchivedWeeklyBlogBySlug, getWeeklyBlogBySlug } from "@/lib/feed/get-feed-data";
import styles from "./page.module.css";

type BlogPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function BlogPage({ params }: BlogPageProps) {
  const { slug } = await params;
  const liveBlogPost = await getWeeklyBlogBySlug(slug);
  const blogPost = liveBlogPost ?? (await getArchivedWeeklyBlogBySlug(slug));
  const blocks = await getWeeklyBlogArticleBlocks(slug);

  if (blogPost === null || blocks === null) {
    notFound();
  }

  const publishedDate = new Date(blogPost.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const blogImageStyle = {
    "--blog-article-shape-url": `url("${blogPost.coverImageUrl ?? ""}")`,
  } as CSSProperties;

  return (
    <main className={styles.page}>
      <div className={styles.inner} data-style-target="blog-content-frame">
        <article className={styles.articleStack}>
          <header className={styles.masthead}>
            <div className={styles.mastheadPrimary}>
              <h1 className={styles.mastheadTitle}>THE FEED</h1>
              <p className={styles.mastheadSubTitle}>WEEKLY BLOG</p>
            </div>
          </header>

          <section className={`${styles.module} ${styles.contentModule}`}>
            <div className={styles.titleMetaGroup}>
              <h1 className={styles.title} data-style-target="blog-title">{blogPost.title}</h1>
              <p className={styles.excerpt}>{blogPost.excerpt}</p>
              <div className={styles.metaRowGroup}>
                <p className={styles.metaItem} data-style-target="blog-meta">Published {publishedDate}</p>
              </div>
            </div>
          </section>

          <section className={`${styles.module} ${styles.bodyModule}`} data-style-target="blog-body">
            <div className={styles.bodyGroup}>
              <img
                src={blogPost.coverImageUrl ?? "/placeholder-blog-cover.jpg"}
                alt={blogPost.coverImageAlt ?? "Weekly blog cover placeholder"}
                className={styles.image}
                data-style-target="blog-image"
                style={blogImageStyle}
              />
              <div className={styles.bodyContent}>
                <ArticleBlocks blocks={blocks} />
              </div>
            </div>
          </section>

          <nav className={styles.backNav}>
            <Link href="/the-feed/archive" className={styles.backLink}>Back to Archive</Link>
            <Link href="/the-feed" className={styles.backLink}>Back to The Feed</Link>
          </nav>
        </article>
      </div>
    </main>
  );
}
         