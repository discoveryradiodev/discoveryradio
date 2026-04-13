import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBlocks } from "@/components/feed/ArticleBlocks";
import { getWeeklyBlogArticleBlocks } from "@/lib/feed/get-article-blocks";
import { getArchivedWeeklyBlogBySlug, getWeeklyBlogBySlug } from "@/lib/feed/get-feed-data";
import styles from "./page.module.css";

type BlogPageProps = {
  params: {
    slug: string;
  };
};

export default async function BlogPage({ params }: BlogPageProps) {
  const liveBlogPost = await getWeeklyBlogBySlug(params.slug);
  const blogPost = liveBlogPost ?? (await getArchivedWeeklyBlogBySlug(params.slug));
  const blocks = await getWeeklyBlogArticleBlocks(params.slug);

  if (blogPost === null || blocks === null) {
    notFound();
  }

  const publishedDate = new Date(blogPost.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className={styles.page}>
      <div className={styles.inner} data-style-target="blog-content-frame">
        <article>
          <header className={styles.header}>
            <p className={styles.eyebrow}>Weekly Blog</p>
             <h1 className={styles.title} data-style-target="blog-title">{blogPost.title}</h1>
             <p className={styles.dateMeta} data-style-target="blog-meta">Published {publishedDate}</p>
            <p className={styles.excerpt}>{blogPost.excerpt}</p>
          </header>

          <div className={styles.imageWrapper}>
             <img
               src={blogPost.coverImageUrl ?? "/placeholder-blog-cover.jpg"}
               alt={blogPost.coverImageAlt ?? "Weekly blog cover placeholder"}
               className={styles.image}
               data-style-target="blog-image"
             />
          </div>

          <section className={styles.body}>
             <div data-style-target="blog-body">
               <ArticleBlocks blocks={blocks} />
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
         