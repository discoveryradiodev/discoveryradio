import Link from "next/link";
import type { CSSProperties } from "react";
import { WILLARD_IMAGE_OVERRIDES } from "@/app/the-feed/willard.generated.images";
import type { ArtistSpotlight } from "@/types/feed";
import styles from "./feed.module.css";

type Props = {
  spotlight: ArtistSpotlight;
};

export default function ArtistSpotlightCard({ spotlight }: Props) {
  const imageOverride = WILLARD_IMAGE_OVERRIDES["spotlight-image"];
  const artistMeta = [spotlight.artistLocation, spotlight.artistGenre]
    .filter(Boolean)
    .join(" | ");

  const spotlightImageStyle = {
    "--spotlight-shape-url": `url("${imageOverride?.url ?? spotlight.headshotUrl}")`,
  } as CSSProperties;

  return (
    <article className={`${styles.card} ${styles.spotlightCard}`}>
      <div className={styles.spotlightHeader} data-style-target="spotlight-header">
        <p className={styles.eyebrow} data-style-target="spotlight-headline">{spotlight.title || "Artist Spotlight"}</p>
        <h3 className={styles.spotlightName} data-style-target="spotlight-title">{spotlight.artistName}</h3>
        {artistMeta ? <p className={styles.spotlightMeta} data-style-target="spotlight-meta">{artistMeta}</p> : null}
      </div>
      <div className={styles.spotlightBody}>
         <img
           src={imageOverride?.url ?? spotlight.headshotUrl}
           alt={imageOverride?.altText ?? spotlight.headshotAlt}
           className={styles.spotlightHeadshot}
           data-style-target="spotlight-image"
           style={spotlightImageStyle}
         />
         <p className={styles.spotlightExcerpt} data-style-target="spotlight-excerpt">{spotlight.excerpt}</p>
        <Link
          href={`/the-feed/spotlight/${spotlight.slug}`}
          className={styles.listenCta}
          data-style-target="spotlight-cta"
        >
          Listen + Feature
        </Link>
      </div>
    </article>
  );
}
