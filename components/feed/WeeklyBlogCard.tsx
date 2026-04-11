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
    <article className={styles.centered}>
      <h3>{post.title}</h3>
      <p>{publishedDate}</p>
      <p>{post.excerpt}</p>
      <Link href={`/the-feed/blog/${post.slug}`}>Read more →</Link>
    </article>
  );
}
