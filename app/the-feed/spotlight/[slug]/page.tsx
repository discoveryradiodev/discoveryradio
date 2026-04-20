import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { ArticleBlocks } from "@/components/feed/ArticleBlocks";
import { getArtistSpotlightArticleBlocks } from "@/lib/feed/get-article-blocks";
import { getArchivedArtistSpotlightBySlug, getArtistSpotlightBySlug } from "@/lib/feed/get-feed-data";
import styles from "./page.module.css";

type SpotlightPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function SpotlightPage({ params }: SpotlightPageProps) {
  const { slug } = await params;
  const liveSpotlight = await getArtistSpotlightBySlug(slug);
  const spotlight = liveSpotlight ?? (await getArchivedArtistSpotlightBySlug(slug));
  const blocks = await getArtistSpotlightArticleBlocks(slug);
  const spotlightImageStyle = {
    "--spotlight-article-shape-url": `url("${spotlight?.headshotUrl ?? ""}")`,
  } as CSSProperties;

  if (spotlight === null || blocks === null) {
    notFound();
  }

  const artistMeta = [spotlight.artistLocation, spotlight.artistGenre].filter(Boolean).join(" | ");
  const publishedDate = new Date(spotlight.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className={styles.page}>
      <div className={styles.inner} data-style-target="article-content-frame">
        <article className={styles.articleStack}>
          <header className={styles.masthead}>
            <div className={styles.mastheadPrimary}>
              <h1 className={styles.mastheadTitle}>THE FEED</h1>
              <p className={styles.mastheadSubTitle}>ARTIST SPOTLIGHT</p>
            </div>
          </header>

          <section className={`${styles.module} ${styles.contentModule}`} data-style-target="article-hero">
            <div className={styles.titleMetaGroup}>
              <h1 className={styles.title} data-style-target="article-title">{spotlight.title}</h1>
              <div className={styles.metaRowGroup} data-style-target="article-meta">
                <p className={styles.metaItem} data-style-target="article-identity">{spotlight.artistName}</p>
                {spotlight.artistLocation ? <p className={styles.metaItem}>{spotlight.artistLocation}</p> : null}
                {spotlight.artistGenre ? <p className={styles.metaItem}>{spotlight.artistGenre}</p> : null}
                <p className={styles.metaItem} data-style-target="article-published">Published {publishedDate}</p>
              </div>
            </div>
          </section>

          <section className={`${styles.module} ${styles.bodyModule}`} data-style-target="article-body">
            <div className={styles.bodyGroup}>
              <img
                src={spotlight.headshotUrl}
                alt={spotlight.headshotAlt}
                className={styles.image}
                data-style-target="article-image"
                style={spotlightImageStyle}
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
