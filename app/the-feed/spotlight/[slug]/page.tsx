import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBlocks } from "@/components/feed/ArticleBlocks";
import { getArtistSpotlightArticleBlocks } from "@/lib/feed/get-article-blocks";
import { getArchivedArtistSpotlightBySlug, getArtistSpotlightBySlug } from "@/lib/feed/get-feed-data";
import styles from "./page.module.css";

type SpotlightPageProps = {
  params: {
    slug: string;
  };
};

export default async function SpotlightPage({ params }: SpotlightPageProps) {
  const liveSpotlight = await getArtistSpotlightBySlug(params.slug);
  const spotlight = liveSpotlight ?? (await getArchivedArtistSpotlightBySlug(params.slug));
  const blocks = await getArtistSpotlightArticleBlocks(params.slug);

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
      <div className={styles.inner}>
        <article>
          <header className={styles.header}>
            <p className={styles.eyebrow}>Artist Spotlight</p>
            <h1 className={styles.title}>{spotlight.title}</h1>
            <p className={styles.artistName}>{spotlight.artistName}</p>
            {artistMeta ? <p className={styles.artistMeta}>{artistMeta}</p> : null}
            <p className={styles.dateMeta}>Published {publishedDate}</p>
            <p className={styles.excerpt}>{spotlight.excerpt}</p>
          </header>

          <div className={styles.imageWrapper}>
            <img
              src={spotlight.headshotUrl}
              alt={spotlight.headshotAlt}
              className={styles.image}
            />
          </div>

          <section className={styles.body}>
            <ArticleBlocks blocks={blocks} />
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
