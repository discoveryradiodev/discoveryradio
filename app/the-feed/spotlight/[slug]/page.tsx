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
        <article>
          <header className={styles.header} data-style-target="article-hero">
            <p className={styles.eyebrow}>Artist Spotlight</p>
             <h1 className={styles.title} data-style-target="article-title">{spotlight.title}</h1>
            <p className={styles.artistName} data-style-target="article-identity">{spotlight.artistName}</p>
             {artistMeta ? <p className={styles.artistMeta} data-style-target="article-meta">{artistMeta}</p> : null}
            <p className={styles.dateMeta} data-style-target="article-published">Published {publishedDate}</p>
          </header>

          <section className={styles.body}>
             <div className={styles.imageWrap} data-style-target="article-image-wrap">
               <img
                 src={spotlight.headshotUrl}
                 alt={spotlight.headshotAlt}
                 className={styles.image}
                 data-style-target="article-image"
                 style={spotlightImageStyle}
               />
             </div>
             <div data-style-target="article-body">
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
