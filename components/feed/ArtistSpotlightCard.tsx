import Link from "next/link";
import type { ArtistSpotlight } from "@/types/feed";
import styles from "./feed.module.css";

type Props = {
  spotlight: ArtistSpotlight;
};

export default function ArtistSpotlightCard({ spotlight }: Props) {
  const artistMeta = [spotlight.artistLocation, spotlight.artistGenre]
    .filter(Boolean)
    .join(" | ");

  return (
    <article>
      <h3>{spotlight.title}</h3>
      <p>
        <strong>{spotlight.artistName}</strong>
      </p>
      {artistMeta ? <p>{artistMeta}</p> : null}
      <div className={styles.spotlightBody}>
        <img
          src={spotlight.headshotUrl}
          alt={spotlight.headshotAlt}
          className={styles.spotlightHeadshot}
        />
        <p>{spotlight.excerpt}</p>
        <Link href={`/the-feed/spotlight/${spotlight.slug}`}>Read more →</Link>
      </div>
    </article>
  );
}
