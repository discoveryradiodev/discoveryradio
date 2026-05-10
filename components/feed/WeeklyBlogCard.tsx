import Link from "next/link";
import type { CSSProperties } from "react";
import { WILLARD_IMAGE_OVERRIDES } from "@/app/the-feed/willard.generated.images";
import type { WeeklyBlogPost } from "@/types/feed";
import styles from "./feed.module.css";

type Props = {
  post: WeeklyBlogPost;
};

export default function WeeklyBlogCard({ post }: Props) {
  const imageOverride = WILLARD_IMAGE_OVERRIDES["homepage-blog-image"];
  const publishedDate = new Date(post.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const blogImageStyle = post.coverImageUrl
    ? ({
        "--homepage-blog-shape-url": `url("${post.coverImageUrl}")`,
      } as CSSProperties)
    : undefined;

  return (
    <article className={`${styles.card} ${styles.blogStrip}`}>
      <div className={styles.blogContent}>
        {post.coverImageUrl ? (
          <div className={styles.blogImageWrap}>
            <img
              src={imageOverride?.url ?? post.coverImageUrl}
              alt={(imageOverride?.altText ?? post.coverImageAlt) || post.title}
              className={styles.blogImage}
              data-style-target="homepage-blog-image"
              style={blogImageStyle}
            />
          </div>
        ) : null}
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
