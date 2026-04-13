import type { ArchiveItem } from "@/types/feed";

import styles from "./feed.module.css";

type Props = {
  items: ArchiveItem[];
};

export default function ArchiveCard({ items }: Props) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className={`${styles.card} ${styles.archiveCard}`}>
      <h3 className={styles.archiveHeader} data-style-target="archive-title">Archive Highlights</h3>
      <p className={styles.archiveIntro}>
        Recent picks from YouTube sessions, artist spotlights, and archived blog features.
      </p>
      <ul className={styles.archiveList} data-style-target="archive-list">
        {items.map((item) => {
          const date = new Date(item.publishedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });

          const typeLabel =
            item.type === "youtube"
              ? "YouTube"
              : item.type === "spotlight"
                ? "Artist Spotlight"
                : "Blog";

          return (
            <li key={item.id} className={styles.archiveItem}>
              <a href={item.href} target="_blank" rel="noreferrer" data-style-target="archive-link">
                <strong>{item.title}</strong>
              </a>
              <small className={styles.archiveMeta}>{typeLabel} • {date}</small>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
