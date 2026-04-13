import Link from "next/link";
import type { WeeklyBlogPost } from "@/types/feed";
import styles from "./feed.module.css";

type Props = {
  post: WeeklyBlogPost;
};

export default function WeeklyBlogCard({ post }: Props) {
  const publishedDate = new Date(post.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className={`${styles.card} ${styles.blogStrip}`}>
      {post.coverImageUrl ? (
        <div className={styles.blogImageWrap}>
          <img
            src={post.coverImageUrl}
            alt={post.coverImageAlt || post.title}
            className={styles.blogImage}
            data-style-target="homepage-blog-image"
          />
        </div>
      ) : null}

      <div className={styles.blogContent}>
        <p className={styles.featureLabel}>Current Blog</p>
        <h3 className={styles.blogTitle} data-style-target="homepage-blog-title">{post.title}</h3>
        <p className={styles.published} data-style-target="homepage-blog-meta">{publishedDate}</p>
        <p className={styles.blogExcerpt} data-style-target="homepage-blog-excerpt">{post.excerpt}</p>
        <Link href={`/the-feed/blog/${post.slug}`} className={styles.readCta} data-style-target="homepage-blog-cta">
          Read More
        </Link>
      </div>
    </article>
  );
}
