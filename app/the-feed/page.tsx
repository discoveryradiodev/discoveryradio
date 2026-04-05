import styles from "./page.module.css";

export default function FeedPage() {
  return (
    <main className={styles.page} data-feed-page="true">
      <div className={styles.inner}>
        <h1 className={styles.title}>The Feed</h1>

        <section className={styles.composition}>
          <div className={styles.topPair}>
            <article className={`${styles.block} ${styles.heroBlock}`}>
              <h2 className={styles.blockTitle}>The Artist</h2>
              <p className={styles.blockBody}>Content goes here.</p>
            </article>

            <article className={`${styles.block} ${styles.heroBlock}`}>
              <h2 className={styles.blockTitle}>The Music</h2>
              <p className={styles.blockBody}>Content goes here.</p>
            </article>
          </div>

          <article className={`${styles.block} ${styles.blogFeature}`}>
            <h2 className={styles.blockTitle}>Weekly Blog</h2>
            <p className={styles.blockBody}>Content goes here.</p>
          </article>

          <div className={styles.midPair}>
            <article className={styles.block}>
              <h2 className={styles.blockTitle}>This Month's Playlist</h2>
              <p className={styles.blockBody}>Content goes here.</p>
            </article>

            <article className={styles.block}>
              <h2 className={styles.blockTitle}>Archive</h2>
              <p className={styles.blockBody}>Content goes here.</p>
            </article>
          </div>

          <div className={styles.bottomPair}>
            <article className={styles.block}>
              <h2 className={styles.blockTitle}>Contact Us</h2>
              <p className={styles.blockBody}>Content goes here.</p>
            </article>

            <article className={styles.block}>
              <h2 className={styles.blockTitle}>Join the Discord</h2>
              <p className={styles.blockBody}>Content goes here.</p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
